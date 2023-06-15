import { Cluster, Connection } from '@solana/web3.js';
import { DEFAULT_FETCH_BATCH_SIZE, MAX_UINT32, SEND_ARITY } from '../../constants.js';
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

    /**
     * @description Returns the last {@link count} nonces of transactions. Note that this is not the same as the
     * last {@link count} of transactions, as in rare cases a nonce can have multiple txs.
     * @param count Number of nonces to fetch. Can return less than count if less than count nonces exist.
     * @param tokenType Optional filter for only fetching txs of the given tokentype.
     * If none is set, just fetches all txs regardless of tokentype.
     * @param before Optional filter exclusive before which nonce to fetch. Not included in the nonces to fetch i.e. if before = 5 we will fetch
     * 4,3,2,1,0.
     * @returns An array of transactions with the greatest nonce at index 0 and the smallest nonce at the end. Note that
     * there is no fixed ordering for same nonce txs, this is left to the caller to handle. E.g. fetching nonces 3,2,1 with
     * 2 having two txs, can validly return [tx_3, tx_2_a, tx_2_b, tx_1] or [tx_3, tx_2_b, tx_2_a, tx_1].
     * */
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
                        const remainingBatch = batch.slice(i + 1);
                        // We might have some topups with same nonce i.e. their commitments have not been
                        // used yet
                        const sameNonce = remainingBatch.filter((tx) => tx.nonce === mostRecentSend.nonce);

                        // This is impossible, if it somehow happens we'll want to know
                        if (sameNonce.filter((tx) => tx.txType === 'SEND').length !== 0) throw new Error(`Encountered two sends with same nonce at id key ${mostRecentSend.identifier.toBase58()}`);

                        const sameNonceTopupSum = sameNonce.filter((tx) => tx.txType === 'TOPUP').reduceRight((acc, tx) => acc + tx.amount, BigInt(0));

                        return mostRecentSend.metadata.balance + totalBalance + sameNonceTopupSum;
                    }
                    // Legacy tx
                    totalBalance = totalBalance - mostRecentSend.amount - mostRecentSend.fee;
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

    // At most, we can have 4 commitments at once, namely 1 commitment from a send followed
    // by 3 store commitments OR 4 store commitments (only possible if they are the first 4
    // stores, else we always have one send commitment because a merge is a send).
    // This is because if we have 4 commitments and try to add an 5th, we merge our
    // previous 4 into 1 before adding the next one.
    // Therefore, we do the following:
    // 1. Fetch the last 4 store txs.
    // 2. Fetch the sendTx starting at latest sendNonce.
    // 3. Return latest send that was found and all stores with sendNonce === latestSend.sendNonce
    // (i.e. stores that were made after that send)
    // Param beforeSend is a an older SendTx prior to which we want to find out what active commitments went into it
    public async getActiveTxs(tokenType: TokenType, beforeSend?: SendTx): Promise<ElusivTransaction[]> {
        const mostRecentTxs = (await this.fetchTxs(SEND_ARITY, tokenType, beforeSend?.nonce));
        if (mostRecentTxs.length === 0) return [];
        mostRecentTxs[0].transactionStatus = 'CONFIRMED';

        // Fetch either all SEND_ARITY transactions if we don't have any sends or fetch until the most recent send
        for (let i = 0; i < mostRecentTxs.length; i++) {
            const curr = mostRecentTxs[i];
            // Return until the send if
            if (curr?.txType === 'SEND') {
                // Have to be careful because the most recent send can be at the same nonce as a topup, in which case the topup
                // wasn't used yet.
                const res = mostRecentTxs.slice(0, i + 1);
                const sameNonceTopupsNotIncluded = mostRecentTxs.filter((tx) => tx.txType === 'TOPUP'
                    && tx.nonce === curr.nonce
                    // Check this topup isn't already included
                    && res.find((resTx) => tx.signature !== undefined && resTx.signature === tx.signature) === undefined);

                // TODO: DO THE SAME THING FOR PRIVATE BALANCE FETCHING TOO
                // i + 1 because we want to include the send tx too
                return [...res, ...sameNonceTopupsNotIncluded];
            }
        }

        // No sends? Return everything
        return mostRecentTxs;
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
