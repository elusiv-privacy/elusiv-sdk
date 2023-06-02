import {
    Cluster,
    ConfirmedSignatureInfo, Connection, GetVersionedTransactionConfig, ParsedTransactionWithMeta, PublicKey,
} from '@solana/web3.js';
import { RVKWrapper } from '../clientCrypto/RVKWrapper.js';
import { ElusivTransaction } from '../transactions/ElusivTransaction.js';
import { Pair } from '../utils/Pair.js';
import { isTruthy, zipSameLength } from '../utils/utils.js';
import { AbstractTxManager } from './AbstractTxManager.js';
import { ResponseConverter } from './ResponseConverter.js';

export type SigResponse = Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo>;

export type NoncedTxResponse = {
    txResponse: SigResponse[],
    nonce: number,
    idPubKey: PublicKey,
}

export type IdentifiedSigs = {
    sigs: ConfirmedSignatureInfo[],
    nonce: number,
    idKey: PublicKey,
}

// Range is [x:y) i.e. x is inclusive and y is exclusive
export type Range = {
    start: number;
    end: number;
}

export abstract class IdentifierTxFetcher extends AbstractTxManager {
    private connection: Connection;

    protected cluster: Cluster;

    constructor(connection: Connection, cluster: Cluster, rvk: RVKWrapper) {
        super(rvk);
        this.connection = connection;
        this.cluster = cluster;
    }

    // Pair<nonce, isCached>
    protected override async getTxsFromNonces(nonces: readonly Pair<number, boolean>[]): Promise<ElusivTransaction[]> {
        const sigPromises: (Promise<ConfirmedSignatureInfo[]>)[] = [];
        const idKeys: PublicKey[] = [];

        for (let i = 0; i < nonces.length; i++) {
            // Only fetch if not cached
            if (!nonces[i].snd) {
                idKeys[i] = this.rvk.getIdentifierKey(nonces[i].fst);
                sigPromises[i] = this.getTxSigsForIdKeyFromBlockchain(idKeys[i]);
            }
            else {
                sigPromises[i] = Promise.resolve([]);
            }
        }

        const sigs: IdentifiedSigs[] = (await Promise.all(sigPromises)).map((sig, i) => ({ sigs: sig, nonce: nonces[i].fst, idKey: idKeys[i] }));
        return this.sigsToElusivTxs(sigs);
    }

    private async getTxSigsForIdKeyFromBlockchain(idKey: PublicKey): Promise<ConfirmedSignatureInfo[]> {
        // Filter out failed txs
        return this.connection.getConfirmedSignaturesForAddress2(idKey).then((res) => res.filter((sig) => sig.err === null));
    }

    // Convert an array of transaction signatures to an array of tx responses
    private async sigsToElusivTxs(sigs: readonly IdentifiedSigs[]): Promise<ElusivTransaction[]> {
        if (sigs.length === 0) return [];
        const config: GetVersionedTransactionConfig = { commitment: 'finalized', maxSupportedTransactionVersion: 0 };

        // The getTransactions() call only wants the raw signatures as a string array, so prepare them accordingly
        const preparedSigs = sigs
            // Get just sigs (no nonce)
            .map((sn) => sn.sigs)
            // Concat all sigs into a 1-dimensional array
            .reduce((s1, s2) => s1.concat(s2))
            // Get just the signatures as strings
            .map((cs) => cs.signature);

        // Keep in mind, each ConfirmedSignatureInfo[] fits with exactly one nonce, i.e. 2 sigs can belong to the same nonce.
        // Create ranges so that once we get back the transactions in a 1-dimensional array we can map these transactions back to the
        // same nonces

        // Find in what range each nonce will be mapped to in the resulting 1-dimensional transaction array
        const txRanges: Range[] = [];

        // Place where the previous nonce left off
        let previousEnd = 0;
        for (let i = 0; i < sigs.length; i++) {
            txRanges[i] = {
                start: previousEnd,
                end: previousEnd + sigs[i].sigs.length,
            };

            previousEnd += sigs[i].sigs.length;
        }

        // No nonces in use? Then there won't be any transactions to find either
        if (previousEnd === 0) return [];

        // Get raw tx responses
        const realTxs = await this.connection.getParsedTransactions(preparedSigs, config);

        const totalTxResponses: (NoncedTxResponse | undefined)[] = [];

        // Parse from 1-dimensional array back to mapping each nonce to the responses corresponding to its sigs
        for (let i = 0; i < txRanges.length; i++) {
            const range = txRanges[i];
            const relevantResp = realTxs.slice(range.start, range.end);

            // If any of the responses for a nonce is empty
            if (!relevantResp.every(isTruthy)) {
                totalTxResponses[i] = undefined;
            }
            else {
                const resp = zipSameLength(relevantResp, sigs[i].sigs);
                totalTxResponses[i] = { txResponse: resp, nonce: sigs[i].nonce, idPubKey: sigs[i].idKey };
            }
        }

        return this.txResponsesToElusivTxs(totalTxResponses);
    }

    // Convert an array of TransactionResponses to an array of ElusivTransactions. If any of the responses are undefined, the corresponding spot
    // the resulting array is just empty. E.g. [[response1a, response1b], undefined, response2] -> [elusivTx1a, elusivTx1b, elusivTx2]
    private async txResponsesToElusivTxs(txs: readonly (NoncedTxResponse | undefined)[]): Promise<ElusivTransaction[]> {
        // Filter out undefined responses and responses with no transactions and map them to ElusivTransactions
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const res = await Promise.all(txs.filter((tx) => isTruthy(tx) && tx.txResponse.length !== 0).map((tx) => this.txResponseToElusivTx(tx!)));
        return res.flat();
    }

    protected async txResponseToElusivTx(txRes: NoncedTxResponse): Promise<ElusivTransaction[]> {
        return ResponseConverter.txResponseToElusivTxs(this.rvk, this.cluster, txRes);
    }
}
