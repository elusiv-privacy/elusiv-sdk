import { INVALID_WARDEN_RESPONSE } from '../../constants.js';
import { WardenInfo } from '../../public/WardenInfo.js';
import { isWardenErrorResponse, isWardenRawDataResponse, isWardenSignatureResponse } from '../transactions/txBuilding/serializedTypes/typeGuards.js';
import {
    WardenError,
    WardenMessage, WardenRawDataResponse, WardenSignatureResponse,
} from '../transactions/txBuilding/serializedTypes/types.js';
import { fetchWrapper } from '../utils/networkingUtils.js';

export class WardenCommunicator {
    private wardenInfo: WardenInfo;

    constructor(wardenInfo: WardenInfo) {
        this.wardenInfo = wardenInfo;
    }

    public postWardenSigRequest(wardenRequest: WardenMessage, timeout = 10000): Promise<WardenSignatureResponse> {
        return this.postWardenRequestJSON(wardenRequest, timeout)
            .then((json) => {
                if (isWardenSignatureResponse(json)) {
                    return json;
                }
                if (isWardenErrorResponse(json)) {
                    const errCode = WardenCommunicator.getErrorCode(json.error);
                    // 105 is Pyth error
                    if (errCode === 105 && WardenCommunicator.isSimulationError(json.error)) throw new Error('Failed to submit transaction due to Pyth Error, please try again.');
                    if (errCode === 105 && WardenCommunicator.isTransactionError(json.error)) throw new Error('Transaction failed on-chain due to Pyth Error, please try again.');
                }
                throw new Error(`${INVALID_WARDEN_RESPONSE}: ${JSON.stringify(json)}`);
            }).catch((err) => {
                throw err;
            });
    }

    public postWardenRawDataRequest(wardenRequest: WardenMessage, timeout = 10000): Promise<WardenRawDataResponse> {
        return this.postWardenRequestJSON(wardenRequest, timeout)
            .then((json) => {
                if (isWardenRawDataResponse(json)) {
                    return json;
                }
                throw new Error(`${INVALID_WARDEN_RESPONSE}: ${JSON.stringify(json)}`);
            }).catch((err) => {
                throw err;
            });
    }

    public static getErrorCode(err: WardenError): number {
        if (this.isSimulationError(err)) {
            const errSlice = err.message.slice(err.message.indexOf('custom program error'));
            // Should be exactly one 0xed hex string to represent the error
            const hexStrIndex = errSlice.indexOf('0x');
            const hexStringSlice = errSlice.slice(hexStrIndex + 2);
            if (hexStrIndex === -1) return -1;
            // Remove all the stuff that comes after
            return parseInt(hexStringSlice.substring(0, hexStringSlice.indexOf(' ')), 16);
        }
        const errSlice = err.message.slice(err.message.indexOf('InstructionError'));
        const decStrIndex = errSlice.indexOf('Custom(');
        const decStringSlice = errSlice.slice(decStrIndex + 7);
        if (decStrIndex === -1) return -1;
        // Remove all the stuff that comes after
        return parseInt(decStringSlice.substring(0, decStringSlice.indexOf(')')), 10);
    }

    // Indicates the transaction failed during simulation inside the warden
    public static isSimulationError(err: WardenError): boolean {
        return err.message.includes('Transaction simulation failed') && !err.message.includes('TransactionError');
    }

    // Indicates the transaction failed on-chain
    public static isTransactionError(err: WardenError): boolean {
        return !err.message.includes('Transaction simulation failed') && err.message.includes('TransactionError');
    }

    private async postWardenRequestJSON(wardenRequest: WardenMessage, timeout: number) {
        const response = await this.postRequest(wardenRequest, timeout);
        const json = await response.json();
        if (!response.ok) {
            throw new Error(json.error.message);
        }
        return json;
    }

    // We keep the timeout variable in case we want to use fetchWithTimeout instead in the future
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private postRequest(postData: WardenMessage, timeout = 10000): Promise<Response> {
        return fetchWrapper(this.wardenInfo.url, {
            method: 'POST',
            body: JSON.stringify(postData),
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}
