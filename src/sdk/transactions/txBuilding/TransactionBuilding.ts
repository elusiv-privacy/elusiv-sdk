import {
    Cluster, PublicKey, SystemProgram, Transaction,
} from '@solana/web3.js';
import {
    Commitment, IncompleteCommitment, Poseidon, ReprScalar,
} from 'elusiv-cryptojs';
import { bigIntToNumber, bytesToBigIntLE } from 'elusiv-serialization';
import {
    generateMergeProof, generateMergeProofInputsNoAmountNoNextCommitment, generateSendQuadraProof, generateSendQuadraProofInputsNoAmountNoNextCommitment, IncompleteSendQuadraProofInputs, ProofParams,
} from 'elusiv-circuits';
import { ChainStateInfo, SendRemoteParams, TopupRemoteParams } from './RemoteParamFetching.js';
import { InstructionBuilding } from './InstructionBuilding.js';
import { getNumberFromTokenType, getTokenInfo, TokenType } from '../../../public/tokenTypes/TokenType.js';
import { WardenInfo } from '../../../public/WardenInfo.js';
import { TopupTxData } from '../../../public/txData/TopupTxData.js';
import { Pair } from '../../utils/Pair.js';
import {
    Fee, getComputationFeeTotal, getTotalFeeAmount, OptionalFee,
} from '../../../public/Fee.js';
import {
    INVALID_TX_DATA, MERGE_NEEDED, SEND_ARITY, TOO_LARGE_SIZE, TOO_SMALL_SIZE,
} from '../../../constants.js';
import { sumBigInt } from '../../utils/bigIntUtils.js';
import { SendTxData } from '../../../public/txData/SendTxData.js';
import { FeeCalculator } from '../../paramManagers/fee/FeeCalculator.js';
import { randomUint32 } from '../../utils/utils.js';
import { pubKeyToBigInt } from '../../utils/pubKeyUtils.js';
import { SendTx } from '../SendTx.js';
import { commitmentArrToSet, GeneralSet } from '../../utils/GeneralSet.js';
import { StoreTx } from '../StoreTx.js';
import { FeeUtils } from '../../paramManagers/fee/FeeUtils.js';
import { SeedWrapper } from '../../clientCrypto/SeedWrapper.js';
import { stringToUtf8ByteCodes } from '../../utils/stringUtils.js';
import { RVKWrapper } from '../../clientCrypto/RVKWrapper.js';
import { FeeVersionData } from '../../paramManagers/fee/FeeManager.js';
import { CommitmentMetadata } from '../../clientCrypto/CommitmentMetadata.js';
import { CommitmentManager } from '../../paramManagers/CommitmentManager.js';

export type TokenAcc = {
    owner: PublicKey,
    TA: PublicKey,
    exists: boolean,
}

export class TransactionBuilding {
    // Merge tx indicating an optional merge that just took place
    public static async buildTopUpTxData(
        amount: number,
        tokenType: TokenType,
        owner: PublicKey,
        isRecipient: boolean,
        remoteParams: TopupRemoteParams,
        wardenInfo: WardenInfo,
        seedWrapper: SeedWrapper,
        cluster: Cluster,
        mergeFee: number | undefined,
    ): Promise<TopupTxData> {
        // let mergeTx : Pair<SendTx, Fee> | undefined;
        const activeCommitmentsArr = remoteParams.activeCommitments.toArray();

        let prevNonce = remoteParams.lastNonce;

        // If we have SEND_ARITY active commitments, we need to merge and can only send a store after merging
        if (activeCommitmentsArr.length === SEND_ARITY && mergeFee === undefined) {
            throw new Error(MERGE_NEEDED);
        }

        // If we just merged, the previous nonce is that of the merge that just occured
        if (mergeFee !== undefined) {
            prevNonce += 1;
        }

        // Sum up the input commitments, add the topup amount and potentially subtract the merge fee if needed
        // Note: No need to subtract topup fee, as this is done seperately by the program.
        // If we deposit 1 Sol, our balance is exactly 1 Sol higher after the topup.
        const privateBalance = sumBigInt(activeCommitmentsArr.map((c) => c.getBalance())) + BigInt(amount)
            - (mergeFee ? BigInt(mergeFee) : BigInt(0));
        const hashAccIndex = this.generateHashAccIndex();

        const store = this.buildStoreTx(
            BigInt(amount),
            prevNonce,
            remoteParams.feeCalculator,
            remoteParams.lamportsPerToken,
            tokenType,
            owner,
            privateBalance,
            remoteParams.merkleStartIndex,
            isRecipient,
            hashAccIndex,
            Number(remoteParams.tokenAccRent),
            wardenInfo.pubKey,
            seedWrapper,
        );

        const rawTx = await this.buildRawTopupTransaction(
            store.fst,
            seedWrapper.getRootViewingKeyWrapper(),
            cluster,
            remoteParams.feeVersionData,
            remoteParams.chainState,
        );

        return new TopupTxData(
            store.snd,
            tokenType,
            remoteParams.lastNonce,
            store.fst.commitment.getCommitmentHash(),
            remoteParams.merkleStartIndex,
            wardenInfo,
            rawTx,
            hashAccIndex,
            mergeFee !== undefined,
        );
    }

    public static async buildSendTxData(
        amount: number,
        tokenType: TokenType,
        recipient: TokenAcc,
        owner: PublicKey,
        remoteParams: SendRemoteParams,
        wardenInfo: WardenInfo,
        seedWrapper: SeedWrapper,
        refKey?: PublicKey,
        memo?: string,
        extraFee: OptionalFee = { amount: BigInt(0), collector: SystemProgram.programId },
        isSolanaPayTransfer: boolean = refKey !== undefined,
        isMerge = false,
    ): Promise<SendTxData> {
        const send = await this.buildSendTx(
            BigInt(amount),
            remoteParams.feeVersion,
            remoteParams.feeCalculator,
            remoteParams.tokenAccRent,
            remoteParams.lamportsPerToken,
            tokenType,
            remoteParams.activeCommitments.toArray(),
            remoteParams.lastNonce,
            remoteParams.merkleStartIndex,
            owner,
            remoteParams.sendQuadraProofParams,
            recipient,
            wardenInfo.pubKey,
            seedWrapper,
            refKey,
            memo,
            extraFee,
            isSolanaPayTransfer,
            isMerge,
        );

        return this.sendTxToSendTxData(send.fst, send.snd, remoteParams.merkleStartIndex, wardenInfo);
    }

    public static async buildMergeTxData(
        tokenType: TokenType,
        owner: PublicKey,
        remoteParams: SendRemoteParams,
        wardenInfo: WardenInfo,
        seedWrapper: SeedWrapper,
        refKey?: PublicKey,
    ): Promise<SendTxData> {
        return this.buildSendTxData(
            // We're not sending any money when merging
            0,
            tokenType,
            // We are not sending anywhere, so we can put any address here. Put system program to make use of Address LUT
            { owner: SystemProgram.programId, TA: SystemProgram.programId, exists: true },
            owner,
            remoteParams,
            wardenInfo,
            seedWrapper,
            refKey,
            undefined,
            undefined,
            undefined,
            true,
        );
    }

    private static sendTxToSendTxData(tx: SendTx, fee: Fee, merkleStartIndex: number, wardenInfo: WardenInfo): SendTxData {
        if (tx.proof === undefined || tx.inputCommitments === undefined) throw new Error(INVALID_TX_DATA('SEND'));
        return new SendTxData(
            fee,
            tx.tokenType,
            tx.nonce - 1,
            tx.commitment.getCommitmentHash(),
            merkleStartIndex,
            wardenInfo,
            tx.proof,
            tx.isSolanaPayTransfer,
            tx.extraFee,
        );
    }

    private static async buildRawTopupTransaction(
        storeTx: StoreTx,
        rvk: RVKWrapper,
        cluster: Cluster,
        feeVersionData: FeeVersionData,
        chainState: ChainStateInfo,
    ): Promise<Transaction> {
        const instructions = await InstructionBuilding.buildTopupInstructions(rvk, storeTx, cluster, feeVersionData);

        const { blockhash, lastValidBlockHeight } = chainState;
        const tx = new Transaction({ feePayer: storeTx.warden, blockhash, lastValidBlockHeight });

        for (const ix of instructions) {
            tx.add(ix);
        }

        return tx;
    }

    private static generateTopupFee(feeCalculator: FeeCalculator, tokenType: TokenType, amount: bigint, lamportsPerToken: number): Fee {
        const lamportFee = feeCalculator.getStoreFee(amount);
        return FeeUtils.lamportFeeToTokenFee(lamportFee, tokenType, lamportsPerToken, 0);
    }

    private static generateHashAccIndex(): number {
        return randomUint32();
    }

    private static buildStoreTx(
        amount: bigint,
        lastNonce: number,
        feeCalculator: FeeCalculator,
        lamportsPerToken: number,
        tokenType: TokenType,
        sender: PublicKey,
        privateBalance: bigint,
        merkleStartIndex: number,
        isRecipient: boolean,
        hashAccIndex: number,
        tokenAccRentLamports: number,
        warden: PublicKey,
        seedWrapper: SeedWrapper,
    ): Pair<StoreTx, Fee> {
        const tokenAccRentTokenType = FeeUtils.lamportsToToken(Number(tokenAccRentLamports), lamportsPerToken);
        if (!this.isValidAmount(Number(amount), tokenType, tokenAccRentTokenType)) throw new Error(`Invalid token amount. Ensure you are sending at least the rent for a token account and less than the maximum amount. ${amount} ${tokenType}`);
        const nonce = lastNonce + 1;
        const identifier = seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce);
        const storeFee = this.generateTopupFee(feeCalculator, tokenType, amount, lamportsPerToken);
        const commitment = this.buildTopupCommitment(nonce, amount, tokenType, merkleStartIndex, seedWrapper);
        const tx: StoreTx = {
            txType: 'TOPUP',
            nonce,
            amount,
            commitment,
            sender,
            tokenType,
            parsedPrivateBalance: privateBalance,
            merkleStartIndex,
            commitmentHash: commitment.getCommitmentHash(),
            isRecipient,
            hashAccIndex,
            identifier,
            warden,
            fee: BigInt(getTotalFeeAmount(storeFee)),
        };

        return { fst: tx, snd: storeFee };
    }

    private static buildTopupCommitment(
        nonce: number,
        amount: bigint,
        tokenType: TokenType,
        recentCommIndex: number,
        seedWrapper: SeedWrapper,
    ): IncompleteCommitment {
        const nullifier = seedWrapper.generateNullifier(nonce);
        const nullifierBigInt = Poseidon.getPoseidon().hashBytesToBigIntLE(nullifier as ReprScalar);

        const commitment = new IncompleteCommitment(nullifierBigInt, amount, BigInt(getNumberFromTokenType(tokenType)), BigInt(recentCommIndex), Poseidon.getPoseidon());

        return commitment;
    }

    private static async buildSendTx(
        amount: bigint,
        feeVersion: number,
        feeCalculator: FeeCalculator,
        tokenAccRentLamports: bigint,
        lamportsPerToken: number,
        tokenType: TokenType,
        activeCommitments: Commitment[],
        lastUsedNonce: number,
        merkleStartIndex: number,
        owner: PublicKey,
        proofParams: ProofParams,
        recipient: TokenAcc,
        warden: PublicKey,
        seedWrapper: SeedWrapper,
        solPayRefKey: PublicKey | undefined = undefined,
        memo: string | undefined = undefined,
        extraFee: OptionalFee = { amount: BigInt(0), collector: SystemProgram.programId },
        isSolanaPayTransfer = solPayRefKey !== undefined,
        isMerge = false,
    ): Promise<Pair<SendTx, Fee>> {
        if (activeCommitments.length === 0) {
            throw new Error(TOO_SMALL_SIZE('active commitments', 0, 1));
        }
        const memoBytes = memo ? stringToUtf8ByteCodes(memo) : undefined;
        if (memoBytes && memoBytes.length > 128) {
            throw new Error(TOO_LARGE_SIZE('memo', memoBytes.length, 128));
        }
        const tokenAccRentTokenType = FeeUtils.lamportsToToken(Number(tokenAccRentLamports), lamportsPerToken);
        // Minimum amount is the rent for a token acc, except for merges
        if (!isMerge && !this.isGreaterThanMinAmount(Number(amount), tokenType, tokenAccRentTokenType)) throw new Error('Invalid token amount. Ensure you are sending at least the rent for a token account.');

        const nonce = lastUsedNonce + 1;
        // Pubkey is in BE, but we want LE for everything
        const encryptedOwner = await seedWrapper.getRootViewingKeyWrapper().encryptSeededSaltedAES256(owner.toBytes(), nonce);
        const identifier = seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce);
        const identifierBigInt = pubKeyToBigInt(identifier);
        const ivBigInt = bytesToBigIntLE(encryptedOwner.iv);
        const cipherTextBigInt = bytesToBigIntLE(encryptedOwner.cipherText);
        const solPayRefKeyBigInt = solPayRefKey === undefined ? BigInt(0) : pubKeyToBigInt(solPayRefKey);
        let proofInputs: IncompleteSendQuadraProofInputs;

        let realRecipient: PublicKey | undefined;
        let realAmount = BigInt(0);

        /**
             * The logic for associated token account and selecting if we send the token account is as follows:
             *
             * > Case is_associated_token_account: true + account:
             *   - Warden will derive ATA.
             *   - If ATA exists,  amount goes to said ATA in the tokentype specified.
             *   - If ATA does not exist, ATA gets rented (“rent gets sent in Lamports to the recipient”) and amount - rent gets sent  to ATA in the tokentype specified
             * > Case is_associated_token_account: false + (A)TA:
             *   - If the account exists, the whole amount gets sent to it.
             *   - If the account does not exist, 0 goes to the recipient and the whole amount is kept by Elusiv
             *
             * The reason the first case exists is obvious (sending to someone's ATA).
             * The reason the second case exists is for cases where want to send to someone's token account that is NOT their ATA.
             * This has the risk that the recipient closes their Tokenaccount before the transaction goes through, though. This risk is
             * offset to the sender hence the logic detailed above.
             *
             */
        const isAssociatedTokenAcc = !recipient.exists && tokenType !== 'LAMPORTS';

        if (recipient === undefined) {
            proofInputs = generateMergeProofInputsNoAmountNoNextCommitment(
                activeCommitments,
                identifierBigInt,
                ivBigInt,
                cipherTextBigInt,
                false,
                BigInt(feeVersion),
                BigInt(getNumberFromTokenType(tokenType)),
                Poseidon.getPoseidon(),
                solPayRefKeyBigInt,
                bytesToBigIntLE(extraFee.collector.toBytes()),
                extraFee.amount,
                memoBytes,
            );
        }
        else {
            realRecipient = isAssociatedTokenAcc ? recipient.owner : recipient.TA;
            // Add the potential rent for a token acc
            realAmount = recipient.exists || tokenType === 'LAMPORTS' ? amount : (amount + BigInt(Math.ceil(tokenAccRentTokenType)));
            // Add the potential extra fee
            realAmount += extraFee.amount;
            const recipientBigInt = pubKeyToBigInt(realRecipient);
            proofInputs = generateSendQuadraProofInputsNoAmountNoNextCommitment(
                activeCommitments,
                recipientBigInt,
                identifierBigInt,
                ivBigInt,
                cipherTextBigInt,
                isAssociatedTokenAcc,
                BigInt(feeVersion),
                BigInt(getNumberFromTokenType(tokenType)),
                Poseidon.getPoseidon(),
                solPayRefKeyBigInt,
                bytesToBigIntLE(extraFee.collector.toBytes()),
                extraFee.amount,
                memoBytes,
            );
        }

        const fee = this.generateSendFee(proofInputs, tokenType, realAmount, merkleStartIndex, feeCalculator, tokenAccRentLamports, lamportsPerToken, !isAssociatedTokenAcc);
        // Does not include:
        // - the potential rent for a token acc, this is added to amount bc a token acc can be closed during proof verification
        // - the potential extra fee, this is also added to amount
        const totalFee = BigInt(getComputationFeeTotal(fee));

        // TODO: Round number when converting to BigInt
        const nextCommitment = this.generateNextSendCommitment(activeCommitments, nonce, totalFee, realAmount, tokenType, merkleStartIndex, seedWrapper);
        const metadata = CommitmentMetadata.fromCommitment(nonce, nextCommitment);
        const encMetadata = await metadata.serializeAndEncrypt(seedWrapper.getRootViewingKeyWrapper(), nextCommitment.getCommitmentHash());
        const metadataBigInt = bytesToBigIntLE(encMetadata.cipherText);
        const proof = recipient === undefined
            ? await generateMergeProof(proofInputs, nextCommitment, metadataBigInt, proofParams)
            : await generateSendQuadraProof(proofInputs, nextCommitment, metadataBigInt, proofParams);

        const tx: SendTx = {
            nonce,
            txType: 'SEND',
            tokenType,
            commitment: nextCommitment,
            fee: BigInt(getTotalFeeAmount(fee)),
            encryptedOwner,
            amount: realAmount,
            merkleStartIndex,
            commitmentHash: nextCommitment.getCommitmentHash(),
            recipient: realRecipient,
            isAssociatedTokenAcc,
            refKey: solPayRefKey,
            memo,
            inputCommitments: commitmentArrToSet(activeCommitments) as GeneralSet<Commitment>,
            proof,
            identifier,
            isSolanaPayTransfer,
            warden,
            extraFee,
        };
        return { fst: tx, snd: fee };
    }

    public static generateNextSendCommitment(
        commitments: Commitment[],
        nonce: number,
        totalFee: bigint,
        amountSent: bigint,
        tokenType: TokenType,
        recentCommIndex: number,
        seedWrapper: SeedWrapper,
    ): IncompleteCommitment {
        const nullifier = seedWrapper.generateNullifier(nonce);
        const privateBalance = sumBigInt(commitments.map((comm) => comm.getBalance()));
        return CommitmentManager.buildCommitmentForSend(nullifier, tokenType, privateBalance, amountSent, totalFee, recentCommIndex);
    }

    private static generateSendFee(
        publicInputs: IncompleteSendQuadraProofInputs,
        tokenType: TokenType,
        amount: bigint,
        recentCommIndex: number,
        feeCalculator: FeeCalculator,
        tokenAccRentLamports: bigint,
        lamportsPerToken: number,
        recipientExists: boolean,
    ): Fee {
        const lamportFee = feeCalculator.getSendFee(publicInputs, amount, recentCommIndex, Number(tokenAccRentLamports), recipientExists);
        return FeeUtils.lamportFeeToTokenFee(lamportFee, tokenType, lamportsPerToken, bigIntToNumber(publicInputs.hashedData.optionalFeeAmount));
    }

    private static isValidAmount(amount: number, tokenType: TokenType, accountRentFee: number): boolean {
        const tokenInfo = getTokenInfo(tokenType);
        return amount > accountRentFee && amount > tokenInfo.min && amount < tokenInfo.max;
    }

    private static isGreaterThanMinAmount(amount: number, tokenType: TokenType, accountRentFee: number): boolean {
        const tokenInfo = getTokenInfo(tokenType);
        return amount > accountRentFee && amount > tokenInfo.min;
    }

    private static isLessThanMaxAmount(amount: number, tokenType: TokenType): boolean {
        return amount < getTokenInfo(tokenType).max;
    }
}
