/* eslint-disable camelcase */
/**
pub struct FinalizeSendData {
    pub total_amount: u64,
    pub token_id: u16,

    /// Estimated index of the MT in which the next-commitment will be inserted
    pub mt_index: u32,

    /// Estimated index of the next-commitment in the MT
    pub commitment_index: u32,

    pub iv: U256,
    pub encrypted_owner: U256,
} */

import { field } from '@dao-xyz/borsh';

export class FinalizeSendDataBorsh {
    @field({ type: 'u64' })
    public total_amount: bigint;

    @field({ type: 'u16' })
    public token_id: number;

    @field({ type: 'u32' })
    public mt_index: number;

    @field({ type: 'u32' })
    public commitment_index: number;

    @field({ type: 'u256' })
    public iv: bigint;

    @field({ type: 'u256' })
    public encrypted_owner: bigint;

    constructor(
        total_amount: bigint,
        token_id: number,
        mt_index: number,
        commitment_index: number,
        iv: bigint,
        encrypted_owner: bigint,
    ) {
        this.total_amount = total_amount;
        this.token_id = token_id;
        this.mt_index = mt_index;
        this.commitment_index = commitment_index;
        this.iv = iv;
        this.encrypted_owner = encrypted_owner;
    }
}
