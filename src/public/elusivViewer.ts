import {
    Cluster, ConfirmedSignatureInfo, Connection, GetVersionedTransactionConfig, ParsedTransactionWithMeta, PublicKey,
} from '@solana/web3.js';
import { Poseidon } from 'elusiv-cryptojs';
import { hexToUint8Array } from 'elusiv-serialization';
import { RVKWrapper } from '../sdk/clientCrypto/RVKWrapper.js';
import { CommitmentManager } from '../sdk/paramManagers/CommitmentManager.js';
import { TreeManager } from '../sdk/paramManagers/TreeManager.js';
import { TransactionManager } from '../sdk/txManagers/TransactionManager.js';
import { getOwnerFromAcc } from '../sdk/utils/pubKeyUtils.js';
import {
    getAssociatedTokenAcc, getMintAccount, getTokenTypes,
} from './tokenTypes/TokenTypeFuncs.js';
import { PrivateTxWrapper, SendTxWrapper, toPrivateTxWrapper } from './transactionWrappers/TxWrappers.js';
import { getElusivFeeCollectorAddress, getElusivPoolAddress, getElusivProgramId } from './WardenInfo.js';
import { sleep } from '../sdk/utils/utils.js';
import { TokenType } from './tokenTypes/TokenType.js';

export class ElusivViewer {
    // The cluster this instance is on
    protected readonly cluster: Cluster;

    /**
     * Internal
     */
    protected connection: Connection;

    /**
     * Internal
     */
    protected txManager: TransactionManager;

    /**
     * Internal
     */
    protected commManager: CommitmentManager;

    protected constructor(
        cluster: Cluster,
        connection: Connection,
        txManager: TransactionManager,
        commManager: CommitmentManager,
    ) {
        this.cluster = cluster;
        this.connection = connection;
        this.txManager = txManager;
        this.commManager = commManager;
    }

    /**
     * Instantiate the elusiv viewer instance
     * @param rootViewingKey Root viewing key in hex. Remember, this allows anyone to decrypt/view (but not spend) the user's private assets,
     * so handle this very carefully. Should be treated like a password, no reason to show to user or even store in normal case.
     * @param connection Connection object to use to make calls to solana blockchain
     * @param cluster Cluster to use (e.g. 'devnet')
     */
    public static async getElusivViewerInstance(
        rootViewingKey: string,
        connection: Connection,
        cluster: Cluster,
    ): Promise<ElusivViewer> {
        // Intialize poseidon for cryptography
        const poseidonSetup = Poseidon.setupPoseidon();
        const txManager = TransactionManager.createTxManager(connection, cluster, new RVKWrapper(hexToUint8Array(rootViewingKey)));
        const treeManager = TreeManager.createTreeManager(connection, cluster);
        const commManager = CommitmentManager.createCommitmentManager(treeManager, txManager);
        const result = new ElusivViewer(cluster, connection, txManager, commManager);
        // Finish initializing poseidon
        await poseidonSetup;
        return result;
    }

    /**
     * Get at most the last count private txs, where the tx at index 0 is the most recent
     * @param count Maximum number of txs to fetch (could be less if we ask to fetch more transactions then exist)
     * @param tokenType if none is specified, gets all last [count] transactions, if not
     * gets the last [count] transactions using the token of type tokenType
     * @returns Ordered array of transactions, where the most recent transactions is at index 0 and the oldest transaction is at the end.
     */
    public async getPrivateTransactions(count: number, tokenType?: TokenType): Promise<PrivateTxWrapper[]> {
        const txs = (await this.txManager.fetchTxs(count, tokenType));
        if (txs.length === 0) return [];
        // We still need to get the transaction status of the latest transaction
        const latestTx = txs[0];
        const isInsertedLatest = this.commManager.isCommitmentInserted(latestTx.commitmentHash, latestTx.merkleStartIndex);
        const res = [];
        for (const tx of txs) {
            res.push(toPrivateTxWrapper(tx));
        }
        res[0].transactionStatus = await isInsertedLatest ? 'CONFIRMED' : latestTx.transactionStatus;

        // Finally map the recipient to the owner of the recipient's TA if it is a send transaction
        return Promise.all(res.map(async (tx) => {
            if (tx.txType === 'SEND' && (tx as SendTxWrapper).recipient !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const taOwner = await getOwnerFromAcc(this.connection, this.cluster, (tx as SendTxWrapper).recipient!, tx.tokenType);
                const edited = {
                    ...tx,
                    recipient: taOwner,
                } as SendTxWrapper;
                return edited;
            }
            return tx;
        }));
    }

    /**
     * Get the latest private balance of the specified token type
     * @param tokenType Type of token to fetch private balance for
     * @returns The current private balance
     */
    public getLatestPrivateBalance(tokenType: TokenType): Promise<bigint> {
        return this.txManager.getPrivateBalance(tokenType);
    }

    /**
     * Get the current amount of funds in the pool for the specified token type
     * @param cluster Cluster on which to get the pool size
     * @param conn Connection to use to make calls to solana blockchain
     * @param tokenType Type of token to fetch pool size for
     * @returns The current pool size
     */
    public static getCurrentPoolSize(cluster: Cluster, conn: Connection, tokenType: TokenType): Promise<number> {
        const poolAcc = getElusivPoolAddress(cluster);
        return getAssocTokenBalance(cluster, conn, tokenType, poolAcc, true);
    }

    /**
     * Estimate the number of transactions that have been made in the last specified time frame via elusiv.
     * This is a heuristic, and is not guaranteed to be accurate. The reason it exists is because {@link getTxsCountLastTime} is
     * expensive in terms of rpc calls, and this is a significantly cheaper alternative.
     * @param cluster Cluster on which to get the transaction count
     * @param conn Connection to use to make calls to solana blockchain
     * @param timeSec The number of seconds in the past to look at
     * @param tokenType Type of token to fetch transaction count for
     * @param msBetweenBatches The number of milliseconds to sleep between each batch of sigs fetched. This is to avoid spamming the RPC. Defaults to 0.
     * @returns The estimated number of transactions (i.e. topups and sends, not normal solana txs) in the last specified time
     */
    public static async estimateTxsCountLastTime(cluster: Cluster, conn: Connection, timeSec: number, tokenType?: TokenType, msBetweenBatches = 0): Promise<number> {
        const elusivSigsLastTime = await ElusivViewer.getElusivSigsLastTime(cluster, conn, timeSec, msBetweenBatches, tokenType);

        // To avoid spamming the RPC by fetching an checking each transaction, we heuristically calculate how many elusiv transactions we have.
        // We fetch sigs based on fee collector, which is used exactly once per topup and twice per send, so 1.5 on average.
        return Math.ceil(elusivSigsLastTime.length / 1.5);
    }

    /**
     * Get the number of transactions that have been made in the last specified time frame via elusiv. This is a expensive & slow
     * operation in terms of rpc calls, and should be used only if you truly need the *EXACT* amount. If you only need an estimate,
     * use {@link estimateTxsCountLastTime} instead.
     * @param cluster Cluster on which to get the transaction count
     * @param conn Connection to use to make calls to solana blockchain
     * @param timeSec The number of seconds in the past to look at
     * @param tokenType Type of token to fetch transaction count for
     * @param msBetweenBatches The number of milliseconds to sleep between each batch of sigs fetched. This is to avoid spamming the RPC. Defaults to 0.
     * @returns The number of elusiv transactions (i.e. topups and sends, not normal solana txs) in the last specified time
     */
    public static async getTxsCountLastTime(cluster: Cluster, conn: Connection, timeSec: number, tokenType?: TokenType, msBetweenBatches = 0): Promise<number> {
        const sigs = await ElusivViewer.getElusivSigsLastTime(cluster, conn, timeSec, msBetweenBatches, tokenType);

        const config: GetVersionedTransactionConfig = { commitment: 'finalized', maxSupportedTransactionVersion: 0 };
        const txs = await conn.getTransactions(sigs.map((sig) => sig.signature), config);

        // Instructions that have the fee collector that we use to measure are StoreBaseCommitment
        // with ix id 0 (for topups) and InitVerificationTransferFee with ix id 8 (for sends)
        let txCount = 0;
        for (const tx of txs) {
            if (tx !== null) {
                const accounts = tx.transaction.message.staticAccountKeys;
                for (const ix of tx.transaction.message.compiledInstructions) {
                    if (accounts[ix.programIdIndex].equals(getElusivProgramId(cluster))) {
                        if (ix.data[0] === 0 || ix.data[0] === 8) {
                            txCount++;
                            // Break out to avoid counting the same tx twice
                            break;
                        }
                    }
                }
            }
        }

        return txCount;
    }

    /**
     * Get the volume (topups and sends) of funds of a certain tokentype that has flown through elusiv in the last specified time
     * frame. This is a expensive & slow operation in terms of rpc calls, and should be used sparingly.
     * @param cluster Cluster on which to get the transaction count
     * @param conn Connection to use to make calls to solana blockchain
     * @param timeSec The number of seconds in the past to look at
     * @param tokenType Type of token to fetch volume for
     * @param msBetweenBatches The number of milliseconds to sleep between batches of transactions. This is to avoid spamming the RPC. Defaults to 0.
     * @returns The volume in the last specified time
     */
    public static async getVolumeLastTime(cluster: Cluster, conn: Connection, timeSec: number, tokenType: TokenType, msBetweenBatches = 0): Promise<number> {
        const batchSize = 1000;
        const sigs = await ElusivViewer.getElusivSigsLastTime(cluster, conn, timeSec, msBetweenBatches, tokenType);

        const config: GetVersionedTransactionConfig = { commitment: 'finalized', maxSupportedTransactionVersion: 0 };
        const totalTxs: (ParsedTransactionWithMeta | null)[] = [];

        for (let i = 0; i < sigs.length; i += batchSize) {
            const batch = sigs.slice(i, i + batchSize);
            // eslint-disable-next-line no-await-in-loop
            const txs = await conn.getParsedTransactions(batch.map((sig) => sig.signature), config);
            totalTxs.push(...txs);
            // eslint-disable-next-line no-await-in-loop
            await sleep(msBetweenBatches);
        }

        const mint = getMintAccount(tokenType, cluster).toBase58();
        const poolAccount = getElusivPoolAddress(cluster).toBase58();

        let total = 0;

        for (const tx of totalTxs) {
            let preAmount: number | undefined;
            let postAmount: number | undefined;
            if (tokenType !== 'LAMPORTS') {
                const pre = tx?.meta?.preTokenBalances?.filter((t) => t.owner === poolAccount && t.mint === mint).map((t) => (t.uiTokenAmount.amount));
                const post = tx?.meta?.postTokenBalances?.filter((t) => t.owner === poolAccount && t.mint === mint).map((t) => (t.uiTokenAmount.amount));
                preAmount = pre && pre.length === 1 ? Number(pre[0]) : undefined;
                postAmount = post && post.length === 1 ? Number(post[0]) : undefined;
            }
            else {
                const poolAccIndex = tx?.transaction.message.accountKeys.findIndex((acc) => acc.pubkey.toBase58() === poolAccount);
                if (poolAccIndex !== undefined && poolAccIndex !== -1) {
                    const pre = tx?.meta?.preBalances;
                    const post = tx?.meta?.postBalances;
                    preAmount = pre && pre.length > poolAccIndex ? Number(pre[poolAccIndex]) : undefined;
                    postAmount = post && post.length > poolAccIndex ? Number(post[poolAccIndex]) : undefined;
                }
            }

            if (postAmount !== undefined && preAmount !== undefined) {
                total += Math.abs(postAmount - preAmount);
            }
        }

        return total;
    }

    // We query for the feecollector, as this is used exactly once per topup and twice per send (and avoids fetching less
    // than if we just used the elusiv program). This means if we have 3 sigs, that could be 1 send and one topup or 3 topups.
    private static async getElusivSigsLastTime(cluster: Cluster, conn: Connection, timeSec: number, msBetweenBatches: number, tokenType?: TokenType): Promise<ConfirmedSignatureInfo[]> {
        const untilTimeSec = Math.floor(Date.now() / 1000) - timeSec;
        let feeCollector = getElusivFeeCollectorAddress(cluster);
        // If we are looking for a specific token type, we can filter automatically filter with the associated token account.
        // For Lamports, we can't do this unfortunately, so we handle this case below.
        if (tokenType !== undefined && tokenType !== 'LAMPORTS') feeCollector = getAssociatedTokenAcc(feeCollector, tokenType, cluster, true);
        const totalSigs: ConfirmedSignatureInfo[] = [];
        let oldestSig: ConfirmedSignatureInfo | undefined;
        let oldestFilteredSig: ConfirmedSignatureInfo | undefined;
        do {
            // eslint-disable-next-line no-await-in-loop
            const sigs = await conn.getConfirmedSignaturesForAddress2(feeCollector, {
                before: oldestSig?.signature,
            });
            oldestSig = sigs[sigs.length - 1];
            const filteredSigs = sigs.filter((s) => s.blockTime && s.blockTime > untilTimeSec);
            oldestFilteredSig = filteredSigs[filteredSigs.length - 1];

            totalSigs.push(...filteredSigs);

            // eslint-disable-next-line no-await-in-loop
            await sleep(msBetweenBatches);
            // If the oldest sig we fetched is the same as the oldest filtered sig, there might still be older sigs, so we fetch again
        } while (oldestFilteredSig !== undefined && oldestFilteredSig.signature === oldestSig.signature);

        // Unfortunately there is no account that is only used by the lamports token type, so filtering for just it requires fetching txs for all token types
        // and filtering them out. This is expensive, so we only do it if the user explicitly asks for it.
        if (tokenType === 'LAMPORTS') {
            const nonLamportTxs = getTokenTypes().map((t) => (t !== 'LAMPORTS' ? ElusivViewer.getElusivSigsLastTime(cluster, conn, timeSec, msBetweenBatches, t) : Promise.resolve([])));
            const nonLamportSigs = await Promise.all(nonLamportTxs);
            return totalSigs.filter((s) => !nonLamportSigs.some((ns) => ns.some((n) => n.signature === s.signature)));
        }

        return totalSigs;
    }
}

/** Get the balance in the specified tokentype using ATAs */
export async function getAssocTokenBalance(cluster: Cluster, conn: Connection, tokenType: TokenType, pk: PublicKey, allowOwnerOffCurve = false): Promise<number> {
    if (tokenType === 'LAMPORTS') return conn.getBalance(pk);
    const assocAcc = getAssociatedTokenAcc(pk, tokenType, cluster, allowOwnerOffCurve);
    const res = (await conn.getTokenAccountBalance(assocAcc));
    return Number(res.value.amount);
}
