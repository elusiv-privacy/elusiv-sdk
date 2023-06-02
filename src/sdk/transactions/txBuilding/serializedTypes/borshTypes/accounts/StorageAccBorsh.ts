/* eslint-disable camelcase */
// pub struct StorageAccount {
//     pda_data: PDAAccountData,
//     pubkeys: [ElusivOption<Pubkey>; ACCOUNTS_COUNT],

//     // Points to the next commitment in the active MT
//     pub next_commitment_ptr: u32,

//     // The amount of already finished (closed) MTs
//     pub trees_count: u32,

//     // The amount of archived MTs
//     archived_count: u32,

//     // Stores the last HISTORY_ARRAY_COUNT roots of the active tree
//     pub active_mt_root_history: [U256; HISTORY_ARRAY_COUNT],
//     pub mt_roots_count: u32, // required since we batch insert commitments
// }

import { field, fixedArray } from '@dao-xyz/borsh';
import { HISTORY_ARRAY_COUNT, STORAGE_MT_CHUNK_COUNT } from '../../../../../../constants.js';
import { PDAAccountDataBorsh } from './PDAAccountDataBorsh.js';

export class StorageAccBorsh {
    @field({ type: PDAAccountDataBorsh })
        pda_data!: PDAAccountDataBorsh;

    // Contains publickeys to STORAGE_MT_CHUNK_COUNT chunks.
    // Publickeys are encoded with 33 bytes, whereby the leading byte indicated
    // whether said chunk is already active
    @field({ type: fixedArray('u8', STORAGE_MT_CHUNK_COUNT * 33) })
        pubkeys! : Uint8Array;

    @field({ type: 'u32' })
        next_commitment_ptr! : number;

    @field({ type: 'u32' })
        trees_count! : number;

    @field({ type: 'u32' })
        archived_count! : number;

    @field({ type: fixedArray('u8', HISTORY_ARRAY_COUNT * 32) })
        active_mt_root_history! : Uint8Array;

    @field({ type: 'u32' })
        mt_roots_count! : number;

    constructor(
        pda_data: PDAAccountDataBorsh,
        pubkeys: Uint8Array,
        next_commitment_ptr: number,
        trees_count: number,
        archived_count: number,
        active_mt_root_history: Uint8Array,
        mt_roots_count: number,
    ) {
        this.pda_data = pda_data;
        this.pubkeys = pubkeys;
        this.next_commitment_ptr = next_commitment_ptr;
        this.trees_count = trees_count;
        this.archived_count = archived_count;
        this.active_mt_root_history = active_mt_root_history;
        this.mt_roots_count = mt_roots_count;
    }
}
