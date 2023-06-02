import { ConfirmedSignatureInfo, PublicKey } from '@solana/web3.js';
import { ReprScalar } from 'elusiv-cryptojs';
import { TokenType } from '../../public/tokenTypes/TokenType.js';
import { TransactionStatus } from '../../public/TransactionStatus.js';
import { TxTypes } from '../../public/TxTypes.js';

export type ElusivTransaction = {
    nonce : number;
    txType : TxTypes;
    tokenType : TokenType;
    identifier : PublicKey;
    // The amount that was topped up/sent in this tx
    amount: bigint;
    // The fee that was paid for this tx
    fee: bigint;
    // The hash of the commitment that was inserted after this tx was processed
    commitmentHash : ReprScalar;
    // From where in the tree to start searching for the commitment
    merkleStartIndex : number;
    // Warden that helped/will help process this tx
    warden: PublicKey;
    // Optional because this doesnt exist until a tx is at least pending
    transactionStatus? : TransactionStatus;
    // Optional because this doesnt exist until a tx is at least pending
    signature?: ConfirmedSignatureInfo;
}
