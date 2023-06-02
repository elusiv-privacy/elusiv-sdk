/* eslint-disable camelcase */
/**
* pub struct BaseCommitmentHashRequest {
    pub base_commitment: RawU256,
    pub commitment_index: u32,
    pub amount: u64,
    pub token_id: u16,
    pub commitment: RawU256, // only there in case we require duplicate checking (not atm)
    pub fee_version: u32,

    /// The minimum allowed batching rate (since the fee is precomputed with the concrete batching rate)
    pub min_batching_rate: u32,
}
*/

import { field } from '@dao-xyz/borsh';

export class BaseCommitmentHashRequestBorsh {
    @field({ type: 'u256' })
    public base_commitment: bigint;

    @field({ type: 'u32' })
    public commitment_index: number;

    @field({ type: 'u64' })
    public amount: bigint;

    @field({ type: 'u16' })
    public token_id: number;

    @field({ type: 'u256' })
    public commitment: bigint;

    @field({ type: 'u32' })
    public fee_version: number;

    @field({ type: 'u32' })
    public min_batching_rate: number;

    constructor(
        base_commitment: bigint,
        commitment_index: number,
        amount: bigint,
        token_id: number,
        commitment: bigint,
        fee_version: number,
        min_batching_rate: number,
    ) {
        this.base_commitment = base_commitment;
        this.commitment_index = commitment_index;
        this.amount = amount;
        this.token_id = token_id;
        this.commitment = commitment;
        this.fee_version = fee_version;
        this.min_batching_rate = min_batching_rate;
    }
}
