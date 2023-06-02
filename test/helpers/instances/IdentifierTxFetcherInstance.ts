import {
    ConfirmedSignatureInfo, Connection, ParsedTransactionWithMeta, Transaction,
} from '@solana/web3.js';
import { NoncedTxResponse, IdentifierTxFetcher } from '../../../src/sdk/txManagers/IdentifierTxFetcher.js';
import { TxHistoryConnectionDriver } from '../drivers/TxHistoryConnectionDriver.js';
import { ElusivTransaction } from '../../../src/sdk/transactions/ElusivTransaction.js';
import { Pair } from '../../../src/sdk/utils/Pair.js';
import { RVKWrapper } from '../../../src/sdk/clientCrypto/RVKWrapper.js';

export class IdentifierTxFetcherInstance extends IdentifierTxFetcher {
    private txs: ElusivTransaction[];

    constructor(txs: ElusivTransaction[], rvk: RVKWrapper) {
        const connection: TxHistoryConnectionDriver = new TxHistoryConnectionDriver();

        for (let i = 0; i < txs.length; i++) {
            const tx = txs[i];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const pair: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo> = {
                fst: TxHistoryConnectionDriver.txToParsedTx(new Transaction({
                    feePayer: tx.identifier,
                    blockhash: '41PJSCPu5v8VLgBH5fnNKFLEjrnBP2xLwRAX6wTjAy6R',
                    lastValidBlockHeight: 170344741,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                }), undefined, tx.signature!.err),
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                snd: tx.signature!,

            };
            connection.addNewTxs(tx.identifier, [pair]);
        }
        super(connection as unknown as Connection, 'devnet', rvk);
        this.txs = txs;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected override async txResponseToElusivTx(txRes: NoncedTxResponse): Promise<ElusivTransaction[]> {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const res = this.txs.find((txI) => txI.signature!.signature === txRes.txResponse[0].snd.signature)!;
        return [res];
    }
}
