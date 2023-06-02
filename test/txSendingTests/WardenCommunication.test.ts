import { expect } from 'chai';
import { isWardenErrorResponse, isWardenSignatureResponse } from '../../src/sdk/transactions/txBuilding/serializedTypes/typeGuards.js';
import { WardenError, WardenErrorResponse, WardenSignatureResponse } from '../../src/sdk/transactions/txBuilding/serializedTypes/types.js';
import { WardenCommunicator } from '../../src/sdk/txSending/WardenCommunication.js';

describe('Warden Response parsing tests', () => {
    const wardenSigResponse : WardenSignatureResponse = {
        jsonrpc: '2.0',
        result: [
            85, 176, 185, 120, 252, 57, 47, 0, 57, 169, 225,
            51, 229, 183, 77, 235, 175, 54, 86, 189, 220, 91,
            81, 201, 189, 92, 59, 11, 120, 78, 218, 151, 137,
            204, 248, 206, 212, 132, 242, 73, 20, 91, 46, 141,
            59, 118, 81, 32, 72, 79, 159, 67, 133, 111, 69,
            176, 201, 231, 81, 24, 145, 224, 144, 1,
        ],
        id: '1',
    };

    const wardenSimulationErrResponse : WardenErrorResponse = {
        jsonrpc: '2.0',
        error: {
            code: -32001,
            message: '"Custom error: WardenRpcError: ElusivClient(SolanaClient(ClientError { request: Some(SendTransaction), kind: RpcError(RpcResponseError { code: -32002, message: "Transaction simulation failed: Error processing Instruction 2: custom program error: 0x69", data: SendTransactionPreflightFailure(RpcSimulateTransactionResult { err: Some(InstructionError(2, Custom(105))), logs: Some(["Program ComputeBudget111111111111111111111111111111 invoke [1]", "Program ComputeBudget111111111111111111111111111111 success", "Program ComputeBudget111111111111111111111111111111 invoke [1]", "Program ComputeBudget111111111111111111111111111111 success", "Program HSwKaCUZPTQXsrrgV1KYUvF5yn9RHg86jEtRViTE5fUV invoke [1]", "Program HSwKaCUZPTQXsrrgV1KYUvF5yn9RHg86jEtRViTE5fUV consumed 5111 of 1400000 compute units", "Program HSwKaCUZPTQXsrrgV1KYUvF5yn9RHg86jEtRViTE5fUV failed: custom program error: 0x69"]), accounts: None, units_consumed: Some(0), return_data: None }) }) }))"',
        },
        id: '1',
    };

    const wardenTxErrResponse : WardenErrorResponse = {
        jsonrpc: '2.0',
        error: {
            code: -32001,
            message: 'Custom error: WardenRpcError: ElusivClient(SolanaClient(Error {request: None, kind: TransactionError(InstructionError(1, Custom(105)))} ))',
        },
        id: '1',
    };

    it('Correctly detects a warden signature response', () => {
        expect(isWardenSignatureResponse(wardenSigResponse)).to.be.true;
        expect(isWardenErrorResponse(wardenSigResponse)).to.be.false;
    });

    it('Correctly detects an invalid warden signature response', () => {
        expect(isWardenSignatureResponse({ ...wardenSigResponse, result: wardenSigResponse.result.slice(0, 62) })).to.be.false;
        expect(isWardenSignatureResponse({ ...wardenSigResponse, result: undefined })).to.be.false;
        expect(isWardenSignatureResponse({ ...wardenSigResponse, id: undefined })).to.be.false;
        expect(isWardenSignatureResponse({ ...wardenSigResponse, id: 1 })).to.be.false;
        expect(isWardenSignatureResponse({ ...wardenSigResponse, jsonrpc: undefined })).to.be.false;
        expect(isWardenSignatureResponse({ ...wardenSigResponse, jsonrpc: 2 })).to.be.false;
    });

    it('Correctly detects a warden error response', () => {
        expect(isWardenErrorResponse(wardenTxErrResponse)).to.be.true;
        expect(isWardenSignatureResponse(wardenTxErrResponse)).to.be.false;
    });

    it('Correctly detects an invalid warden error response', () => {
        expect(isWardenErrorResponse({ ...wardenTxErrResponse, error: undefined })).to.be.false;
        expect(isWardenErrorResponse({ ...wardenTxErrResponse, error: { ...wardenTxErrResponse.error, code: undefined } })).to.be.false;
        expect(isWardenErrorResponse({ ...wardenTxErrResponse, error: { ...wardenTxErrResponse.error, code: '-32001' } })).to.be.false;
        expect(isWardenErrorResponse({ ...wardenTxErrResponse, error: { ...wardenTxErrResponse.error, message: undefined } })).to.be.false;
        expect(isWardenErrorResponse({ ...wardenTxErrResponse, error: { ...wardenTxErrResponse.error, message: 123 } })).to.be.false;
        expect(isWardenErrorResponse({ ...wardenTxErrResponse, id: undefined })).to.be.false;
        expect(isWardenErrorResponse({ ...wardenTxErrResponse, id: 1 })).to.be.false;
        expect(isWardenErrorResponse({ ...wardenTxErrResponse, jsonrpc: undefined })).to.be.false;
        expect(isWardenErrorResponse({ ...wardenTxErrResponse, jsonrpc: 2 })).to.be.false;
    });

    it('Correctly parses a warden error code', () => {
        expect(WardenCommunicator.getErrorCode(wardenSimulationErrResponse.error as WardenError)).to.equal(0x69);
        expect(WardenCommunicator.getErrorCode(wardenTxErrResponse.error as WardenError)).to.equal(0x69);
    });

    it('Correctly detects simulation error', () => {
        expect(WardenCommunicator.isSimulationError(wardenSimulationErrResponse.error as WardenError)).to.be.true;
        expect(WardenCommunicator.isSimulationError(wardenTxErrResponse.error as WardenError)).to.be.false;
    });

    it('Correctly detects tx error', () => {
        expect(WardenCommunicator.isTransactionError(wardenSimulationErrResponse.error as WardenError)).to.be.false;
        expect(WardenCommunicator.isTransactionError(wardenTxErrResponse.error as WardenError)).to.be.true;
    });
});
