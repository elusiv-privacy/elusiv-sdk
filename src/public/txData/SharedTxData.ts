import { ReprScalar } from '@elusiv/cryptojs';
import { Fee, getTotalFeeAmount } from '../Fee.js';
import { TxTypes } from '../TxTypes.js';
import { WardenInfo } from '../WardenInfo.js';
import { TokenType } from '../tokenTypes/TokenType.js';

/**
 * Data that is shared by all Elusiv Private Tx Types
 */
export abstract class SharedTxData {
    readonly txType: TxTypes;

    protected readonly fee: Fee;

    readonly tokenType: TokenType;

    /**
     * Internal
     */
    readonly lastNonce: number;

    /**
     * Internal
     */

    readonly commitmentHash: ReprScalar;

    /**
     * Internal
     */

    readonly merkleStartIndex: number;

    /**
     * Internal
     */

    readonly wardenInfo: WardenInfo;

    constructor(
        txType: TxTypes,
        fee: Fee,
        tokenType: TokenType,
        lastNonce: number,
        commitmentHash: ReprScalar,
        merkleStartIndex: number,
        wardenInfo: WardenInfo,
    ) {
        this.txType = txType;
        this.fee = fee;
        this.tokenType = tokenType;
        this.lastNonce = lastNonce;
        this.commitmentHash = commitmentHash;
        this.wardenInfo = wardenInfo;
        this.merkleStartIndex = merkleStartIndex;
    }

    /**
     *  Get the total fee to be payed for this tx in the tokentype of the tx (as an object)
     */
    public getTotalFee(): Fee {
        return this.fee;
    }

    /**
     *  Get the total fee amount to be payed for this tx in the tokentype of the tx (as a number)
     */
    public getTotalFeeAmount(): number {
        return getTotalFeeAmount(this.getTotalFee());
    }
}
