/* eslint-disable camelcase */
/**
 * - Instruction format:
    FinalizeVerificationSend {
        verification_account_index: u8,
        data: FinalizeSendData,
        uses_memo: bool,
    },
*/

import { field, variant } from '@dao-xyz/borsh';
import { FINALIZE_VERIFICATION_IX_CODE } from '../../../../../../constants.js';
import { ElusivInstructionBorsh } from './ElusivInstructionBorsh.js';
import { FinalizeSendDataBorsh } from './FinalizeSendDataBorsh.js';

@variant(FINALIZE_VERIFICATION_IX_CODE)
export class FinalizeVerificationBorsh extends ElusivInstructionBorsh {
    @field({ type: 'u8' })
    public verification_account_index: number;

    @field({ type: FinalizeSendDataBorsh })
    public data: FinalizeSendDataBorsh;

    @field({ type: 'bool' })
    public uses_memo: boolean;

    constructor(
        verification_account_index: number,
        data: FinalizeSendDataBorsh,
        uses_memo: boolean,
    ) {
        super();
        this.verification_account_index = verification_account_index;
        this.data = data;
        this.uses_memo = uses_memo;
    }
}
