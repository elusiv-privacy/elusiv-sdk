import {
    Cluster, ComputeBudgetProgram, PublicKey, TransactionInstruction,
} from '@solana/web3.js';
import { IncompleteCommitment, Poseidon, ReprScalar } from 'elusiv-cryptojs';
import { SeedWrapper } from '../../clientCrypto/SeedWrapper.js';
import { getNumberFromTokenType } from '../../../public/tokenTypes/TokenTypeFuncs.js';
import { ComputeHashInstruction } from '../instructions/ComputeHashInstruction.js';
import { StoreInstruction } from '../instructions/StoreInstruction.js';
import { StoreTx } from '../StoreTx.js';
import { RVKWrapper } from '../../clientCrypto/RVKWrapper.js';
import { FeeVersionData } from '../../paramManagers/fee/FeeManager.js';
import { CommitmentMetadata } from '../../clientCrypto/CommitmentMetadata.js';
import { TokenType } from '../../../public/tokenTypes/TokenType.js';

export const COMPUTE_UNIT_LIMIT = 1400000;
export const COMPUTE_UNIT_PRICE = 0;

export class InstructionBuilding {
    // Instructions that vary depending on the topup txs content
    public static async buildVariableTopupIxs(
        rvk: RVKWrapper,
        storeTx: StoreTx,
        cluster: Cluster,
        sender: PublicKey,
        warden: PublicKey,
        feeVersionData: FeeVersionData,
    ): Promise<TransactionInstruction[]> {
        const metadata = CommitmentMetadata.fromCommitment(storeTx.nonce, storeTx.commitment);
        const commHash = storeTx.commitment.getCommitmentHash();
        const storeInstruction = new StoreInstruction(
            storeTx.hashAccIndex,
            storeTx.commitment.getCommitmentHashCore(),
            commHash,
            feeVersionData.feeVersion,
            feeVersionData.minBatchingRate,
            metadata,
            (await metadata.serializeAndEncrypt(rvk, commHash)).cipherText,
        );

        const computeInstruction = new ComputeHashInstruction(
            storeTx.nonce,
            storeTx.hashAccIndex,
            storeTx.parsedPrivateBalance,
            storeTx.isRecipient,
        );

        return [
            storeInstruction.compileInstruction(
                rvk,
                cluster,
                storeTx.nonce,
                sender,
                warden,
            ),
            await computeInstruction.compileInstruction(rvk, cluster)];
    }

    public static buildTopupCommitment(
        nonce: number,
        amount: bigint,
        tokenType: TokenType,
        merkleStartIndex: number,
        seedWrapper: SeedWrapper,
    ): IncompleteCommitment {
        const nullifier = seedWrapper.generateNullifier(nonce);
        const nullifierBigInt = Poseidon.getPoseidon().hashBytesToBigIntLE(nullifier as ReprScalar);

        const commitment = new IncompleteCommitment(nullifierBigInt, amount, BigInt(getNumberFromTokenType(tokenType)), BigInt(merkleStartIndex), Poseidon.getPoseidon());

        return commitment;
    }

    // Instructions that are the same no matter the topup txs content
    public static buildConstantTopupIxs(): TransactionInstruction[] {
        // Modify budget transaction
        const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
            units: COMPUTE_UNIT_LIMIT,
        });

        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: COMPUTE_UNIT_PRICE,
        });

        return [modifyComputeUnits, addPriorityFee];
    }

    public static async buildTopupInstructions(
        rvk: RVKWrapper,
        storeTx: StoreTx,
        cluster: Cluster,
        feeVersionData: FeeVersionData,
    ): Promise<TransactionInstruction[]> {
        const constantIxs = this.buildConstantTopupIxs();

        const variableIxs = await this.buildVariableTopupIxs(
            rvk,
            storeTx,
            cluster,
            storeTx.sender,
            storeTx.warden,
            feeVersionData,
        );

        return [...constantIxs, ...variableIxs];
    }
}
