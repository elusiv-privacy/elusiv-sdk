import { getMinimumBalanceForRentExemptAccount } from '@solana/spl-token';
import { Cluster, Connection } from '@solana/web3.js';
import { getSendQuadraProofParamsStatic, ProofParams } from 'elusiv-circuits';
import { Commitment } from '@elusiv/cryptojs';
import { CommitmentManager } from '../../paramManagers/CommitmentManager.js';
import { FeeCalculator } from '../../paramManagers/fee/FeeCalculator.js';
import { FeeManager, FeeVersionData } from '../../paramManagers/fee/FeeManager.js';
import { FeeUtils } from '../../paramManagers/fee/FeeUtils.js';
import { TreeManager } from '../../paramManagers/TreeManager.js';
import { TransactionManager } from '../../txManagers/TransactionManager.js';
import { GeneralSet } from '../../utils/GeneralSet.js';
import { SeedWrapper } from '../../clientCrypto/SeedWrapper.js';
import { TokenType } from '../../../public/tokenTypes/TokenType.js';

// Wrapper for the result returned from connection.getLatestBlockhash
export type ChainStateInfo = {
    blockhash: string;
    lastValidBlockHeight: number;
}

export type RemoteParams = {
    readonly feeCalculator: FeeCalculator;
    readonly merkleStartIndex: number;
    readonly lamportsPerToken: number;
    readonly sendQuadraProofParams: ProofParams;
    readonly tokenAccRent: bigint;
}

export type TopupRemoteParams = RemoteParams & {
    readonly feeVersionData: FeeVersionData;
    readonly activeCommitments: GeneralSet<Commitment>;
    readonly lastNonce: number;
    // Not readonly, as might need to be updated
    chainState: ChainStateInfo;
}

export type BaseSendRemoteParams = RemoteParams & {
    readonly feeVersion: number;
}

export type SendRemoteParams = BaseSendRemoteParams & {
    readonly activeCommitments: GeneralSet<Commitment>;
    readonly lastNonce: number;
}

export function topupRParamsToSendRParams(tr: TopupRemoteParams): SendRemoteParams {
    return {
        feeVersion: tr.feeVersionData.feeVersion,
        feeCalculator: tr.feeCalculator,
        activeCommitments: tr.activeCommitments,
        lastNonce: tr.lastNonce,
        merkleStartIndex: tr.merkleStartIndex,
        lamportsPerToken: tr.lamportsPerToken,
        sendQuadraProofParams: tr.sendQuadraProofParams,
        tokenAccRent: tr.tokenAccRent,
    };
}

export class RemoteParamFetching {
    public static async fetchTopupRemoteParams(
        connection: Connection,
        cluster: Cluster,
        seedWrapper: SeedWrapper,
        commManager: CommitmentManager,
        txManager: TransactionManager,
        feeManager: FeeManager,
        treeManager: TreeManager,
        tokenType: TokenType,
    ): Promise<TopupRemoteParams> {
        const feeCalculatorPromise = feeManager.getFeeCalculator();
        const activeCommitmentsPromise = commManager.getActiveCommitments(tokenType, seedWrapper);
        const lastUsedNoncePromise = this.getMostRecentNonce(seedWrapper, txManager, commManager);
        const merkleStartIndexPromise = treeManager.getLatestLeafIndex();
        const lamportsPerTokenPromise = FeeUtils.getLamportsPerToken(connection, cluster, tokenType);
        const blockHashInfoPromise = connection.getLatestBlockhash();
        const tokenSendFee = getMinimumBalanceForRentExemptAccount(connection).then((r) => BigInt(r));

        return Promise.all([feeCalculatorPromise, activeCommitmentsPromise, lastUsedNoncePromise, merkleStartIndexPromise, lamportsPerTokenPromise, blockHashInfoPromise, tokenSendFee])
            .then((res) => ({
                feeCalculator: res[0].calculator,
                feeVersionData: res[0].feeVersionData,
                activeCommitments: res[1],
                lastNonce: res[2],
                merkleStartIndex: res[3],
                lamportsPerToken: res[4],
                chainState: res[5],
                sendQuadraProofParams: getSendQuadraProofParamsStatic(),
                tokenAccRent: res[6],
            }));
    }

    public static fetchSendRemoteParams(
        connection: Connection,
        cluster: Cluster,
        seedWrapper: SeedWrapper,
        commManager: CommitmentManager,
        txManager: TransactionManager,
        feeManager: FeeManager,
        treeManager: TreeManager,
        tokenType: TokenType,
    ): Promise<SendRemoteParams> {
        const activeCommitmentsPromise = commManager.getActiveCommitments(tokenType, seedWrapper, undefined);
        const lastUsedNoncePromise = this.getMostRecentNonce(seedWrapper, txManager, commManager);
        const baseSendParamsPromise = this.fetchBaseSendRemoteParams(connection, cluster, feeManager, treeManager, tokenType);

        return Promise.all([activeCommitmentsPromise, lastUsedNoncePromise, baseSendParamsPromise])
            .then((res) => ({
                activeCommitments: res[0],
                lastNonce: res[1],
                ...res[2],
            }));
    }

    public static fetchBaseSendRemoteParams(
        connection: Connection,
        cluster: Cluster,
        feeManager: FeeManager,
        treeManager: TreeManager,
        tokenType: TokenType,
    ): Promise<BaseSendRemoteParams> {
        const merkleStartIndexPromise = treeManager.getLatestLeafIndex();
        const sendFeeCalculatorPromise = feeManager.getFeeCalculator();
        const lamportsPerTokenPromise = FeeUtils.getLamportsPerToken(connection, cluster, tokenType);
        const tokenSendFee = getMinimumBalanceForRentExemptAccount(connection).then((r) => BigInt(r));

        return Promise.all([merkleStartIndexPromise, sendFeeCalculatorPromise, lamportsPerTokenPromise, tokenSendFee])
            .then((res) => ({
                merkleStartIndex: res[0],
                feeVersion: res[1].feeVersionData.feeVersion,
                feeCalculator: res[1].calculator,
                lamportsPerToken: res[2],
                tokenAccRent: res[3],
                sendQuadraProofParams: getSendQuadraProofParamsStatic(),
            }));
    }

    public static async getMostRecentNonce(
        seedWrapper: SeedWrapper,
        txManager: TransactionManager,
        commManager: CommitmentManager,
    ): Promise<number> {
        const mostRecentTx = await txManager.getMostRecentTx();
        if (mostRecentTx === undefined) return -1;
        if (await commManager.isTransactionConfirmed(mostRecentTx, seedWrapper)) return mostRecentTx.nonce;
        throw new Error('Cannot create transaction while still waiting for tx to confirm');
    }
}
