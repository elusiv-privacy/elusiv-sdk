import { Transaction } from '@solana/web3.js';
import { ReprScalar } from 'elusiv-cryptojs';
import { INVALID_TX_DATA } from '../../constants.js';
import { Fee } from '../Fee.js';
import { TokenType } from '../tokenTypes/TokenType.js';
import { WardenInfo } from '../WardenInfo.js';
import { SharedTxData } from './SharedTxData.js';

/**
 * Data used for encoding a topup tx
 */
export class TopupTxData extends SharedTxData {
    /**
     * Topup tx we want to send
     */
    tx: Transaction;

    /**
     * Indicates if the topup tx we want to send is signed
     */
    private signed = false;

    /**
     * Internal
     */
    readonly hashAccIndex: number;

    /**
     * Internal
     */
    readonly merge: boolean;

    constructor(
        fee: Fee,
        tokenType: TokenType,
        lastNonce: number,
        commitmentHash: ReprScalar,
        merkleStartIndex: number,
        wardenInfo: WardenInfo,
        tx: Transaction,
        hashAccIndex: number,
        merge: boolean,
    ) {
        super(
            'TOPUP',
            fee,
            tokenType,
            lastNonce,
            commitmentHash,
            merkleStartIndex,
            wardenInfo,
        );
        this.tx = tx;
        this.hashAccIndex = hashAccIndex;
        this.merge = merge;
    }

    /**
     * Set the signed tx to be sent. Typically the flow for a developer is
     * 1. Receive unsigned TopupTxData instance
     * 2. Sign the attached tx
     * 3. Bind the signed tx using this method
     * 4. Send it off
     */
    public setSignedTx(tx: Transaction): void {
        /**
         * Make sure it's fully signed
         */
        if (!this.tx.verifySignatures(false)) throw new Error(INVALID_TX_DATA('TOPUP'));

        this.tx = tx;
        this.signed = true;
    }

    /**
     * Indicates if the attached tx has been signed
     */
    public isSigned(): boolean {
        return this.signed;
    }
}
