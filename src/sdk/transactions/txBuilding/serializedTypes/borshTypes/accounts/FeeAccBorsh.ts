/* eslint-disable camelcase */
// pub struct FeeAccount {
//     pda_data: PDAAccountData,
//     pub program_fee: ProgramFee,
// }

import { field } from '@dao-xyz/borsh';
import { PDAAccountDataBorsh } from './PDAAccountDataBorsh.js';
import { ProgramFeeBorsh } from './ProgramFeeBorsh.js';

export class FeeAccBorsh {
    @field({ type: PDAAccountDataBorsh })
        pda_data!: PDAAccountDataBorsh;

    @field({ type: ProgramFeeBorsh })
        program_fee!: ProgramFeeBorsh;

    constructor(pda_data: PDAAccountDataBorsh, program_fee: ProgramFeeBorsh) {
        this.pda_data = pda_data;
        this.program_fee = program_fee;
    }
}
