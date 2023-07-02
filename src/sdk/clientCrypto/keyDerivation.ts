import { Keypair } from '@solana/web3.js';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { padLE, serializeUint32LE } from '@elusiv/serialization';
import { MAX_UINT32 } from '../../constants.js';

/**
 * All key derivation logic to generate cryptographic values from the user's seed:
 * - AES256 IVs
 * - AES256 Keys
 * - Identifier Keys
 * - Nullifiers
 * Each value is usually derived from a seed and salt and a constant info field to avoid collisions.
 */
export const elusivInfos = ['AES256 IV', 'AES256 Key', 'Root Viewing Key', 'Metadata Key', 'Nullifier', 'Identifier Key', 'Receive Key'] as const;
export type ElusivInfo = typeof elusivInfos[number];

// 16 bytes IV length for aes256
export const IV_LENGTH_AES256 = 16;
// Info field for hkdf of IVs
export const IV_CONSTANT_AES256 = 'AES256 IV';
// 32 bytes key length for aes256
export const KEY_LENGTH_AES256 = 32;
// Info field for hkdf of secret keys
export const KEY_CONSTANT_AES256 = 'AES256 Key';
// Info field for hkdf of the root viewing key
export const ROOT_VIEWING_KEY_LENGTH = 32;
export const ROOT_VIEWING_KEY_CONSTANT = 'Root Viewing Key';
// Info field for hkdf of key used to encrypt commitment metadata
export const METADATA_KEY_LENGTH = 32;
export const METADATA_KEY_CONSTANT = 'Metadata Key';
export const NULLIFIER_LENGTH = 31;
export const NULLIFIER_CONSTANT = 'Nullifier';
export const ID_LENGTH = 31;
export const ID_CONSTANT = 'Identifier Key';
/** WIP */
export const RECEIVE_KEY_LENGTH = 32;
export const RECEIVE_KEY_CONSTANT = 'Receive Key';
/** End WIP */

// Root viewing key from which Identifier and decryption keys are derived. Anyone holding this can fetch and decrypt the user's private transactions,
// but cannot spend any of their money
export function generateRootViewingKey(seed: Uint8Array): Uint8Array {
    return hkdfWrapper(seed, 0, ROOT_VIEWING_KEY_CONSTANT, ROOT_VIEWING_KEY_LENGTH);
}

// Key used to encrypt commitment metadata. This is derived from the seed and the commitmenthash.
// We derive from the commitmenthash to avoid replay attacks between commitments if one such key
// is compromised.
export function generateCommMetadataKey(ikm: Uint8Array, commHash: Uint8Array): Uint8Array {
    return hkdf(sha256, ikm, commHash, METADATA_KEY_CONSTANT, METADATA_KEY_LENGTH);
}

// Identifier used for indexing private transactions on-chain
export function generateId(rootViewingKey: Uint8Array, salt: number): Uint8Array {
    return padLE(hkdfWrapper(rootViewingKey, salt, ID_CONSTANT, ID_LENGTH), 32);
}

export function generateSeededSaltedAES256Key(ikm: Uint8Array, salt: number): Uint8Array {
    return hkdfWrapper(ikm, salt, KEY_CONSTANT_AES256, KEY_LENGTH_AES256);
}

export function generateSeededSaltedIV(seed: Uint8Array, salt: number): Uint8Array {
    return hkdfWrapper(seed, salt, IV_CONSTANT_AES256, IV_LENGTH_AES256);
}

export function generateSeededSaltedNullifier(seed: Uint8Array, salt: number): Uint8Array {
    // 31 byte (= 248 bit) value because we don't want to exceed the field scalar,
    // which is a 254 bit number (2^253 + x), we pad with a 0 byte at the end
    return padLE(hkdfWrapper(seed, salt, NULLIFIER_CONSTANT, NULLIFIER_LENGTH), 32);
}

/**
 * Function to allow external apps to derive keys from the seed. Must provide an info. Info cannot be an existing elusiv
 * constant and cannot start with the string "elusiv".
 */
export function deriveFromSeedExternal(seed: Uint8Array, info: string, salt: number, length: number): Uint8Array {
    if (!isValidExternalInfo(info) || salt > MAX_UINT32) throw new Error('Invalid info string. Must be longer than 0, not start with elusiv and not be used internally');
    const saltBytes = serializeUint32LE(salt);
    return hkdf(sha256, seed, saltBytes, info, length);
}

function isValidExternalInfo(info: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return info.length > 0 && !(elusivInfos.includes(info as any)) && !info.startsWith('elusiv');
}

// Allows passing of salt as a number
function hkdfWrapper(ikm: Uint8Array, salt: number, info: ElusivInfo, length: number): Uint8Array {
    const saltBytes = serializeUint32LE(salt);
    return hkdf(sha256, ikm, saltBytes, info, length);
}

/** WIP */
export function generateReceiveKeyPair(seed: Uint8Array, salt: number): Keypair {
    const kpSeed = hkdfWrapper(seed, salt, RECEIVE_KEY_CONSTANT, RECEIVE_KEY_LENGTH);
    return Keypair.fromSeed(kpSeed);
}

export function generateSeededSaltedKeyPair(seed: Uint8Array, info: string, salt: number): Keypair {
    const seedLength = 32;
    const keySeed = hkdfWrapper(seed, salt, info as ElusivInfo, seedLength);
    return Keypair.fromSeed(keySeed);
}
/** End WIP */
