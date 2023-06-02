import { ElusivTransaction } from '../../../src/sdk/transactions/ElusivTransaction.js';
import { TransactionCacher } from '../../../src/sdk/txManagers/TransactionCacher.js';
import { TokenType } from '../../../src/public/tokenTypes/TokenType';

export class TxCacherInstance extends TransactionCacher {
    public cacheWrapper(txs: ElusivTransaction[]): void {
        return super.cache(txs);
    }

    public cacheOverwriteWrapper(txs: ElusivTransaction[]): void {
        return super.cacheOverwrite(txs);
    }

    public isCachedWrapper(tx: ElusivTransaction): boolean {
        return super.isCached(tx);
    }

    public getAtNonceFromCacheWrapper(nonce: number): ElusivTransaction[] | undefined {
        return super.getAtNonceFromCache(nonce);
    }

    public getCachedTxsWrapper(tokenType?: TokenType, fromNonce = 0, toNonce: number | undefined = undefined): (ElusivTransaction | undefined)[] {
        return super.getCachedTxs(tokenType, fromNonce, toNonce);
    }
}
