/* eslint-disable camelcase */
// pub struct PDAAccountData {
//     pub bump_seed: u8,

//     /// Used for future account migrations
//     pub version: u8,
// }

import { field } from '@dao-xyz/borsh';

export class PDAAccountDataBorsh {
    @field({ type: 'u8' })
        bump_seed!: number;

    @field({ type: 'u8' })
        version!: number;

    constructor(bump_seed: number, version: number) {
        this.bump_seed = bump_seed;
        this.version = version;
    }
}
