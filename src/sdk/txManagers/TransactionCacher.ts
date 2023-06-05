import { equalsUint8Arr } from 'elusiv-serialization';
import { ElusivTransaction } from '../transactions/ElusivTransaction.js';
import { IndexedMultiCacher } from '../utils/caching/IndexedMultiCacher.js';
import { TokenType } from '../../public/tokenTypes/TokenType.js';

export abstract class TransactionCacher {
    // Cache of all tx fetched so far (mixed token types)
    private fetchedTxs: IndexedMultiCacher<ElusivTransaction>;

    constructor() {
        const mapTxToNonce = (tx: ElusivTransaction) => tx.nonce;
        const equal = (tx1: ElusivTransaction, tx2: ElusivTransaction) => tx1.nonce === tx2.nonce && equalsUint8Arr(tx1.commitmentHash, tx2.commitmentHash);
        this.fetchedTxs = new IndexedMultiCacher<ElusivTransaction>(mapTxToNonce, equal);
    }

    protected cache(txs: ElusivTransaction[]): void {
        this.fetchedTxs.cache(txs);
    }

    protected cacheOverwrite(txs: ElusivTransaction[]): void {
        this.fetchedTxs.cacheOverwrite(txs);
    }

    protected isCached(tx: ElusivTransaction): boolean {
        return this.fetchedTxs.isCached(tx);
    }

    protected getAtNonceFromCache(nonce: number): ElusivTransaction[] | undefined {
        return this.fetchedTxs.readAtIndex(nonce);
    }

    // Slicing from 0 to undefined returns the full array. Slicing to null returns an empty array
    protected getCachedTxs(tokenType?: TokenType, fromNonce = 0, toNonce: number | undefined = undefined): ElusivTransaction[] {
        const txMixed = this.getAllCachedTxs(fromNonce, toNonce).flat().filter((tx) => tx !== undefined) as ElusivTransaction[];
        // No tokentype specified? Return all tx
        if (tokenType === undefined) return txMixed;
        // Else filter by just the tokentype requested
        return txMixed.filter((tx) => tx.tokenType === tokenType);
    }

    private getAllCachedTxs(fromNonce = 0, toNonce: number | undefined = undefined): (ElusivTransaction | undefined)[] {
        const res = this.fetchedTxs.getCachedValues().slice(fromNonce, toNonce);
        return res.flat();
    }
}
