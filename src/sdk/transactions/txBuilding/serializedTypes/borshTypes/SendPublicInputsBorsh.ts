/* eslint-disable camelcase */
import { field } from '@dao-xyz/borsh';
import { SEND_PUBLIC_INPUT_IX_CODE } from '../../../../../constants.js';
import { TransactionSerialization } from '../../wardenSerialization/TransactionSerialization.js';
import { U256Serialized } from '../types.js';
import { JoinSplitBorsh, JoinSplitSerializedJSON } from './JoinSplitBorsh.js';

/**
 * pub struct SendPublicInputs {
    pub join_split: JoinSplitPublicInputs,
    pub recipient_is_associated_token_account: bool,
    pub solana_pay_transfer: bool,
    pub hashed_inputs: U256,
}
 */

export class SendPublicInputsBorsh {
    // We have to do this instead of using variants due to legacy send pub inputs
    // having the same variant index which borsh otherwise complains about.
    @field({ type: 'u8' })
        proof_type!: number;

    @field({ type: JoinSplitBorsh })
        join_split!: JoinSplitBorsh;

    @field({ type: 'bool' })
        recipient_is_associated_token_account!: boolean;

    @field({ type: 'bool' })
        solana_pay_transfer!: boolean;

    @field({ type: 'u256' })
        hashed_inputs!: bigint;

    constructor(
        proof_type: number,
        join_split: JoinSplitBorsh,
        recipient_is_associated_token_account: boolean,
        solana_pay_transfer: boolean,
        hashed_inputs: bigint,
    ) {
        this.proof_type = proof_type;
        if (this.proof_type !== SEND_PUBLIC_INPUT_IX_CODE) throw new Error('Invalid proof type');
        this.join_split = join_split;
        this.recipient_is_associated_token_account = recipient_is_associated_token_account;
        this.solana_pay_transfer = solana_pay_transfer;
        this.hashed_inputs = hashed_inputs;
    }

    public serializeJSON(): SendPublicInputsSerializedJSON {
        return {
            join_split: this.join_split.serializeJSON(),
            recipient_is_associated_token_account: this.recipient_is_associated_token_account,
            hashed_inputs: TransactionSerialization.serializeU256BigInt(this.hashed_inputs),
            solana_pay_transfer: this.solana_pay_transfer,
        };
    }
}

export type SendPublicInputsSerializedJSON = {
    join_split: JoinSplitSerializedJSON;
    recipient_is_associated_token_account: boolean;
    hashed_inputs: U256Serialized;
    solana_pay_transfer: boolean;
}
