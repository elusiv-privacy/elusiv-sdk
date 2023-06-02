import { SendQuadraProof } from 'elusiv-circuits';
import { ReprScalar } from 'elusiv-cryptojs';
import { Fee, OptionalFee } from '../Fee.js';
import { TokenType } from '../tokenTypes/TokenType.js';
import { WardenInfo } from '../WardenInfo.js';
import { SharedTxData } from './SharedTxData.js';

/**
 * Data used for encoding a send tx
 */
export class SendTxData extends SharedTxData {
    readonly proof: SendQuadraProof;

    readonly extraFee: OptionalFee;

    readonly isSolanaPayTransfer: boolean;

    constructor(
        fee: Fee,
        tokenType: TokenType,
        lastNonce: number,
        commitmentHash: ReprScalar,
        merkleStartIndex: number,
        wardenInfo: WardenInfo,
        proof: SendQuadraProof,
        isSolanaPayTransfer: boolean,
        extraFee: OptionalFee,
    ) {
        super(
            'SEND',
            fee,
            tokenType,
            lastNonce,
            commitmentHash,
            merkleStartIndex,
            wardenInfo,
        );
        this.proof = proof;
        this.isSolanaPayTransfer = isSolanaPayTransfer;
        this.extraFee = extraFee;
    }
}
