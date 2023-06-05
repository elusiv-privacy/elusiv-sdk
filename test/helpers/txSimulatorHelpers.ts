import {
    ConfirmedSignatureInfo, LAMPORTS_PER_SOL, ParsedInnerInstruction, ParsedInstruction, PublicKey, SystemProgram,
    Transaction, TransactionBlockhashCtor, TransactionInstruction,
} from '@solana/web3.js';
import { ReprScalar, seededRandomUNSAFE } from 'elusiv-cryptojs';
import { EncryptedValue } from '../../src/sdk/clientCrypto/encryption.js';
import { SeedWrapper } from '../../src/sdk/clientCrypto/SeedWrapper.js';
import { MAX_MT_COUNT } from '../../src/constants.js';
import { getTokenInfo } from '../../src/public/tokenTypes/TokenTypeFuncs.js';
import { TxTypes } from '../../src/public/TxTypes.js';
import { FeeCalculator } from '../../src/sdk/paramManagers/fee/FeeCalculator.js';
import { FeeVersionData } from '../../src/sdk/paramManagers/fee/FeeManager.js';
import { ElusivTransaction } from '../../src/sdk/transactions/ElusivTransaction.js';
import { FinalizeVerificationInstruction } from '../../src/sdk/transactions/instructions/FinalizeVerificationInstruction.js';
import { InitVerificationInstruction } from '../../src/sdk/transactions/instructions/InitVerificationInstruction.js';
import { PartialSendTx } from '../../src/sdk/transactions/SendTx.js';
import { StoreTx } from '../../src/sdk/transactions/StoreTx.js';
import { TransactionBuilding } from '../../src/sdk/transactions/txBuilding/TransactionBuilding.js';
import { Pair } from '../../src/sdk/utils/Pair.js';
import { FeeCalculatorDriver } from './drivers/FeeCalculatorDriver.js';
import { getElusivProgramId } from '../../src/public/WardenInfo.js';
import { Fee, OptionalFee } from '../../src/public/Fee.js';
import { CommitmentMetadata } from '../../src/sdk/clientCrypto/CommitmentMetadata.js';
import { TokenType } from '../../src/public/tokenTypes/TokenType.js';

// These are all irrelevant for the client, so no need to test diff vals
const DEFAULT_FEE_PAYER: PublicKey = new PublicKey('2ZtaNYfxgMsLdDpDqnmwXsG8VyUgvxueXkZzABYWmowk');
const DEFAULT_RECENT_BH = '8XmTCMRTU7PeUGQrMr9EsUkLYfNSwrcs5VcQnKM2BvYN';
const DEFAULT_BLOCKHEIGHT = 164212646;
const DEFAULT_HASH_ACC_INDEX = 123;
const RANDOM_UNSAFE = seededRandomUNSAFE(42);
const elusivAcc = getElusivProgramId('devnet');

export async function generateTxHistory(
    count: number,
    sendingAccount: PublicKey,
    warden: PublicKey,
    // Tokentype and solpertoken
    tokenTypes: Pair<TokenType, number>[],
    seedWrapper: SeedWrapper,
    txTypes: TxTypes[] = ['TOPUP'],
    startNonce = 0,
    startingPrivateBalance = BigInt(0),
    merkleStartIndex = 0,
    storeFee: Fee = {
        tokenType: 'LAMPORTS', txFee: 500000, privacyFee: 100000, tokenAccRent: 0, lamportsPerToken: 1, extraFee: 0,
    },
    sendFee = BigInt(500000),
    feeVersion = 0,
    minBatchingRate = 0,
): Promise<
    { serialized: Pair<{ tx: Transaction, cpi?: ParsedInnerInstruction[] }, ConfirmedSignatureInfo>[], unserialized: ElusivTransaction }[]
    > {
    // The transactions and its signature
    const history: {
        serialized: Pair<{ tx: Transaction, cpi?: ParsedInnerInstruction[] }, ConfirmedSignatureInfo>[],
        unserialized: ElusivTransaction
    }[] = [];
    // Keep track of private balances and indices of txs as we add txs. Map from tokentype to its private balance and the indices
    // of transactions of that tokentype
    const privBalances = new Map<TokenType, bigint>();
    for (const tokentype of tokenTypes) {
        privBalances.set(tokentype.fst, BigInt(Math.min(Number(startingPrivateBalance), getTokenInfo(tokentype.fst).max - 1)));
    }
    const feeCalculator = new FeeCalculatorDriver(storeFee) as unknown as FeeCalculator;
    let currentSlot = 0;

    for (let i = 0; i < tokenTypes.length && i < count; i++) {
        const sig = getRandomSig(currentSlot);
        const feeVersionData: FeeVersionData = {
            feeVersion,
            minBatchingRate,
        };

        const currNonce = startNonce + i;
        const previousNonce = currNonce - 1;
        const amount = Math.min(Number(startingPrivateBalance), getTokenInfo(tokenTypes[i].fst).max - 1);

        // eslint-disable-next-line no-await-in-loop
        const store = await generateTopupTx(
            BigInt(amount),
            previousNonce,
            feeCalculator,
            tokenTypes[i].snd,
            tokenTypes[i].fst,
            sendingAccount,
            BigInt(amount),
            merkleStartIndex,
            false,
            DEFAULT_HASH_ACC_INDEX,
            feeVersionData,
            warden,
            seedWrapper,
        );

        history.unshift({ serialized: [{ fst: { tx: store.serialized, cpi: store.cpi }, snd: sig }], unserialized: store.nonSerialized });
        currentSlot += 1;
    }

    for (let i = count - 1 - tokenTypes.length; i >= 0; i--) {
        const txType: TxTypes = i === count - 1 ? 'TOPUP' : getRandomFromArray(txTypes);
        const tokenType = getRandomFromArray(tokenTypes);
        const amount = txType === 'TOPUP' ? getRandomAmount() : getRandomAmount() / BigInt(10);
        const oldPrivateBalance = privBalances.get(tokenType.fst) === undefined ? BigInt(Math.min(Number(startingPrivateBalance), getTokenInfo(tokenTypes[i].fst).max - 1)) : privBalances.get(tokenType.fst);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const currentPrivateBalance = oldPrivateBalance! + (txType === 'TOPUP' ? amount : (-amount - sendFee));
        privBalances.set(tokenType.fst, currentPrivateBalance);
        const currNonce = startNonce + (count - 1 - i);

        // First tx is always a topup
        if (i === count - 1 || txType === 'TOPUP') {
            const sig = getRandomSig(currentSlot);
            const feeVersionData: FeeVersionData = {
                feeVersion,
                minBatchingRate,
            };

            const previousNonce = currNonce - 1;

            // eslint-disable-next-line no-await-in-loop
            const store = await generateTopupTx(
                amount,
                previousNonce,
                feeCalculator,
                tokenType.snd,
                tokenType.fst,
                sendingAccount,
                currentPrivateBalance,
                merkleStartIndex,
                false,
                DEFAULT_HASH_ACC_INDEX,
                feeVersionData,
                warden,
                seedWrapper,
            );

            history.unshift({ serialized: [{ fst: { tx: store.serialized, cpi: store.cpi }, snd: sig }], unserialized: store.nonSerialized });
            currentSlot += 1;
        }

        else if (txType === 'SEND') {
            // eslint-disable-next-line no-await-in-loop
            const encryptedOwner = await seedWrapper.getRootViewingKeyWrapper().encryptSeededSaltedAES256(sendingAccount.toBytes(), currNonce);

            // eslint-disable-next-line no-await-in-loop
            const send = await generateSendTransaction(
                currNonce,
                1,
                [new Uint8Array(32).fill(1) as ReprScalar],
                [new Uint8Array(32).fill(2) as ReprScalar],
                new Uint8Array(32).fill(3) as ReprScalar,
                feeVersion,
                amount,
                currentPrivateBalance,
                sendFee,
                tokenType.fst,
                merkleStartIndex,
                1,
                encryptedOwner,
                sendingAccount,
                new PublicKey(new Uint8Array(32).fill(4)),
                warden,
                seedWrapper,
            );

            const serialized: Pair<{ tx: Transaction, cpi?: ParsedInnerInstruction[] }, ConfirmedSignatureInfo>[] = [
                { fst: { tx: send.serializedFinalize }, snd: getRandomSig(currentSlot + 1) },
                { fst: { tx: send.serializedInit }, snd: getRandomSig(currentSlot) },
            ];

            history.unshift({ serialized, unserialized: send.nonSerialized });

            currentSlot += 2;
        }
    }

    return history;
}

async function generateTopupTx(
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
    feeVersionData: FeeVersionData,
    warden: PublicKey,
    seedWrapper: SeedWrapper,
    recentBH = DEFAULT_RECENT_BH,
    blockHeight = DEFAULT_BLOCKHEIGHT,
): Promise<{ serialized: Transaction; nonSerialized: StoreTx; cpi: ParsedInnerInstruction[] }> {
    const nonSerialized = TransactionBuilding['buildStoreTx'](
        amount,
        lastNonce,
        feeCalculator,
        lamportsPerToken,
        tokenType,
        sender,
        privateBalance,
        merkleStartIndex + 1,
        isRecipient,
        hashAccIndex,
        0,
        warden,
        seedWrapper,
    );

    const serialized = await TransactionBuilding['buildRawTopupTransaction'](
        nonSerialized.fst,
        seedWrapper.getRootViewingKeyWrapper(),
        'devnet',
        feeVersionData,
        { blockhash: recentBH, lastValidBlockHeight: blockHeight },
    );

    const cpi = generateCPIsStore(BigInt(10_000), tokenType);

    return { serialized, nonSerialized: nonSerialized.fst, cpi };
}

export function generateCPIsStore(fee: bigint, tokenType: TokenType): ParsedInnerInstruction[] {
    const DUMMY_CPI: ParsedInstruction = {
        program: 'DUMMY_PROG',
        programId: SystemProgram.programId,
        parsed: '',
    };

    if (tokenType === 'LAMPORTS') {
        return [{
            index: 2,
            instructions: [
                {
                    program: SystemProgram.name,
                    programId: SystemProgram.programId,
                    parsed: {
                        info: {
                            destination: new PublicKey(new Uint8Array(32).fill(4)).toBase58(),
                            source: new PublicKey(new Uint8Array(32).fill(3)).toBase58(),
                            lamports: Number(fee),
                        },
                        type: 'transfer',
                    },
                },
                DUMMY_CPI,
                DUMMY_CPI,
                DUMMY_CPI,
                DUMMY_CPI,
            ],
        }];
    }

    return [{
        index: 2,
        instructions: [
            {
                program: SystemProgram.name,
                programId: SystemProgram.programId,
                parsed: {
                    info: {
                        amount: fee.toString(10),
                        destination: new PublicKey(new Uint8Array(32).fill(4)).toBase58(),
                        multisigAuthority: new PublicKey(new Uint8Array(32).fill(5)).toBase58(),
                        signers: [],
                        source: new PublicKey(new Uint8Array(32).fill(3)).toBase58(),
                    },
                    type: 'transfer',
                },
            },
            DUMMY_CPI,
            DUMMY_CPI,
            DUMMY_CPI,
            DUMMY_CPI,
            DUMMY_CPI,
        ],
    }];
}

export async function generateSendTransaction(
    nonce: number,
    commitmentCount: number,
    roots: ReprScalar[],
    nullifierHashes: ReprScalar[],
    commitment: ReprScalar,
    feeVersion: number,
    amount: bigint,
    remainingBalance: bigint,
    fee: bigint,
    tokenType: TokenType,
    mtIndex: number,
    commIndex: number,
    encryptedOwner: EncryptedValue,
    owner: PublicKey,
    recipient: PublicKey,
    warden: PublicKey,
    seedWrapper: SeedWrapper,
    optionalFee: OptionalFee = { amount: BigInt(0), collector: SystemProgram.programId },
): Promise<{ serializedInit: Transaction; serializedFinalize: Transaction; nonSerialized: ElusivTransaction; }> {
    const verAccIndex = 0;
    const vkeyIndex = 1;
    const treeIndices = new Array(MAX_MT_COUNT).fill(2);

    const metadata = new CommitmentMetadata(nonce, tokenType, commIndex, remainingBalance);
    const serializedMeta = (await metadata.serializeAndEncrypt(seedWrapper.getRootViewingKeyWrapper(), commitment)).cipherText;

    const initVerificationIx = new InitVerificationInstruction(
        verAccIndex,
        vkeyIndex,
        treeIndices,
        commitmentCount,
        roots.slice(0, commitmentCount),
        nullifierHashes.slice(0, commitmentCount),
        commitment,
        metadata,
        serializedMeta,
        feeVersion,
        amount,
        fee,
        optionalFee,
        false,
        new Uint8Array(32).fill(12) as ReprScalar,
        true,
        false,
    );

    const finalizeVerificationInstruction = new FinalizeVerificationInstruction(
        amount,
        tokenType,
        mtIndex,
        encryptedOwner,
        vkeyIndex,
        owner,
    );

    const identifier = seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce);
    const programId = elusivAcc;

    // recipient index is 0, id index is 1, verification acc index is 5
    const finalizeKeys = [
        recipient,
        identifier,
        new PublicKey(new Uint8Array(32).fill(27)),
        new PublicKey(new Uint8Array(32).fill(28)),
        new PublicKey(new Uint8Array(32).fill(2)),
        new PublicKey(new Uint8Array(32).fill(5)),
    ];

    // id index is 5, verification acc index is 1
    const initKeys = [
        new PublicKey(new Uint8Array(32).fill(30)),
        new PublicKey(new Uint8Array(32).fill(5)),
        new PublicKey(new Uint8Array(32).fill(32)),
        new PublicKey(new Uint8Array(32).fill(33)),
        new PublicKey(new Uint8Array(32).fill(34)),
        identifier,
    ];

    const serializedInitIx: TransactionInstruction = generateIxFromBytes(
        initVerificationIx.compile(),
        programId,
        initKeys,
    );

    const serializedFinalizeIx: TransactionInstruction = generateIxFromBytes(
        finalizeVerificationInstruction.compile(false, Math.ceil(commIndex / 2)),
        programId,
        finalizeKeys,
    );

    const serializedInitTx = generateTxFromIxs([serializedInitIx]);
    const serializedFinalizeTx = generateTxFromIxs([serializedFinalizeIx]);

    const nonSerialized: PartialSendTx = {
        nonce,
        txType: 'SEND',
        tokenType,
        identifier,
        encryptedOwner,
        amount,
        fee,
        merkleStartIndex: mtIndex,
        recipient,
        warden,
        isAssociatedTokenAcc: false,
        isSolanaPayTransfer: false,
        commitmentHash: initVerificationIx.commitmentHash,
        extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
    };

    return { serializedInit: serializedInitTx, serializedFinalize: serializedFinalizeTx, nonSerialized };
}

function generateTxFromIxs(
    ixs: TransactionInstruction[],
): Transaction {
    const params: TransactionBlockhashCtor = {
        feePayer: DEFAULT_FEE_PAYER,
        blockhash: DEFAULT_RECENT_BH,
        lastValidBlockHeight: DEFAULT_BLOCKHEIGHT,
    };
    const res = new Transaction(params);
    ixs.forEach((ix) => {
        res.add(ix);
    });

    return res;
}

function generateIxFromBytes(data: Uint8Array, programId: PublicKey, keys: PublicKey[]): TransactionInstruction {
    return new TransactionInstruction({
        keys: keys.map((k) => ({ pubkey: k, isSigner: false, isWritable: false })),
        programId,
        data: Buffer.from(data),
    });
}

function getRandomAmount(): bigint {
    return BigInt(Math.floor(RANDOM_UNSAFE() * LAMPORTS_PER_SOL));
}

function getRandomSig(slot: number): ConfirmedSignatureInfo {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 64; i++) {
        result += characters.charAt(Math.floor(RANDOM_UNSAFE()
            * characters.length));
    }
    return {
        signature: result,
        slot,
        err: null,
        memo: null,
    };
}

function getRandomFromArray<T>(arr: T[]): T {
    const index = Math.floor(RANDOM_UNSAFE() * arr.length);
    return arr[index];
}
