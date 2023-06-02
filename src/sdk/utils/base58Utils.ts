import pkg from 'bs58';

const { encode, decode } = pkg;

export function bytesToBs58(bytes: Uint8Array): string {
    return encode(bytes);
}

export function bs58ToBytes(str: string): Uint8Array {
    return decode(str);
}
