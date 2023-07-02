import {
    deserializeBoolean,
    deserializeByte,
    deserializeUint16LE, deserializeUint32LE, deserializeUint64LE,
} from '@elusiv/serialization';
import { INVALID_ACCESS } from '../../constants.js';

export function parseBufferFromTxBuffer(txBuffer: Uint8Array, start: number, length: number): Uint8Array {
    if (start + length > txBuffer.length) throw new Error(INVALID_ACCESS('Trying to access data outside of txBuffer'));
    return txBuffer.slice(start, start + length);
}

export function parseByteFromTxBuffer(txBuffer: Uint8Array, start: number): number {
    const dataBuffer = parseBufferFromTxBuffer(txBuffer, start, 1);
    return deserializeByte(dataBuffer);
}

export function parseBooleanFromTxBuffer(txBuffer: Uint8Array, start: number): boolean {
    const dataBuffer = parseBufferFromTxBuffer(txBuffer, start, 1);
    return deserializeBoolean(dataBuffer);
}

export function parseUint16FromTxBuffer(txBuffer: Uint8Array, start: number): number {
    const dataBuffer = parseBufferFromTxBuffer(txBuffer, start, 2);
    return deserializeUint16LE(dataBuffer);
}

export function parseUint32FromTxBuffer(txBuffer: Uint8Array, start: number): number {
    const dataBuffer = parseBufferFromTxBuffer(txBuffer, start, 4);
    return deserializeUint32LE(dataBuffer);
}

export function parseUint64FromTxBuffer(txBuffer: Uint8Array, start: number): bigint {
    const dataBuffer = parseBufferFromTxBuffer(txBuffer, start, 8);
    return deserializeUint64LE(dataBuffer);
}

export function parseUint256FromTxBuffer(txBuffer: Uint8Array, start: number): Uint8Array {
    return parseBufferFromTxBuffer(txBuffer, start, 32);
}
