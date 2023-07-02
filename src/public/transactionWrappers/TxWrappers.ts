import { ConfirmedSignatureInfo, PublicKey, SystemProgram } from '@solana/web3.js';
import { bigIntToNumber } from '@elusiv/serialization';
import { ElusivTransaction } from '../../sdk/transactions/ElusivTransaction.js';
import { SendTx } from '../../sdk/transactions/SendTx.js';
import { StoreTx } from '../../sdk/transactions/StoreTx.js';
import { TransactionStatus } from '../TransactionStatus.js';
import { TxTypes } from '../TxTypes.js';
import { TokenType } from '../tokenTypes/TokenType.js';

/**
 * Type representing data all types of tx wrappers contain
 */
export type PrivateTxWrapperShared = {
    readonly txType: TxTypes;
    /**
     * Amount being transferred by this tx in the provided tokentype
     */
    readonly amount: number;
    /**
     * Fee that was paid for processing this transaction (subtracted from private balance in the case of send)
     */
    readonly fee: number;
    /**
     * Signature that this transaction had
     */
    readonly sig: ConfirmedSignatureInfo;
    readonly tokenType: TokenType;
    /**
     * Current status of this transaction
     */
    transactionStatus?: TransactionStatus;

    /**
     * Pubkey of warden that helped process this tx
     */
    warden: PublicKey;

    /**
     * Internal
     */
    nonce: number;
}

export type SendTxWrapper = PrivateTxWrapperShared & {
    readonly recipient: PublicKey | undefined;

    readonly isSolanaPayTransfer: boolean;

    // Reference key used in e.g. solana pay
    readonly reference: PublicKey | undefined;

    /**
     * Fee that was paid to a third party on top of the normal fee
     */
    readonly extraFee: number

    readonly memo: string | undefined;
}

export type TopUpTxWrapper = {
    readonly origin: PublicKey;
} & PrivateTxWrapperShared;

/**
 * These types represent wrappers containing information relevant to the user for private transactions.
 * Meant to be used by implementors' e.g. UI to nicely display information about past txs.
 */
export type PrivateTxWrapper = TopUpTxWrapper | SendTxWrapper;

export function toPrivateTxWrapper(tx: ElusivTransaction): PrivateTxWrapper {
    switch (tx.txType) {
        case 'TOPUP':
            return toWrapperTopUp(tx as StoreTx);
        case 'SEND':
            return toWrapperSend(tx as SendTx);
        default:
            throw new Error(`Unknown tx type ${tx.txType}`);
    }
}

function toWrapperSend(tx: SendTx): SendTxWrapper {
    if (tx.signature === undefined) throw new Error('Missing signature, should never happen');
    return {
        txType: tx.txType,
        amount: bigIntToNumber(tx.amount - tx.extraFee.amount),
        sig: tx.signature,
        tokenType: tx.tokenType,
        fee: bigIntToNumber(tx.fee),
        extraFee: bigIntToNumber(tx.extraFee.amount),
        recipient: tx.recipient,
        isSolanaPayTransfer: tx.isSolanaPayTransfer,
        transactionStatus: tx.transactionStatus,
        nonce: tx.nonce,
        warden: tx.warden,
        reference: tx.refKey && SystemProgram.programId.equals(tx.refKey) ? undefined : tx.refKey,
        memo: tx.memo,
    };
}

function toWrapperTopUp(tx: StoreTx): TopUpTxWrapper {
    if (tx.signature === undefined) throw new Error('Missing signature, should never happen');
    return {
        origin: tx.sender,
        txType: tx.txType,
        amount: bigIntToNumber(tx.amount),
        sig: tx.signature,
        tokenType: tx.tokenType,
        transactionStatus: tx.transactionStatus,
        nonce: tx.nonce,
        warden: tx.warden,
        fee: bigIntToNumber(tx.fee),
    };
}
