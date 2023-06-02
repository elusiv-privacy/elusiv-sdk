import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { INVALID_CONVERSION_RATE, INVALID_TOKEN_TYPE } from '../constants.js';
import { FeeUtils } from '../sdk/paramManagers/fee/FeeUtils.js';
import { TokenType } from './tokenTypes/TokenType.js';

/**
 * An optional additional fee integrators can specify to be
 * deducted from the user's private balance when sending.
 * NOTE: Currently this only supports paying the fee in the same
 * TokenType as the send.
 */
export type OptionalFee = {
    /**
     * The account with which to receive the extra fee.
     * This must be the owner account (not the ATA / a TA) and must
     * have an initialized ATA of the TokenType with which the fee will be paid.
     */
    collector: PublicKey,
    amount: bigint,
}

/**
 * Fee without an extra fee specified.
 */
export type BasicFee = {
    /**
     *  The token type in which the fee is provided
     */
    readonly tokenType: TokenType;
    /**
     *  The fee that we pay to Solana for computation, rent etc. in the above tokentype
     */
    readonly txFee: number;
    /**
     *  The fee that we pay to the Elusiv Network in the above tokentype
     */
    readonly privacyFee: number;

    /**
     * The amount of rent required for newly creating the recipients Solana token account
     * (in case they don't have one yet).
    */
    readonly tokenAccRent: number;
    /**
     *  The rate at which the fee will be APPROXIMATELY paid. Remember, we're dealing with the smallest denomination of each token here
     *  e.g. 1_000_000 "USDC" = 1$
     */
    readonly lamportsPerToken?: number;
}

export type Fee = BasicFee & {
    /**
     * Fee that was paid to a third party on top of the normal fee
     */
    readonly extraFee: number;
}

/** Get the total amount of fees to be paid in the tokentype of the fee, rounded up (includes the potential token account rent)
 * @param f The fee to get the total amount of
 * @returns The total amount of fees to be paid in the tokentype of the fee, rounded up (including the potential token account rent)
 * */
export function getTotalFeeAmount(f: Fee): number {
    return Math.ceil(getComputationFeeTotal(f) + f.tokenAccRent + f.extraFee);
}

/**
 * Get the total amount of fees to be paid in the tokentype of the fee, rounded up (NOT including the potential token account rent)
 * @param f The fee to get the total amount of
 * @returns The total amount of fees to be paid in the tokentype of the fee, rounded up (NOT including the potential token account rent)
 */
export function getComputationFeeTotal(f: Fee): number {
    return Math.ceil(f.privacyFee + f.txFee);
}

export function getTotalFeeAmountSol(f: Fee): number {
    if (f.lamportsPerToken === undefined) throw new Error(INVALID_CONVERSION_RATE);
    const total = getTotalFeeAmount(f);
    return FeeUtils.tokenToLamports(total, f.lamportsPerToken) / LAMPORTS_PER_SOL;
}

export function zeroFee(tokenType: TokenType): Fee {
    return {
        tokenType,
        txFee: 0,
        privacyFee: 0,
        extraFee: 0,
        tokenAccRent: 0,
    };
}

export function addFees(f1: Fee, f2: Fee): Fee {
    if (f1.tokenType !== f2.tokenType) {
        throw new Error(INVALID_TOKEN_TYPE);
    }
    if (
        f1.lamportsPerToken !== undefined && f2.lamportsPerToken !== undefined
        && f1.lamportsPerToken !== f2.lamportsPerToken
    ) {
        throw new Error(INVALID_CONVERSION_RATE);
    }

    return {
        tokenType: f1.tokenType,
        txFee: f1.txFee + f2.txFee,
        privacyFee: f1.privacyFee + f2.privacyFee,
        tokenAccRent: f1.tokenAccRent + f2.tokenAccRent,
        extraFee: f1.extraFee + f2.extraFee,
        lamportsPerToken: f1.lamportsPerToken || f2.lamportsPerToken,
    };
}
