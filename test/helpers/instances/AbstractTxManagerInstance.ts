import { DEFAULT_FETCH_BATCH_SIZE } from '../../../src/constants.js';
import { RVKWrapper } from '../../../src/sdk/clientCrypto/RVKWrapper.js';
import { ElusivTransaction } from '../../../src/sdk/transactions/ElusivTransaction.js';
import { AbstractTxManager } from '../../../src/sdk/txManagers/AbstractTxManager.js';
import { Pair } from '../../../src/sdk/utils/Pair.js';

export class AbstractTxManagerInstance extends AbstractTxManager {
    private txs: ElusivTransaction[];

    // Newest txs at index 0
    public constructor(rvk: RVKWrapper, sortedTxs: ElusivTransaction[]) {
        super(rvk);
        this.txs = sortedTxs;
    }

    public async getTxsWrapper(
        count?: number,
        before: number | undefined = undefined,
        batchSize: number = DEFAULT_FETCH_BATCH_SIZE,
    ): Promise<(ElusivTransaction | undefined)[]> {
        return super.getTxs(count, before, batchSize);
    }

    public prependTransaction(txs: ElusivTransaction[]): void {
        this.txs = txs.concat(this.txs);
    }

    public cacheTransactions(txs: ElusivTransaction[]): void {
        super.cache(txs);
    }

    protected async getTxsFromNonces(nonces: Pair<number, boolean>[]): Promise<ElusivTransaction[]> {
        const res = await Promise.all(nonces.map((nonce) => this.getTxFromNonce(nonce.fst)));
        return res.filter((tx) => tx !== undefined) as ElusivTransaction[];
    }

    private async getTxFromNonce(nonce: number): Promise<ElusivTransaction | undefined> {
        return this.txs.find((tx) => tx.nonce === nonce);
    }
}
