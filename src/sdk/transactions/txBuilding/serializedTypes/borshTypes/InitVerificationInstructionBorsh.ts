/* eslint-disable camelcase */
import { field, fixedArray } from '@dao-xyz/borsh';
import { INIT_VERIFICATION_IX_CODE, MAX_MT_COUNT } from '../../../../../constants.js';
import { SendPublicInputsBorsh } from './SendPublicInputsBorsh.js';

/**
 * InitVerification {
        verification_account_index: u8,
        vkey_id: u32,
        tree_indices: [u32; MAX_MT_COUNT],
        request: ProofRequest,
        skip_nullifier_pda: bool,
    },
 */
export class InitVerificationInstructionBorsh {
    // We have to do this instead of using variants due to legacy init
    // having the same variant index which borsh otherwise complains about.
    @field({ type: 'u8' })
        instruction_index!: number;

    @field({ type: 'u8' })
        verification_account_index!: number;

    @field({ type: 'u32' })
        vkey_id!: number;

    @field({ type: fixedArray('u32', MAX_MT_COUNT) })
        tree_indices!: number[];

    @field({ type: SendPublicInputsBorsh })
        request!: SendPublicInputsBorsh;

    @field({ type: 'bool' })
        skip_nullifier_pda!: boolean;

    constructor(
        instruction_index: number,
        verification_account_index: number,
        vkey_id: number,
        tree_indices: number[],
        request: SendPublicInputsBorsh,
        skip_nullifier_pda: boolean,
    ) {
        this.instruction_index = instruction_index;
        if (instruction_index !== INIT_VERIFICATION_IX_CODE) throw new Error('Invalid instruction');
        this.verification_account_index = verification_account_index;
        this.vkey_id = vkey_id;
        this.tree_indices = tree_indices;
        this.request = request;
        this.skip_nullifier_pda = skip_nullifier_pda;
    }
}
