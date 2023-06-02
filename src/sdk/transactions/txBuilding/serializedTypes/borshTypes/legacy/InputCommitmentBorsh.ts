/* eslint-disable camelcase */
import { field, option } from '@dao-xyz/borsh';
import { TransactionSerialization } from '../../../wardenSerialization/TransactionSerialization.js';
import { U256Serialized } from '../../types';

export class InputCommitmentBorsh {
    @field({ type: option('u256') })
        root?: bigint;

    @field({ type: 'u256' })
        nullifier_hash!: bigint;

    // Order of params is relevant because of the way borsh serializes the initial rust data,
    // but usually cant have non-optional param after param. So we allow nHash to be undefined
    // and throw an error if it is undefined.
    constructor(
        root?: bigint,
        nullifier_hash?: bigint,
    ) {
        if (nullifier_hash === undefined) throw new Error('nullifier_hash is undefined');
        this.root = root;
        this.nullifier_hash = nullifier_hash;
    }

    public serializeJSON(): InputCommitmentSerializedJSON {
        return {
            root: this.root === undefined || this.root === BigInt(0) ? null : TransactionSerialization.serializeU256BigInt(this.root),
            nullifier_hash: TransactionSerialization.serializeU256BigInt(this.nullifier_hash),
        };
    }
}

export type InputCommitmentSerializedJSON = {
    root: U256Serialized | null,
    nullifier_hash: U256Serialized,
}
