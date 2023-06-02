/* eslint-disable camelcase */
import { field } from '@dao-xyz/borsh';
import { STORE_BASE_COMM_IX_CODE } from '../../../../../../constants.js';
import { BaseCommitmentHashRequestBorsh } from './BaseCommitmentHashRequestBorsh.js';
/**
    StoreBaseCommitment {
        hash_account_index: u32,
        hash_account_bump: u8,
        request: BaseCommitmentHashRequest,
    },
 */

export class StoreBaseCommitmentBorshLegacy {
    // We have to do this instead of using variants due to legacy store
    // having the same variant index which borsh otherwise complains about.
    @field({ type: 'u8' })
        instruction_index!: number;

    @field({ type: 'u32' })
    public hash_account_index: number;

    @field({ type: 'u8' })
    public hash_account_bump: number;

    @field({ type: BaseCommitmentHashRequestBorsh })
    public request: BaseCommitmentHashRequestBorsh;

    constructor(
        instruction_index: number,
        hash_account_index: number,
        hash_account_bump: number,
        request: BaseCommitmentHashRequestBorsh,
    ) {
        this.instruction_index = instruction_index;
        if (instruction_index !== STORE_BASE_COMM_IX_CODE) throw new Error('Invalid instruction');
        this.hash_account_index = hash_account_index;
        this.hash_account_bump = hash_account_bump;
        this.request = request;
    }
}
