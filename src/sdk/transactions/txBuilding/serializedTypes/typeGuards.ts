import { ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import { CommitmentMetadata } from '../../../clientCrypto/CommitmentMetadata.js';
import { InitVerificationInstruction } from '../../instructions/InitVerificationInstruction.js';
import { InitVerificationInstructionBase } from '../../instructions/InitVerificationInstructionBase.js';
import { InitVerificationInstructionLegacy } from '../../instructions/InitVerificationInstructionLegacy.js';
import { StoreInstruction } from '../../instructions/StoreInstruction.js';
import { StoreInstructionBase } from '../../instructions/StoreInstructionBase.js';
import { StoreInstructionLegacy } from '../../instructions/StoreInstructionLegacy.js';
import {
    JSONRPCResponse,
    ParsedLamportTransfer,
    ParsedSPLTransfer,
    SignatureSerialized, WardenErrorResponse, WardenRawDataResponse, WardenSignatureResponse,
} from './types.js';

type ElusivWardenResponse = {
    result: number[] | undefined;
    jsonrpc: string;
    id: string;
}

export function isWardenSignatureResponse(arg: unknown): arg is WardenSignatureResponse {
    return (arg as ElusivWardenResponse).result !== undefined
        && isSignatureSerialized((arg as ElusivWardenResponse).result)
        && typeof (arg as ElusivWardenResponse).jsonrpc === 'string' && typeof (arg as ElusivWardenResponse).id === 'string';
}

export function isJSONRPCResponse(arg: unknown): arg is JSONRPCResponse {
    return typeof (arg as ElusivWardenResponse).jsonrpc === 'string' && typeof (arg as ElusivWardenResponse).id === 'string';
}

export function isWardenRawDataResponse(arg: unknown): arg is WardenRawDataResponse {
    return isJSONRPCResponse(arg)
        && (arg as ElusivWardenResponse).result !== undefined
        && isByteArr((arg as ElusivWardenResponse).result);
}

export function isWardenErrorResponse(arg: unknown): arg is WardenErrorResponse {
    return isJSONRPCResponse(arg)
        && (arg as WardenErrorResponse).error !== undefined
        && typeof (arg as WardenErrorResponse).error.code === 'number'
        && typeof (arg as WardenErrorResponse).error.message === 'string';
}

export function isSignatureSerialized(arg: unknown): arg is SignatureSerialized {
    return isNumberArr(arg, 64);
}

export function isByteArr(arg: unknown): arg is number[] {
    return isNumberArr(arg) && arg.every((a) => a < 256 && a >= 0);
}

export function isNumberArr(arg: unknown, length?: number): arg is number[] {
    if (!arg || !Array.isArray(arg) || (length !== undefined && arg.length !== length)) return false;

    for (let i = 0; i < arg.length; i++) {
        if (typeof arg[i] !== 'number') {
            return false;
        }
    }

    return true;
}

export function isTypeError(arg: unknown): arg is TypeError {
    return arg !== undefined
        && (arg as TypeError).message !== undefined
        && (arg as TypeError).name === 'TypeError';
}

export function isInitVerificationInstruction(arg: InitVerificationInstruction | InitVerificationInstructionLegacy | InitVerificationInstructionBase): arg is InitVerificationInstruction {
    return (arg as InitVerificationInstruction).optFee !== undefined
        && (arg as InitVerificationInstruction).metadata !== undefined
        && (arg as InitVerificationInstruction).serializedMetadata !== undefined;
}

export function isStoreInstruction(arg: StoreInstruction | StoreInstructionLegacy | StoreInstructionBase): arg is StoreInstruction {
    return (arg as StoreInstruction).metadata !== undefined
        && (arg as StoreInstruction).serializedMetadata !== undefined;
}

export function isCommitmentMetadata(arg: unknown): arg is CommitmentMetadata {
    return arg !== undefined
        && typeof (arg as CommitmentMetadata).nonce === 'number'
        && typeof (arg as CommitmentMetadata).tokenType === 'string'
        && typeof (arg as CommitmentMetadata).assocCommIndex === 'number'
        && typeof (arg as CommitmentMetadata).balance === 'bigint';
}

export function isPartiallyDecodedInstruction(arg: ParsedInstruction | PartiallyDecodedInstruction): arg is PartiallyDecodedInstruction {
    return typeof (arg as PartiallyDecodedInstruction).data === 'string';
}

export function isParsedInstruction(arg: ParsedInstruction | PartiallyDecodedInstruction): arg is ParsedInstruction {
    return typeof (arg as ParsedInstruction).program === 'string';
}

export function isParsedLamportTransfer(arg: unknown): arg is ParsedLamportTransfer {
    return arg !== undefined
        && typeof (arg as ParsedLamportTransfer).info !== undefined
        && typeof (arg as ParsedLamportTransfer).info.destination === 'string'
        && typeof (arg as ParsedLamportTransfer).info.lamports === 'number'
        && typeof (arg as ParsedLamportTransfer).info.source === 'string'
        && typeof (arg as ParsedLamportTransfer).type === 'string';
}

export function isParsedSPLTransfer(arg: unknown): arg is ParsedSPLTransfer {
    return arg !== undefined
        && typeof (arg as ParsedSPLTransfer).info !== undefined
        && typeof (arg as ParsedSPLTransfer).info.amount === 'string'
        && typeof (arg as ParsedSPLTransfer).info.destination === 'string'
        && typeof (arg as ParsedSPLTransfer).info.multisigAuthority === 'string'
        && Array.isArray((arg as ParsedSPLTransfer).info.signers)
        && typeof (arg as ParsedSPLTransfer).info.source === 'string'
        && typeof (arg as ParsedSPLTransfer).type === 'string';
}
