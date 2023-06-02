import { deserialize, serialize } from '@dao-xyz/borsh';
import {
    Cluster, PartiallyDecodedInstruction, PublicKey, TransactionInstruction,
} from '@solana/web3.js';
import { ReprScalar } from 'elusiv-cryptojs';
import { deserializeUint256LE, serializeUint256LE } from 'elusiv-serialization';
import { AccountReader } from '../../accountReaders/AccountReader.js';
import { BASE_COMMITMENT_HASH_ACC_SEED, STORE_BASE_COMM_IX_CODE } from '../../../constants.js';
import { getNumberFromTokenType, getTokenType, TokenType } from '../../../public/tokenTypes/TokenType.js';
import { getElusivProgramId } from '../../../public/WardenInfo.js';
import { BaseCommitmentHashRequestBorsh } from '../txBuilding/serializedTypes/borshTypes/legacy/BaseCommitmentHashRequestBorsh.js';
import { RVKWrapper } from '../../clientCrypto/RVKWrapper.js';
import { StoreInstructionBase } from './StoreInstructionBase.js';
import { StoreBaseCommitmentBorshLegacy } from '../txBuilding/serializedTypes/borshTypes/legacy/StoreBaseCommitmentBorshLegacy.js';
import { bs58ToBytes } from '../../utils/base58Utils.js';

export class StoreInstructionLegacy extends StoreInstructionBase {
    public readonly amount: bigint;

    public readonly tokenType: TokenType;

    public readonly assocCommIndex: number;

    // Mandatory params for getting keys, rest for generating ix
    constructor(
        tokenType: TokenType,
        hashAccIndex: number,
        amount: bigint,
        coreCommitmentHash: ReprScalar,
        commitmentHash: ReprScalar,
        merkleStartIndex: number,
        feeVersion: number,
        minBatchingRate: number,
    ) {
        super(
            hashAccIndex,
            coreCommitmentHash,
            commitmentHash,
            feeVersion,
            minBatchingRate,
        );
        this.tokenType = tokenType;
        this.amount = amount;
        this.assocCommIndex = merkleStartIndex;
    }

    public static parseInstruction(ix: PartiallyDecodedInstruction): StoreInstructionLegacy | null {
        let parsed: StoreBaseCommitmentBorshLegacy;
        try {
            parsed = deserialize(bs58ToBytes(ix.data), StoreBaseCommitmentBorshLegacy);
        }
        catch (e) {
            return null;
        }

        return new StoreInstructionLegacy(
            getTokenType(parsed.request.token_id),
            parsed.hash_account_index,
            parsed.request.amount,
            serializeUint256LE(parsed.request.base_commitment) as ReprScalar,
            serializeUint256LE(parsed.request.commitment) as ReprScalar,
            parsed.request.commitment_index,
            parsed.request.fee_version,
            parsed.request.min_batching_rate,
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
            this.assocCommIndex,
            this.amount,
            getNumberFromTokenType(this.tokenType),
            deserializeUint256LE(this.commitmentHash),
            this.feeVersion,
            this.minBatchingRate,
        );

        const hashingPDA = AccountReader.generateElusivPDAFrom([BASE_COMMITMENT_HASH_ACC_SEED], getElusivProgramId(cluster), this.hashAccIndex);

        const payload = new StoreBaseCommitmentBorshLegacy(
            STORE_BASE_COMM_IX_CODE,
            this.hashAccIndex,
            hashingPDA[1],
            request,
        );

        const keys = this.getAccounts(rvk, nonce, hashingPDA[0], cluster, sender, warden);

        return new TransactionInstruction({
            keys,
            programId: getElusivProgramId(cluster),
            data: Buffer.from(serialize(payload)),
        });
    }

    public getTokenType(): TokenType {
        return this.tokenType;
    }

    public getAmount(): bigint {
        return this.amount;
    }

    public getAssocCommIndex(): number {
        return this.assocCommIndex;
    }
}
