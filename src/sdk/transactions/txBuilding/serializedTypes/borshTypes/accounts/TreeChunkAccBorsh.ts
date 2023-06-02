/* eslint-disable camelcase */
import {
    field, fixedArray,
} from '@dao-xyz/borsh';
import { STORAGE_MT_VALUES_PER_ACCOUNT } from '../../../../../../constants.js';

export class TreeChunkAccBorsh {
    @field({ type: 'u8' })
        is_in_use! : number;

    @field({ type: fixedArray('u8', 32 * STORAGE_MT_VALUES_PER_ACCOUNT) })
        commitment_data! : Uint8Array;

    constructor(is_in_use: number, commitment_data: Uint8Array) {
        this.is_in_use = is_in_use;
        this.commitment_data = commitment_data;
    }
}
