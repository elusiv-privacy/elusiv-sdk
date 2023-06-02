/* eslint-disable camelcase */
import { field, vec } from '@dao-xyz/borsh';
import { areEqualArrs, bigIntToNumber } from 'elusiv-serialization';
import { TransactionSerialization } from '../../../wardenSerialization/TransactionSerialization.js';
import {
    U256Serialized,
} from '../../types.js';
import { InputCommitmentBorsh, InputCommitmentSerializedJSON } from './InputCommitmentBorsh.js';

/**
 * pub struct JoinSplitPublicInputs {
    pub input_commitments: Vec<InputCommitment>,
    pub output_commitment: RawU256,
    pub recent_commitment_index: u32,
    pub fee_version: u32,
    pub amount: u64,
    pub fee: u64,
    pub token_id: u16,
}
 */

export class JoinSplitBorshLegacy {
    @field({ type: vec(InputCommitmentBorsh) })
        input_commitments!: InputCommitmentBorsh[];

    @field({ type: 'u256' })
        output_commitment!: bigint;

    @field({ type: 'u32' })
        output_commitment_index: number;

    @field({ type: 'u32' })
        fee_version!: number;

    @field({ type: 'u64' })
        amount!: bigint;

    @field({ type: 'u64' })
        fee!: bigint;

    @field({ type: 'u16' })
        token_id!: number;

    constructor(
        input_commitments: InputCommitmentBorsh[],
        output_commitment: bigint,
        output_commitment_index: number,
        fee_version: number,
        amount: bigint,
        fee: bigint,
        token_id: number,
    ) {
        this.input_commitments = input_commitments;
        this.output_commitment = output_commitment;
        this.output_commitment_index = output_commitment_index;
        this.fee_version = fee_version;
        this.amount = amount;
        this.fee = fee;
        this.token_id = token_id;
    }

    public serializeJSON(): JoinSplitLegacySerializedJSON {
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

        return {
            input_commitments: serializedComms,
            output_commitment: TransactionSerialization.serializeU256BigInt(this.output_commitment),
            output_commitment_index: this.output_commitment_index,
            fee_version: this.fee_version,
            amount: bigIntToNumber(this.amount),
            fee: bigIntToNumber(this.fee),
            token_id: this.token_id,
        };
    }
}

export type JoinSplitLegacySerializedJSON = {
    input_commitments: InputCommitmentSerializedJSON[],
    output_commitment: U256Serialized;
    output_commitment_index: number,
    fee_version: number;
    amount: number;
    fee: number;
    token_id: number;
};
