/* eslint-disable camelcase */
import { field, fixedArray, vec } from '@dao-xyz/borsh';
import { COMMITMENT_METADATA_LENGTH } from 'elusiv-circuits';
import { areEqualArrs, bigIntToNumber } from 'elusiv-serialization';
import { TransactionSerialization } from '../../wardenSerialization/TransactionSerialization.js';
import {
    CommitmentMetadataSerialized,
    U256Serialized,
} from '../types.js';
import { InputCommitmentBorsh, InputCommitmentSerializedJSON } from './legacy/InputCommitmentBorsh.js';
import { OptionalFeeBorsh, OptionalFeeSerializedJSON } from './OptionalFeeBorsh.js';

/**
 * pub struct JoinSplitPublicInputs {
    pub input_commitments: Vec<InputCommitment>,
    pub output_commitment: RawU256,
    pub recent_commitment_index: u32,
    pub fee_version: u32,
    pub amount: u64,
    pub fee: u64,
    pub optional_fee: OptionalFee,
    pub token_id: u16,
    pub metadata: CommitmentMetadata (= [u8; COMMITMENT_METADATA_LENGTH]),
}
 */

// TODO: Rewrite this to extend JoinsplitBorshLegacy
export class JoinSplitBorsh {
    @field({ type: vec(InputCommitmentBorsh) })
        input_commitments!: InputCommitmentBorsh[];

    @field({ type: 'u256' })
        output_commitment!: bigint;

    @field({ type: 'u32' })
        recent_commitment_index: number;

    @field({ type: 'u32' })
        fee_version!: number;

    @field({ type: 'u64' })
        amount!: bigint;

    @field({ type: 'u64' })
        fee!: bigint;

    @field({ type: OptionalFeeBorsh })
        optional_fee!: OptionalFeeBorsh;

    @field({ type: 'u16' })
        token_id!: number;

    @field({ type: fixedArray('u8', COMMITMENT_METADATA_LENGTH) })
        metadata: Uint8Array;

    constructor(
        input_commitments: InputCommitmentBorsh[],
        output_commitment: bigint,
        recent_commitment_index: number,
        fee_version: number,
        amount: bigint,
        fee: bigint,
        optional_fee: OptionalFeeBorsh,
        token_id: number,
        metadata: Uint8Array,
    ) {
        this.input_commitments = input_commitments;
        this.output_commitment = output_commitment;
        this.recent_commitment_index = recent_commitment_index;
        this.fee_version = fee_version;
        this.amount = amount;
        this.fee = fee;
        this.optional_fee = optional_fee;
        this.token_id = token_id;
        this.metadata = metadata;
    }

    public serializeJSON(): JoinSplitSerializedJSON {
        const nHashes = this.input_commitments.map((c) => c.nullifier_hash);
        const filtered = nHashes.filter((n) => n !== BigInt(0));
        // Empty NHashes always have to come at the end, throw if that's not the case
        if (!areEqualArrs(filtered, nHashes.slice(0, filtered.length), (a, b) => a === b)) {
            throw new Error('Empty nHashes must be at the end');
        }

        const serializedComms = this.input_commitments.map((c) => c.serializeJSON());
        const firstRoot = serializedComms[0].root;
        if (firstRoot === null) throw new Error('At least one valid root required');
        for (let i = 1; i < serializedComms.length; i++) {
            const currRoot = serializedComms[i].root;
            if (currRoot !== null && areEqualArrs(currRoot, firstRoot, (a, b) => a === b)) serializedComms[i].root = null;
        }

        if (this.metadata.length !== COMMITMENT_METADATA_LENGTH) throw new Error('Invalid length for metadata');
        return {
            input_commitments: serializedComms,
            output_commitment: TransactionSerialization.serializeU256BigInt(this.output_commitment),
            recent_commitment_index: this.recent_commitment_index,
            amount: bigIntToNumber(this.amount),
            fee: bigIntToNumber(this.fee),
            fee_version: this.fee_version,
            optional_fee: this.optional_fee.serializeJSON(),
            token_id: this.token_id,
            metadata: Array.from(this.metadata) as CommitmentMetadataSerialized,
        };
    }
}

export type JoinSplitSerializedJSON = {
    input_commitments: InputCommitmentSerializedJSON[],
    output_commitment: U256Serialized;
    recent_commitment_index: number,
    amount: number;
    fee_version: number;
    fee: number;
    optional_fee: OptionalFeeSerializedJSON;
    token_id: number;
    metadata: CommitmentMetadataSerialized;
};
