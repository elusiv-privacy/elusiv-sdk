/* eslint-disable camelcase */
import { field, fixedArray } from '@dao-xyz/borsh';

/**
 * The format of the decrypted payload we extend ComputBaseCommitmentHashBorsh
 * with from the client side:
 *
 * curr_priv_balance: u64,
 * is_recipient: bool,
 * checksum: [u8; 6],
 */
export class ComputeHashIxEncryptedPayloadBorsh {
    @field({ type: 'u64' })
    public curr_priv_balance: bigint;

    @field({ type: 'bool' })
    public is_recipient: boolean;

    @field({ type: fixedArray('u8', 6) })
    public checksum: number[];

    constructor(
        curr_priv_balance: bigint,
        is_recipient: boolean,
        checksum: number[],
    ) {
        this.curr_priv_balance = curr_priv_balance;
        this.is_recipient = is_recipient;
        this.checksum = checksum;
    }
}
