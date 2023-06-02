import { Cluster, PublicKey } from '@solana/web3.js';
import { ElusivTransaction } from '../transactions/ElusivTransaction.js';
import { PartialStoreTx } from '../transactions/StoreTx.js';
import { PartialSendTx } from '../transactions/SendTx.js';
import { NoncedTxResponse, SigResponse } from './IdentifierTxFetcher.js';
import { TransactionParsing } from '../transactions/txParsing/TransactionParsing.js';
import { isTruthy } from '../utils/utils.js';
import { INVALID_TX_TYPE } from '../../constants.js';
import { RVKWrapper } from '../clientCrypto/RVKWrapper.js';
import { FinalizeVerificationInstruction } from '../transactions/instructions/FinalizeVerificationInstruction.js';
import { InitVerificationInstruction } from '../transactions/instructions/InitVerificationInstruction.js';

export class ResponseConverter {
    /**
     * @param rvk The RVKWrapper to use for decryption
     * @param cluster The cluster from which the transaction response was fetched
     * @param tx The transaction response to be converted
     * @returns The parsed transactions. The reasons it's potentially multiple elusiv transactions for one nonce is
     * because of the nonce being derived from the most recently confirmed nonce, meaning in some edge cases an RPC provider may not pick
     * up on the nonce being used and therefore build a transaction with the same nonce again. This is a rare edge case, but it's
     * important to handle it, so we allow for returning multiple transactions even though most of the time it will be an array with only
     * one transaction.
     */
    public static async txResponseToElusivTxs(rvk: RVKWrapper, cluster: Cluster, tx: NoncedTxResponse): Promise<ElusivTransaction[]> {
        if (!tx.txResponse.every(isTruthy) || tx.txResponse.length === 0) {
            throw new Error('TxResponse contains null or is empty');
        }
        const elusivTxs = this.getElusivTxs(cluster, tx);

        const txs: Promise<ElusivTransaction>[] = [];
        // Some elusiv txs (e.g. send) consist of two tx responses. We don't want to check the same tx twice, so just save those:
        const viewed: boolean[] = Array(elusivTxs.length).fill(false);

        for (let i = 0; i < elusivTxs.length; i++) {
            if (!viewed[i]) {
                const elusivTx = elusivTxs[i];
                if (TransactionParsing.isStoreTx(cluster, elusivTx.fst.transaction.message, tx.idPubKey)) txs.push(this.txResponseToStoreTx(rvk, cluster, tx.nonce, tx.idPubKey, elusivTx));
                // Transactions are ordered in reverse, so finalize will come first (if it exists)
                const finalizeIx = TransactionParsing.getSendFinalizeIx(cluster, elusivTx.fst.transaction.message, tx.idPubKey);
                if (finalizeIx !== undefined) {
                    let initTx: SigResponse | undefined;
                    const verificationAccFinalize = FinalizeVerificationInstruction.getVerificationAcc(finalizeIx);
                    /*
                    Find init partner for our finalize by checking for the next init tx in chronological order. Upon first glance this
                    seems faulty, as a second init could have been started before this one has been finalized
                    e.g. [finalize1, finalize2, init2, init1] would return init2 for the partner of finalize1 if we just checked for the next init.

                    This is why we also check that the verification account is the same. In the above case
                    init2 could not have taken the same verification account, as its still in use by init1 when init2 is processed. In the case
                    [finalize2, init2, finalize1, init1], init1 and init2 could use the same verification account, but
                    this is fine, as finalize2 will find init2 first and finalize1 will find init1 first.
                    */
                    for (let j = i; j < elusivTxs.length; j++) {
                        const initIx = TransactionParsing.getSendInitIx(cluster, elusivTxs[j].fst.transaction.message, tx.idPubKey);
                        if (initIx !== undefined && InitVerificationInstruction.getVerificationAcc(initIx).equals(verificationAccFinalize)) {
                            initTx = elusivTxs[j];
                            viewed[j] = true;
                            break;
                        }
                    }
                    if (initTx === undefined) throw new Error(`Failed to find init tx for identifier ${tx.idPubKey.toBase58()}`);
                    txs.push(this.txResponseToSendTx(rvk, cluster, tx.nonce, tx.idPubKey, [elusivTx, initTx]));
                }
                // Transactions being ordered in reverse also means that if we run into an init tx, we don't have a belonging finalize
                if (TransactionParsing.getSendInitIx(cluster, elusivTx.fst.transaction.message, tx.idPubKey) !== undefined) {
                    txs.push(this.txResponseToSendTx(rvk, cluster, tx.nonce, tx.idPubKey, [elusivTx]));
                }
            }
        }
        if (txs.length === 0) throw new Error(INVALID_TX_TYPE);
        return Promise.all(txs);
    }

    private static getElusivTxs(cluster: Cluster, tx: NoncedTxResponse): SigResponse[] {
        return tx.txResponse.filter((msg) => TransactionParsing.isElusivTx(cluster, msg.fst.transaction.message, tx.idPubKey));
    }

    private static async txResponseToStoreTx(rvk: RVKWrapper, cluster: Cluster, nonce: number, idPubKey: PublicKey, tx: SigResponse): Promise<PartialStoreTx> {
        return TransactionParsing.tryParseRawStore(
            tx.fst.transaction.message,
            tx.fst.meta?.innerInstructions ? tx.fst.meta?.innerInstructions : [],
            tx.snd,
            nonce,
            idPubKey,
            rvk,
        );
    }

    private static async txResponseToSendTx(rvk: RVKWrapper, cluster: Cluster, nonce: number, idPubKey: PublicKey, tx: SigResponse[]): Promise<PartialSendTx> {
        // This will throw if we have the wrong kind of transaction
        return TransactionParsing.tryParseRawSend(
            cluster,
            tx.map((t) => t.fst.transaction.message),
            tx.map((t) => t.snd),
            nonce,
            idPubKey,
            rvk,
        );
    }
}
