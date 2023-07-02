import {
    Cluster, Connection, PublicKey,
} from '@solana/web3.js';
import { hexToUint8Array } from '@elusiv/serialization';
import { VIEWING_KEY_VERSION } from '../constants.js';
import { SendTxWrapper, toPrivateTxWrapper } from '../public/transactionWrappers/TxWrappers.js';
import { RVKWrapper } from '../sdk/clientCrypto/RVKWrapper.js';
import { TransactionParsing } from '../sdk/transactions/txParsing/TransactionParsing.js';
import { getOwnerFromAcc } from '../sdk/utils/pubKeyUtils.js';
import { isTruthy } from '../sdk/utils/utils.js';

/**
 * A viewing key to decrypt a specific private transaction.
 */
export type ViewingKey = {
    /**
     * Version of the viewing key. Provided in hex with leading 0x.
     */
    version: string;
    /**
     * Id key used to find the transaction to view. Provided in hex with leading 0x.
     */
    idKey: string;
    /**
     * Decryption key to parse the transaction. Provided in hex with leading 0x.
     */
    decryptionKey: string;
};

export function generateViewingKey(rvk: RVKWrapper, nonce: number): Uint8Array {
    return rvk.generateDecryptionKey(nonce);
}

/**
 * Decrypt a send using a provided viewing key to get the original owner of the funds.
 * @param connection Solana connection object
 * @param cluster Solana cluster we're on
 * @param sendTx The viewing key info with which to parse the transaction.
 * @returns The parsed send transaction provided the viewing key is correct.
 */
export async function getSendTxWithViewingKey(connection: Connection, cluster: Cluster, sendTx: ViewingKey): Promise<{ sendTx: SendTxWrapper, owner: PublicKey }> {
    const versionByte = hexToUint8Array(sendTx.version);
    if (versionByte.length !== 1 && versionByte[0] !== VIEWING_KEY_VERSION) throw new Error('Invalid viewing key version');
    const idKey = new PublicKey(hexToUint8Array(sendTx.idKey));
    const viewingKey = hexToUint8Array(sendTx.decryptionKey);
    return getSendTxWithViewingKeyInner(connection, cluster, idKey, viewingKey);
}

export async function getSendTxWithViewingKeyInner(connection: Connection, cluster: Cluster, idKey: PublicKey, viewingKey: Uint8Array): Promise<{ sendTx: SendTxWrapper, owner: PublicKey }> {
    const sigs = await connection.getSignaturesForAddress(idKey);
    const finalizeTxResponses = await connection.getParsedTransactions(sigs.map((s) => s.signature), { maxSupportedTransactionVersion: 0 });
    const finalizeFiltered = finalizeTxResponses.filter(isTruthy);
    if (!(finalizeFiltered.length === finalizeTxResponses.length)) throw new Error('Failed to parse send instruction');
    const parsed = await TransactionParsing.tryParseRawSendFromDecryptionKey(cluster, finalizeFiltered.map((r) => r.transaction.message), sigs, viewingKey, idKey);
    let sendTx: SendTxWrapper = toPrivateTxWrapper(parsed) as SendTxWrapper;
    if (parsed.owner === undefined) throw new Error('Failed to decrypt send tx');
    // We want owner of Token Acc
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const taOwner = await getOwnerFromAcc(connection, cluster, sendTx.recipient!, sendTx.tokenType);
    sendTx = {
        ...sendTx,
        recipient: taOwner,
    };
    return { sendTx, owner: parsed.owner };
}
