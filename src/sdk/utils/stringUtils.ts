import { INVALID_SIZE } from '../../constants.js';

export function stringToUtf8ByteCodes(s: string): Uint8Array {
    return Buffer.from(s, 'utf8');
}

export function utf8ByteCodesToString(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('utf8');
}

export function repeatChar(char: string, count: number): string {
    if (char.length !== 1) {
        throw new Error(INVALID_SIZE('char', char.length, 1));
    }
    return char.repeat(count);
}
