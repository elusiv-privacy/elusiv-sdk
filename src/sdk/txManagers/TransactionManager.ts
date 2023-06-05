import { Cluster, Connection } from '@solana/web3.js';
import { DEFAULT_FETCH_BATCH_SIZE, MAX_UINT32 } from '../../constants.js';
import { RVKWrapper } from '../clientCrypto/RVKWrapper.js';
import { ElusivTransaction } from '../transactions/ElusivTransaction.js';
import { SendTx } from '../transactions/SendTx.js';
import { IdentifierTxFetcher } from './IdentifierTxFetcher.js';
import { AbstractTxManager } from './AbstractTxManager.js';
import { TokenType } from '../../public/tokenTypes/TokenType.js';

export class TransactionManager extends IdentifierTxFetcher {
    public static createTxManager(
        connection: Connection,
        cluster: Cluster,
        rvk: RVKWrapper,
    ): TransactionManager {
        return new TransactionManager(connection, cluster, rvk);
    }

    // Returns the last <count> nonces of transactions. If before is set, it only fetches transactions before said nonce.
    // If tokentype is set, it returns only txs of that tokentype
    public async fetchTxs(count: number, tokenType?: TokenType, before?: number): Promise<ElusivTransaction[]> {
        const res: (ElusivTransaction | undefined)[] = [];
        let fetchedCount = 0;
        let beforeInner: number = before === undefined ? Number.MAX_SAFE_INTEGER : before;

        while (beforeInner >= 0 && fetchedCount < count) {
            // We can't outsource this and run all fetches in parralel, since the loop depends on the result of the previous fetch
            // eslint-disable-next-line no-await-in-loop
            const batch = await super.getTxs(count, beforeInner);
            const filteredBatch: (ElusivTransaction | undefined)[] = [];

            for (const tx of batch) {
                if (tx !== undefined && (tokenType === undefined || tx.tokenType === tokenType)) {
                    fetchedCount++;
                    filteredBatch.push(tx);
                }
                else {
                    filteredBatch.push(undefined);
                }
            }
            res.push(...filteredBatch);

            beforeInner = TransactionManager.getLowestFetchedNonceFromBatch(batch);
        }

        const txs = AbstractTxManager.getTxsInNonceRange(res, count);
        // We know all but the most recent transaction must be confirmed, lest the most recent one could not have been sent
        // Set the transcation status of all but the most recent transaction to confirmed
        for (let i = 0; i < txs.length; i++) {
            const tx = txs[i];
            if (tx !== undefined && i !== 0) {
                tx.transactionStatus = 'CONFIRMED';
            }
        }

        return txs;
    }

    // To get our current private balance we do two things:
    // 1. We revert back to our latest store of that token type because that tells us our current private balance at that time
    // 2. We subtract all the send values of that token type that we have done since then
    public async getPrivateBalance(tokenType: TokenType, before?: number, batchSize = DEFAULT_FETCH_BATCH_SIZE): Promise<bigint> {
        return this.getPrivateBalanceFromMetadata(tokenType, before, batchSize);
    }

    // Get the private balance by parsing the past tx history. This is slower, but guaranteed to be accurate.
    public async getPrivateBalanceFromTxHistory(tokenType: TokenType, before?: number, batchSize = DEFAULT_FETCH_BATCH_SIZE): Promise<bigint> {
        let lowestFetchedNonce: number = before === undefined ? Number.MAX_SAFE_INTEGER : before;
        let totalBalance = BigInt(0);

        while (lowestFetchedNonce >= 0) {
            // We can't outsource this and run all fetches in parralel, since the loop depends on the result of the previous fetch
            // eslint-disable-next-line no-await-in-loop
            const batch = await this.fetchTxs(batchSize, tokenType, lowestFetchedNonce);

            for (let i = 0; i < batch.length; i++) {
                if (batch[i].txType === 'TOPUP') totalBalance += batch[i].amount;
                else totalBalance = totalBalance - batch[i].amount - batch[i].fee;
            }
            lowestFetchedNonce = TransactionManager.getLowestFetchedNonceFromBatch(batch);
        }

        return totalBalance;
    }

    public async getPrivateBalanceFromMetadata(tokenType: TokenType, before?: number, batchSize = DEFAULT_FETCH_BATCH_SIZE): Promise<bigint> {
        let lowestFetchedNonce: number = before === undefined ? Number.MAX_SAFE_INTEGER : before;
        let totalBalance = BigInt(0);

        while (lowestFetchedNonce >= 0) {
            // We can't outsource this and run all fetches in parralel, since the loop depends on the result of the previous fetch
            // eslint-disable-next-line no-await-in-loop
            const batch = await this.fetchTxs(batchSize, tokenType, lowestFetchedNonce);

            for (let i = 0; i < batch.length; i++) {
                if (batch[i]?.txType === 'SEND') {
                    // i + 1 because we want to include the send tx too
                    const mostRecentSend: SendTx = batch[i] as SendTx;
                    // Normal tx
                    if (mostRecentSend.metadata !== undefined) {
                        return mostRecentSend.metadata.balance + totalBalance;
                    }
                    // Legacy tx
                    totalBalance = totalBalance - batch[i].amount - batch[i].fee;
                }
                else {
                    totalBalance += batch[i].amount;
                }
            }
            lowestFetchedNonce = TransactionManager.getLowestFetchedNonceFromBatch(batch);
        }

        // No sends? Return all stores
        return totalBalance;
    }

    public async getMostRecentTx(): Promise<ElusivTransaction | undefined> {
        return this.getTxs(1).then((txs) => txs[0]);
    }

    // Helpers
    private static getLowestFetchedNonceFromBatch(batch: (ElusivTransaction | undefined)[]): number {
        let lowest = MAX_UINT32;
        for (let i = 0; i < batch.length; i++) {
            const curr = batch[i];
            if (curr !== undefined) {
                lowest = Math.min(lowest, curr.nonce);
            }
        }

        // If our batch is empty or filled with undefined, we've fetched everything, so we return -1 by default
        return lowest === MAX_UINT32 ? -1 : lowest;
    }
}
