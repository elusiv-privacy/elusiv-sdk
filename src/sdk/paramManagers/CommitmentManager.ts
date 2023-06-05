import {
    Commitment, IncompleteCommitment, Poseidon, ReprScalar,
} from 'elusiv-cryptojs';
import { equalsUint8Arr } from 'elusiv-serialization';
import { PartialSendTx, SendTx } from '../transactions/SendTx.js';
import { PartialStoreTx } from '../transactions/StoreTx.js';
import { TreeManager } from './TreeManager.js';
import { TransactionManager } from '../txManagers/TransactionManager.js';
import {
    INVALID_SIZE, INVALID_TX_TYPE, SEND_ARITY, TIMEOUT_ERR,
} from '../../constants.js';
import { getNumberFromTokenType } from '../../public/tokenTypes/TokenTypeFuncs.js';
import { buildCommitmentSet, GeneralSet } from '../utils/GeneralSet.js';
import { ElusivTransaction } from '../transactions/ElusivTransaction.js';
import { zipSameLength } from '../utils/utils.js';
import { SeedWrapper } from '../clientCrypto/SeedWrapper.js';
import { TokenType } from '../../public/tokenTypes/TokenType.js';

export class CommitmentManager {
    txManager: TransactionManager;

    treeManager: TreeManager;

    private constructor(txManager: TransactionManager, treeManager: TreeManager) {
        this.txManager = txManager;
        this.treeManager = treeManager;
    }

    public static createCommitmentManager(
        treeManager: TreeManager,
        txManager: TransactionManager,
    ): CommitmentManager {
        return new CommitmentManager(txManager, treeManager);
    }

    public async getIncompleteCommitmentsForTxs(txs: ElusivTransaction[], seedWrapper: SeedWrapper): Promise<{ commitments: GeneralSet<IncompleteCommitment>, startIndices: (number | undefined)[] }> {
        const activeCommitments: GeneralSet<IncompleteCommitment> = buildCommitmentSet();
        const startIndices: (number | undefined)[] = [];
        const sendTxCommitments: Promise<IncompleteCommitment>[] = [];

        txs.forEach((tx) => {
            if (tx.txType === 'TOPUP') {
                const comm = CommitmentManager.buildCommitmentForPartialStore(tx as PartialStoreTx, seedWrapper);
                activeCommitments.add(comm);
                startIndices.push((tx as PartialStoreTx).merkleStartIndex);
            }
            else if (tx.txType === 'SEND') {
                sendTxCommitments.push(this.getCommitmentForPartialSend(tx as PartialSendTx, seedWrapper));
                startIndices.push((tx as SendTx).merkleStartIndex);
            }
        });

        const sendTxCommitmentsRes = await Promise.all(sendTxCommitments);
        sendTxCommitmentsRes.forEach((comm) => {
            activeCommitments.add(comm);
        });

        return { commitments: activeCommitments, startIndices };
    }

    public async getActiveCommitments(tokenType: TokenType, seedWrapper: SeedWrapper, beforeSend?: SendTx): Promise<GeneralSet<Commitment>> {
        const activeTxs = await this.getActiveTxs(tokenType, seedWrapper, beforeSend);
        const activeComms = await this.getIncompleteCommitmentsForTxs(activeTxs, seedWrapper);
        return this.activateCommitments(activeComms.commitments, activeComms.startIndices);
    }

    public static needMerge(activeCommitments: IncompleteCommitment[]): boolean {
        if (activeCommitments.length > SEND_ARITY) throw new Error(INVALID_SIZE('active commitmetns', activeCommitments.length, SEND_ARITY));

        return activeCommitments.length === SEND_ARITY;
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
    public async getActiveTxs(tokenType: TokenType, seedWrapper: SeedWrapper, beforeSend?: SendTx): Promise<ElusivTransaction[]> {
        const mostRecentTxs = (await this.txManager.fetchTxs(SEND_ARITY, tokenType, beforeSend?.nonce)).slice(0, SEND_ARITY);
        if (mostRecentTxs.length === 0) return [];
        // We need to manually check if the latest tx is confirmed
        if (!(await this.isTransactionConfirmed(mostRecentTxs[0], seedWrapper))) {
            throw new Error('Cannot create transaction while still waiting for tx to confirm');
        }
        mostRecentTxs[0].transactionStatus = 'CONFIRMED';

        // Fetch either all SEND_ARITY transactions if we don't have any sends or fetch until the most recent send
        for (let i = 0; i < mostRecentTxs.length; i++) {
            // Return until the send if
            if (mostRecentTxs[i]?.txType === 'SEND') {
                // i + 1 because we want to include the send tx too
                return mostRecentTxs.slice(0, i + 1);
            }
        }

        // No sends? Return everything
        return mostRecentTxs;
    }

    public async isCommitmentInserted(commitmentHash: ReprScalar, startingIndex = 0): Promise<boolean> {
        return this.treeManager.hasCommitment(commitmentHash, startingIndex);
    }

    public async isTransactionConfirmed(tx: ElusivTransaction, seedWrapper: SeedWrapper): Promise<boolean> {
        return tx.txType === 'TOPUP'
            ? this.isCommitmentInserted(CommitmentManager.buildCommitmentForPartialStore(tx as PartialStoreTx, seedWrapper).getCommitmentHash(), (tx as PartialStoreTx).merkleStartIndex)
            : this.getCommitmentForTransaction(tx, seedWrapper).then((comm) => this.isCommitmentInserted(comm.getCommitmentHash(), (tx as SendTx).merkleStartIndex));
    }

    // "Activate" an incomplete commitment (i.e. add the data to its tree position)
    private async activateCommitmentsInner(ics: IncompleteCommitment[], startingIndices: number[]): Promise<Commitment[]> {
        const res = await this.treeManager.getCommitmentsInfo(
            zipSameLength(ics.map((ic) => ic.getCommitmentHash()), startingIndices),
        );
        return res.map((r, i) => (Commitment.fromIncompleteCommitment(ics[i], r.opening, r.root, r.index, Poseidon.getPoseidon())));
    }

    // "Activate" an array of incomplete commitments
    public async activateCommitments(
        incompleteCommitments: GeneralSet<IncompleteCommitment>,
        startIndices: (number | undefined)[],
    ): Promise<GeneralSet<Commitment>> {
        const incompleteCommsArr = incompleteCommitments.toArray();

        const normalizedSIs = CommitmentManager.normalizeStartIndices(startIndices);

        const activatedComms = this.activateCommitmentsInner(incompleteCommsArr, normalizedSIs);

        const res = buildCommitmentSet() as unknown as GeneralSet<Commitment>;
        return activatedComms.then((comms) => {
            for (const c of comms) {
                res.add(c);
            }
            return res;
        });
    }

    public async getCommitmentForTransaction(tx: ElusivTransaction, seedWrapper: SeedWrapper): Promise<IncompleteCommitment> {
        if (tx.txType === 'TOPUP') return CommitmentManager.buildCommitmentForPartialStore(tx as PartialStoreTx, seedWrapper);
        if (tx.txType === 'SEND') return this.getCommitmentForPartialSend(tx as PartialSendTx, seedWrapper);
        throw new Error(INVALID_TX_TYPE);
    }

    // Default: 500 ms between fetches, 2 min timeout
    public async awaitCommitmentInsertion(commitmentHash: ReprScalar, startingIndex = 0, delayBetweenFetches = 500, timeout: number = 2 * 60 * 1000): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let attempts = 1;
            const interval = setInterval(async () => {
                const isInserted = await this.isCommitmentInserted(commitmentHash, startingIndex);
                if (isInserted) {
                    clearInterval(interval);
                    resolve(isInserted);
                }
                if (attempts * delayBetweenFetches >= timeout) {
                    reject(new Error(TIMEOUT_ERR('Fetch commitment')));
                }
                attempts++;
            }, delayBetweenFetches);
        });
    }

    private async getCommitmentForPartialSend(partialSendTx: PartialSendTx, seedWrapper: SeedWrapper): Promise<IncompleteCommitment> {
        try {
            // Attempt to build with faster way to fetch first, but this can in some cases return the incorrect balance
            const privateBalanceFast = (await this.txManager.getPrivateBalanceFromMetadata(
                partialSendTx.tokenType,
                partialSendTx.nonce,
            ));
            const res = CommitmentManager.buildCommitmentForPartialSend(partialSendTx, privateBalanceFast, seedWrapper);
            // If we reconstructed the correct commitment hash, we can assume the balance we fetched is the correct one
            if (equalsUint8Arr(res.getCommitmentHash(), partialSendTx.commitmentHash)) return res;
        }
        catch (e) {
            // Failed to construct fast way, do slow way
        }

        // Otherwise fetch the slow, but 100% sure way
        const privateBalanceSlow = this.txManager.getPrivateBalanceFromTxHistory(
            partialSendTx.tokenType,
            partialSendTx.nonce,
        );
        const resSlow = CommitmentManager.buildCommitmentForPartialSend(partialSendTx, await privateBalanceSlow, seedWrapper);
        if (!equalsUint8Arr(resSlow.getCommitmentHash(), partialSendTx.commitmentHash)) throw new Error('Failed to reconstruct commitment');
        return resSlow;
    }

    private static buildCommitmentForPartialSend(partialSendTx: PartialSendTx, privateBalanceBeforeNonce: bigint, seedWrapper: SeedWrapper): IncompleteCommitment {
        const nullifier = seedWrapper.generateNullifier(partialSendTx.nonce);
        // The resulting commitment is the UTXO of the send (partialSendTx.amount would just be the amount transferred, not the amount left over)
        const totalFee = partialSendTx.fee;
        return this.buildCommitmentForSend(nullifier, partialSendTx.tokenType, privateBalanceBeforeNonce, partialSendTx.amount, totalFee, partialSendTx.merkleStartIndex);
    }

    // Build a commitment for a send transaction
    // NOTE: totalFee does NOT include extra fee and rent fee, these are already added to amount
    public static buildCommitmentForSend(
        nullifier: Uint8Array,
        tokenType: TokenType,
        privateBalanceBeforeNonce: bigint,
        sendAmount: bigint,
        totalFee: bigint,
        assocCommIndex: number,
    ): IncompleteCommitment {
        // The resulting commitment is the UTXO of the send (partialSendTx.amount would just be the amount transferred, not the amount left over)
        const currPrivBalance = privateBalanceBeforeNonce
            - sendAmount
            - totalFee;
        return new IncompleteCommitment(
            nullifier,
            currPrivBalance,
            BigInt(getNumberFromTokenType(tokenType)),
            BigInt(assocCommIndex),
            Poseidon.getPoseidon(),
        );
    }

    public static buildCommitmentForPartialStore(partialStoreTx: PartialStoreTx, seedWrapper: SeedWrapper): IncompleteCommitment {
        const nullifier = seedWrapper.generateNullifier(partialStoreTx.nonce);
        return new IncompleteCommitment(
            nullifier,
            partialStoreTx.amount,
            BigInt(getNumberFromTokenType(partialStoreTx.tokenType)),
            BigInt(partialStoreTx.merkleStartIndex),
            Poseidon.getPoseidon(),
        );
    }

    private static normalizeStartIndices(startIndices: readonly (number | undefined)[]): number[] {
        let defaultStartIndex = 0;
        const res: number[] = [];

        startIndices.forEach((si) => {
            // Default start index is always the last defined start index
            if (si === undefined) {
                res.push(defaultStartIndex);
            }
            else {
                res.push(si);
                defaultStartIndex = si;
            }
        });

        return res;
    }
}
