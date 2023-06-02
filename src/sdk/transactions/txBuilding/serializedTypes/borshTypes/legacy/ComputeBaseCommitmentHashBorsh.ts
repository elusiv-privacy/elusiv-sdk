/* eslint-disable camelcase */
/**
 *     Basic transaction is the below. HOWEVER, we extend it with some additional fields from the client side:
 *     ComputeBaseCommitmentHash {
        hash_account_index: u32,
        nonce: u32,
    },

    Extension:
    iv: [u8, 16],
    cipher_text: [u8; 23],
 */

import { field, fixedArray, variant } from '@dao-xyz/borsh';
import { COMPUTE_COMM_HASH_IX_CODE } from '../../../../../../constants.js';
import { ElusivInstructionBorsh } from './ElusivInstructionBorsh.js';

@variant(COMPUTE_COMM_HASH_IX_CODE)
export class ComputeBaseCommitmentHashBorsh extends ElusivInstructionBorsh {
    @field({ type: 'u32' })
    public hash_account_index: number;

    @field({ type: 'u32' })
    public nonce: number;

    @field({ type: fixedArray('u8', 16) })
    public iv: number[];

    @field({ type: fixedArray('u8', 15) })
    public cipher_text: number[];

    constructor(
        hash_account_index: number,
        nonce: number,
        iv: number[],
        cipher_text: number[],
    ) {
        super();
        this.hash_account_index = hash_account_index;
        this.nonce = nonce;
        this.iv = iv;
        this.cipher_text = cipher_text;
    }
}
