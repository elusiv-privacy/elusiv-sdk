import { deserializeUint32LE } from '@elusiv/serialization';
import { randomBytes } from '@noble/hashes/utils';
import { Pair } from './Pair.js';

export function zipSameLength<T, U>(a: T[], b: U[]): Pair<T, U>[] {
    if (a.length !== b.length) throw new Error("Arrays to be zipped don't have same length");
    return a.map((k, i) => ({ fst: k, snd: b[i] }));
}

// Returns a reversed copy of an array without changing passed in array
export function reverseArr<T>(arr: T[]): T[] {
    return [...arr].reverse();
}

export function randomUint32(): number {
    const bytes = randomBytes(4);
    return deserializeUint32LE(bytes);
}

export function readFixedLengthValueFromBuffer(
    buffer: Uint8Array,
    index: number,
    length: number,
): Uint8Array | null {
    if ((index + 1) * length > buffer.length) return null;
    return buffer.slice(index * length, (index + 1) * length);
}

export function mergeMaps<T, V>(maps: readonly Map<T, V>[]): Map<T, V> {
    const res: Map<T, V> = new Map();
    for (const map of maps) {
        for (const item of map.entries()) {
            res.set(...item);
        }
    }
    return res;
}

export function isDefinedSparseArr<T>(arr: T[]): boolean {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === undefined) return false;
    }
    return true;
}

export const isTruthy = <T>(x: T | false | undefined | null | '' | 0): x is T => !!x;

export function cleanUserInput(n: number): number {
    return Math.floor(n);
}

export async function sleep(ms: number): Promise<void> {
    // eslint-disable-next-line no-promise-executor-return
    return new Promise((resolve) => setTimeout(resolve, ms));
}
