import { ConfirmedSignatureInfo } from '@solana/web3.js';
import { INVALID_TX_TYPE } from '../../constants.js';
import { WardenInfo } from '../../public/WardenInfo.js';
import { ElusivTxData } from '../../public/txData/ElusivTxData.js';
import { SendTxData } from '../../public/txData/SendTxData.js';
import { TopupTxData } from '../../public/txData/TopupTxData.js';
import { WardenCommunicator } from './WardenCommunication.js';
import { SendJSON, StoreJSON, WardenSignatureResponse } from '../transactions/txBuilding/serializedTypes/types.js';
import { TransactionSerialization } from '../transactions/txBuilding/wardenSerialization/TransactionSerialization.js';

export class TransactionSender {
    // eslint-disable-next-line class-methods-use-this
    public async sendElusivTx(
        txData: ElusivTxData,
    ): Promise<ConfirmedSignatureInfo> {
        if (txData.txType === 'TOPUP') {
            return TransactionSender.sendTopupTx(txData as TopupTxData);
        }
        if (txData.txType === 'SEND') {
            return TransactionSender.sendSendTx(txData as SendTxData);
        }

        throw new Error(INVALID_TX_TYPE);
    }

    public static async sendTopupTx(
        signedTxData: TopupTxData,
    ): Promise<ConfirmedSignatureInfo> {
        const serialized: StoreJSON = TransactionSerialization.serializePartiallySignedStore(signedTxData.tx);
        return TransactionSender.sendTopUpUnchecked(serialized, signedTxData.wardenInfo).then((res) => TransactionSerialization.deserializeSerializedSignature(res.result));
    }

    // Send only the topup tx without checking its data and for a merge
    private static sendTopUpUnchecked(signedTxData: StoreJSON, wardenInfo: WardenInfo): Promise<WardenSignatureResponse> {
        const relayComm = new WardenCommunicator(wardenInfo);
        return relayComm.postWardenSigRequest(signedTxData);
    }

    private static sendSendUnchecked(sendData: SendJSON, wardenInfo: WardenInfo): Promise<WardenSignatureResponse> {
        const relayComm = new WardenCommunicator(wardenInfo);
        return relayComm.postWardenSigRequest(sendData);
    }

    public static async sendSendTx(
        txData: SendTxData,
    ): Promise<ConfirmedSignatureInfo> {
        const serialized: SendJSON = TransactionSerialization.serializeSend(
            txData.proof,
            txData.getTotalFee(),
            txData.isSolanaPayTransfer,
        );

        return TransactionSender.sendSendUnchecked(serialized, txData.wardenInfo).then((res) => TransactionSerialization.deserializeSerializedSignature(res.result));
    }
}
