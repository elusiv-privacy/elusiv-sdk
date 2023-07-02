/* eslint-disable camelcase */
import { field, fixedArray } from '@dao-xyz/borsh';
import { bigIntToNumber } from '@elusiv/serialization';
import { TransactionSerialization } from '../../wardenSerialization/TransactionSerialization.js';
import {
    U256Serialized,
} from '../types.js';

/**
 * pub struct OptionalFee {
    pub collector: Pubkey (= [u8; 32]),
    pub amount: u64,
}
 */

export class OptionalFeeBorsh {
    @field({ type: fixedArray('u8', 32) })
        collector!: Uint8Array;

    @field({ type: 'u64' })
        amount!: bigint;

    constructor(
        collector: Uint8Array,
        amount: bigint,
    ) {
        this.collector = collector;
        this.amount = amount;
    }

    public serializeJSON(): OptionalFeeSerializedJSON {
        return {
            collector: TransactionSerialization.serializeU256Bytes(this.collector),
            amount: bigIntToNumber(this.amount),
        };
    }
}

export type OptionalFeeSerializedJSON = {
    collector: U256Serialized;
    amount: number;
};
