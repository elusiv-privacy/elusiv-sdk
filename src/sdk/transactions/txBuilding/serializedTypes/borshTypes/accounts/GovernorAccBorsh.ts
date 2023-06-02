/* eslint-disable camelcase */
// pub struct GovernorAccount {
//     pda_data: PDAAccountData,

//     /// The current fee-version (new requests are forced to use this version)
//     pub fee_version: u32,

//     /// The `ProgramFee` for the `FeeAccount` with the offset `fee_version`
//     pub program_fee: ProgramFee,

//     /// The number of commitments in a MT-root hashing batch
//     pub commitment_batching_rate: u32,

//     program_version: u32,
// }

import { field } from '@dao-xyz/borsh';
import { PDAAccountDataBorsh } from './PDAAccountDataBorsh.js';
import { ProgramFeeBorsh } from './ProgramFeeBorsh.js';

export class GovernorAccBorsh {
    @field({ type: PDAAccountDataBorsh })
        pda_data!: PDAAccountDataBorsh;

    @field({ type: 'u32' })
        fee_version!: number;

    @field({ type: ProgramFeeBorsh })
        program_fee!: ProgramFeeBorsh;

    @field({ type: 'u32' })
        commitment_batching_rate!: number;

    @field({ type: 'u32' })
        program_version!: number;

    constructor(pda_data: PDAAccountDataBorsh, fee_version: number, program_fee: ProgramFeeBorsh, commitment_batching_rate: number, program_version: number) {
        this.pda_data = pda_data;
        this.fee_version = fee_version;
        this.program_fee = program_fee;
        this.commitment_batching_rate = commitment_batching_rate;
        this.program_version = program_version;
    }
}
