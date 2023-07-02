import { deserialize, serialize } from '@dao-xyz/borsh';
import {
    Cluster, PartiallyDecodedInstruction, PublicKey, TransactionInstruction,
} from '@solana/web3.js';
import { ReprScalar } from '@elusiv/cryptojs';
import { deserializeUint256LE, serializeUint256LE } from '@elusiv/serialization';
import { AccountReader } from '../../accountReaders/AccountReader.js';
import { BASE_COMMITMENT_HASH_ACC_SEED, STORE_BASE_COMM_IX_CODE } from '../../../constants.js';
import { getNumberFromTokenType } from '../../../public/tokenTypes/TokenTypeFuncs.js';
import { getElusivProgramId } from '../../../public/WardenInfo.js';
import { BaseCommitmentHashRequestBorsh } from '../txBuilding/serializedTypes/borshTypes/legacy/BaseCommitmentHashRequestBorsh.js';
import { RVKWrapper } from '../../clientCrypto/RVKWrapper.js';
import { StoreInstructionBase } from './StoreInstructionBase.js';
import { CommitmentMetadata } from '../../clientCrypto/CommitmentMetadata.js';
import { StoreBaseCommitmentBorsh } from '../txBuilding/serializedTypes/borshTypes/StoreBaseCommitmentBorsh.js';
import { bs58ToBytes } from '../../utils/base58Utils.js';
import { TokenType } from '../../../public/tokenTypes/TokenType.js';

export class StoreInstruction extends StoreInstructionBase {
    public readonly metadata: CommitmentMetadata;

    public readonly serializedMetadata: Uint8Array;

    // Mandatory params for getting keys, rest for generating ix
    constructor(
        hashAccIndex: number,
        coreCommitmentHash: ReprScalar,
        commitmentHash: ReprScalar,
        feeVersion: number,
        minBatchingRate: number,
        metadata: CommitmentMetadata,
        serializedMetadata: Uint8Array,
    ) {
        super(
            hashAccIndex,
            coreCommitmentHash,
            commitmentHash,
            feeVersion,
            minBatchingRate,
        );
        this.metadata = metadata;
        this.serializedMetadata = serializedMetadata;
    }

    public static async parseInstruction(rvk: RVKWrapper, ix: PartiallyDecodedInstruction): Promise<StoreInstruction | null> {
        let parsed: StoreBaseCommitmentBorsh;
        try {
            parsed = deserialize(bs58ToBytes(ix.data), StoreBaseCommitmentBorsh);
        }
        catch (e) {
            return null;
        }

        const metadata = await CommitmentMetadata.deserializeAndDecrypt(parsed.metadata, rvk, serializeUint256LE(parsed.request.commitment));

        return new StoreInstruction(
            parsed.hash_account_index,
            serializeUint256LE(parsed.request.base_commitment) as ReprScalar,
            serializeUint256LE(parsed.request.commitment) as ReprScalar,
            parsed.request.fee_version,
            parsed.request.min_batching_rate,
            metadata,
            parsed.metadata,
        );
    }

    public compileInstruction(
        rvk: RVKWrapper,
        cluster: Cluster,
        nonce: number,
        sender: PublicKey,
        warden: PublicKey,
    ): TransactionInstruction {
        const request = new BaseCommitmentHashRequestBorsh(
            deserializeUint256LE(this.coreCommitmentHash),
            this.metadata.assocCommIndex,
            this.metadata.balance,
            getNumberFromTokenType(this.metadata.tokenType),
            deserializeUint256LE(this.commitmentHash),
            this.feeVersion,
            this.minBatchingRate,
        );

        const hashingPDA = AccountReader.generateElusivPDAFrom([BASE_COMMITMENT_HASH_ACC_SEED], getElusivProgramId(cluster), this.hashAccIndex);

        const payload = new StoreBaseCommitmentBorsh(
            STORE_BASE_COMM_IX_CODE,
            this.hashAccIndex,
            hashingPDA[1],
            request,
            this.serializedMetadata,
        );

        const keys = this.getAccounts(rvk, nonce, hashingPDA[0], cluster, sender, warden);

        return new TransactionInstruction({
            keys,
            programId: getElusivProgramId(cluster),
            data: Buffer.from(serialize(payload)),
        });
    }

    public getTokenType(): TokenType {
        return this.metadata.tokenType;
    }

    public getAmount(): bigint {
        return this.metadata.balance;
    }

    public getAssocCommIndex(): number {
        return this.metadata.assocCommIndex;
    }
}
