import { PublicKey } from '@solana/web3.js';
import { TokenType } from './tokenTypes/TokenType';
import { OptionalFee } from './Fee';

/**
 * @typedef {Object} FeeCalcInfo - Information needed to calculate the fee for an elusiv transaction
 * @property {number} amount - The amount of tokens to topup/send
 * @property {TokenType} tokenType - The type of token to topup/send
 */
export type FeeCalcInfo = {
    amount: number,
    tokenType: TokenType,
}

/**
 * @typedef {Object} SendFeeCalcInfo - Information needed to calculate the fee for a send transaction
 * @property {PublicKey} recipient - Recipient for the send (the owner/sol account, not the SPL account). In the case of the tokentype being an
 * SPL token, the ATA of this account is taken unless a different one is specified via the customRecipientTA parameter.
 * @property {OptionalFee} [extraFee] - Optional fee to be collected by a third party in the same TokenType as the send. If not provided, no fee will be collected. When specifying the collector here,
 * make sure its ATA already exists. If you wish to use a custom TA for the collector, use the customFeeCollectorTA parameter.
 * @property {PublicKey} [customRecipientTA] - For the case that you want to provide an override for a Token Account to send to that is not the recipient's ATA. Make sure this token account
 * is funded with rent, else this will fail.
 */
export type SendFeeCalcInfo = FeeCalcInfo & {
    recipient: PublicKey,
    extraFee?: OptionalFee,
    customRecipientTA?: PublicKey,
}

/**
 * @typedef {Object} TopupFeeCalcInfo - Information needed to calculate the fee for a topup transaction
 */
export type TopupFeeCalcInfo = FeeCalcInfo;
