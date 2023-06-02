import { TokenType } from '../../../src/public/tokenTypes/TokenType.js';
import { ElusivTransaction } from '../../../src/sdk/transactions/ElusivTransaction.js';
import { PartialSendTx } from '../../../src/sdk/transactions/SendTx.js';
import { PartialStoreTx } from '../../../src/sdk/transactions/StoreTx.js';

export class TxManagerDriver {
    private txs: (ElusivTransaction | undefined)[];

    constructor(txs: (ElusivTransaction | undefined)[]) {
        this.txs = txs;
    }

    public async fetchTxs(count: number, tokenType?: TokenType, before?: number): Promise<(ElusivTransaction | undefined)[]> {
        return this.txs.filter((tx) => tx === undefined || before === undefined || tx.nonce < before)
            .map((tx) => {
                if (tokenType === undefined || tx === undefined || tx.tokenType === tokenType) return tx;
                return undefined;
            }).concat(new Array(count)).slice(0, count);
    }

    public async getPrivateBalance(tokenType: TokenType, before? : number): Promise<bigint> {
        const beforeInner = before === undefined ? Number.MAX_SAFE_INTEGER : before;
        const t = this.txs.filter((tx) => tx !== undefined) as ElusivTransaction[];
        return t.filter((tx) => tx.tokenType === tokenType && tx.nonce < beforeInner)
            .reduce((acc, tx) => {
                if (tx.txType === 'TOPUP') return acc + (tx as PartialStoreTx).amount;
                if (tx.txType === 'SEND') return acc - (tx as PartialSendTx).amount - (tx as PartialSendTx).fee;
                return BigInt(0);
            }, BigInt(0));
    }

    public async getMostRecentNonce(): Promise<number> {
        return this.txs.filter((tx) => tx !== undefined).reduce((acc, tx) => Math.max(acc, (tx as ElusivTransaction).nonce), -1);
    }
}
