import { DEFAULT_FETCH_BATCH_SIZE } from '../../constants.js';
import { RVKWrapper } from '../clientCrypto/RVKWrapper.js';
import { ElusivTransaction } from '../transactions/ElusivTransaction.js';
import { Pair } from '../utils/Pair.js';
import { isTruthy, reverseArr } from '../utils/utils.js';
import { TransactionCacher } from './TransactionCacher.js';

export type TxFetchingInputs = {
    batchSize: number,
    before: number,
    after: number,
}

// Range is (x:y) i.e. both ends exclusive
export type CachedRange = {
    before: number,
    after: number,
}

export abstract class AbstractTxManager extends TransactionCacher {
    protected rvk: RVKWrapper;

    constructor(rvk: RVKWrapper) {
        super();
        this.rvk = rvk;
    }

    // (Case 0): count = 0 => just return []
    // Case 1: no before, no after, count > 0
    // 1. Fetch newest transactions, insert into cache.
    // 2. GOTO Case 2, with before set to the latest nonce/tx sig and after set to nonce -1 and null tx sig
    // Case 2: existing before, count > 0
    // 1. If continuous amount of tx of size count exist and specified token type with nonce before the given nonce, return from cache
    // 2. Else find the first missing nonce, and fetch from there and check step 1 again.
    // 3. If no first missing nonce can be found, return
    // Case 3: existing after, count > 0
    // 1. If continuous amount of tx of size count exist and specified token type with nonce after the given nonce, return from cache
    // 2. Else find the first missing nonce, and fetch from there and check step 1 again.
    // 3. If no first missing nonce can be found, return

    // Allows fetching tx optionally prior to some transactions. Expects the store nonce at that time to also be provided. Before param is then Pair<ConfirmedSignatureInfo,storeNonce>.
    protected async getTxs(
        count?: number,
        before: number | undefined = undefined,
        batchSize: number = DEFAULT_FETCH_BATCH_SIZE,
    ): Promise<(ElusivTransaction | undefined)[]> {
        const latestCachedNonce = this.getLatestCachedNonce();

        let cachedRange: CachedRange = before === undefined ? { before: Number.MAX_SAFE_INTEGER, after: -1 } : { before, after: -1 };

        // No need to fetch latest transactions if we're only fetching before a nonce that's in cache already anyway
        if (before === undefined || before > latestCachedNonce) {
            cachedRange = await this.getLatestTransactionsIntoCache(latestCachedNonce);
        }

        const inputs = await AbstractTxManager.prepareTxFetchingParams(cachedRange, count, batchSize, before);

        await this.fetchTxsIntoCache(inputs);

        return AbstractTxManager.getTxsInNonceRange(this.getCachedTxsWrapper(before, inputs.after), count);
    }

    protected static getTxsInNonceRange(txs: (ElusivTransaction | undefined)[], count?: number): ElusivTransaction[] {
        const filtered = txs.filter(isTruthy);
        if (filtered.length === 0) return [];
        if (count === undefined) return filtered;
        const res = filtered.slice(0, count);
        // Handle edge case where last nonce has multiple txs. In that case find all the following txs with the same nonce and add them to the result
        if (count < filtered.length && filtered[count - 1].nonce === filtered[count].nonce) {
            let i = count;
            while (i < filtered.length && filtered[i].nonce === filtered[count].nonce) {
                res.push(filtered[i]);
                i += 1;
            }
        }
        return res;
    }

    /*
    Inner Methods
    */

    private static async prepareTxFetchingParams(
        preFetchedRange: CachedRange,
        count?: number,
        batchSize: number = DEFAULT_FETCH_BATCH_SIZE,
        before: number | undefined = undefined,
    ): Promise<TxFetchingInputs> {
        // We already fetched latesttxs, no need to fetch those again
        const defaultBefore = AbstractTxManager.getDefaultBefore(preFetchedRange);
        // Case where the user supplies a before greater than latest tx nonce, that's why Math.min
        const beforeInner = before === undefined ? defaultBefore : Math.min(before, defaultBefore);

        const after = count === undefined ? AbstractTxManager.getDefaultAfter() : beforeInner - count - 1;
        const afterInner = Math.max(after, -1);

        return {
            batchSize,
            before: beforeInner,
            after: afterInner,
        };
    }

    private async fetchTxsIntoCache(inputs: TxFetchingInputs): Promise<ElusivTransaction[]> {
        const fetchedBatchPromises: Promise<ElusivTransaction[]>[] = [];
        let counter = inputs.before - 1;

        while (counter > inputs.after) {
            // If we have this tx already in cache, continue
            if (this.isCachedNonce(counter)) {
                counter -= 1;
            }
            // If we don't have it in cache, try to fetch it
            else {
                // Fetch the next batch of txs before then
                fetchedBatchPromises.push(this.getAndCacheNextTxBatch(
                    inputs.batchSize,
                    counter + 1,
                    inputs.after,
                ));

                // No need to check the next batchsize txs, as these either are already in cache or will be through our fetch
                counter -= inputs.batchSize;
            }
        }

        // Await all our fetches to complete
        await Promise.all(fetchedBatchPromises);

        // Return the txs from cache the caller asked for
        return this.getCachedTxsWrapper(inputs.before, inputs.after);
    }

    private getLatestCachedTx(): ElusivTransaction | undefined {
        const cached = this.getCachedTxsWrapper();
        return cached[0];
    }

    private static getDefaultBefore(preFetchedRange: CachedRange): number {
        return preFetchedRange.before;
    }

    private static getDefaultAfter(): number {
        // We are fetching *after* this nonce, so we want to start at -1 to include everything by default
        return -1;
    }

    // Our cache implementation does not deal with inversed order like we do here (i.e. oldest tx is at lowest in cache)
    // helper function to provide same interface
    private getCachedTxsWrapper(beforeTx?: number, afterTx?: number): ElusivTransaction[] {
        // After is exclusive, cacher is not:
        const fromTx = afterTx === undefined ? undefined : afterTx + 1;
        return reverseArr(this.getCachedTxs(undefined, fromTx, beforeTx));
    }

    private isCachedNonce(nonce: number): boolean {
        return this.getCachedTxsWrapper(nonce + 1, nonce - 1)[0] !== undefined;
    }

    protected async getAndCacheNextTxBatch(batchSize: number, before: number, after: number): Promise<ElusivTransaction[]> {
        const afterInner = Math.max(after, before - batchSize - 1);
        return this.fetchAndCacheTxsInRange(before, afterInner);
    }

    private fetchAndCacheTxsInRange(before: number, after: number): Promise<(ElusivTransaction)[]> {
        return this.fetchTxsInRange(before, after).then((txs) => {
            this.cache(txs.filter((tx) => tx !== undefined) as ElusivTransaction[]);
            return txs;
        });
    }

    private async fetchTxsInRange(before: number, after: number): Promise<ElusivTransaction[]> {
        const nonces: Pair<number, boolean>[] = [];

        // Initialize all fetches concurrently
        for (let i = 0; i < before - (after + 1); i++) {
            nonces[i] = { fst: after + 1 + i, snd: this.isCachedNonce(after + 1 + i) };
        }

        return this.getTxsFromNonces(nonces, this.rvk);
    }

    private getLatestCachedNonce(): number {
        const latestCachedTx = this.getLatestCachedTx();
        return latestCachedTx === undefined ? -1 : latestCachedTx.nonce;
    }

    private async getLatestTransactionsIntoCache(latestCachedNonce: number, stepSize = DEFAULT_FETCH_BATCH_SIZE): Promise<CachedRange> {
        let i = latestCachedNonce;

        let txBatch: (ElusivTransaction | undefined)[];

        do {
            // Need to use await inside of loop because loop length depends on the result of the fetch
            // eslint-disable-next-line no-await-in-loop
            txBatch = await this.fetchAndCacheTxsInRange(i + stepSize + 1, i);
            i += stepSize;
        }
        while (txBatch.length !== 0);

        return { after: latestCachedNonce, before: this.getLatestCachedNonce() + 1 };
    }

    protected abstract getTxsFromNonces(nonces: Pair<number, boolean>[], rvk: RVKWrapper): Promise<ElusivTransaction[]>;
}
