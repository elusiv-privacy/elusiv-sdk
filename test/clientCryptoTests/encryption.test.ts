import { expect } from 'chai';
import { randomBytes } from '@noble/hashes/utils';
import { ComputeHashInstruction } from '../../src/sdk/transactions/instructions/ComputeHashInstruction.js';
import {
    decryptAES256CTRWithKey,
    decryptSeededSaltedAES256, encryptAES256CTRWithKey, encryptSeededSaltedAES256,
} from '../../src/sdk/clientCrypto/encryption.js';
import { generateSeededSaltedAES256Key, IV_LENGTH_AES256 } from '../../src/sdk/clientCrypto/keyDerivation.js';

describe('Seeded Salted encryption/decryption tests', () => {
    let seed: Uint8Array;
    let salt: number;
    let plainText: Uint8Array;
    let iv: Uint8Array;

    beforeEach(() => {
        salt = 12345;
        seed = Uint8Array.from([
            6, 7, 8, 9, 10,
            11, 12, 13, 14, 15,
        ]);
        plainText = ComputeHashInstruction.CHECKSUM;
        iv = randomBytes(IV_LENGTH_AES256);
    });

    it('Encrypts and decrypts with correct seed and salt and correct iv', (async () => {
        const cipherText = encryptSeededSaltedAES256(plainText, seed, salt);
        const decryptedUint8Array: Uint8Array = await decryptSeededSaltedAES256(await cipherText, seed, salt);
        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.deep.equal(decryptedUint8Array);
    }));

    it('Fails to encrypt and decrypt with correct seed and correct iv and wrong salt', (async () => {
        const cipherText = encryptSeededSaltedAES256(plainText, seed, salt);

        const wrongSalt = salt + 1;

        const decryptedUint8Array: Uint8Array = await decryptSeededSaltedAES256(await cipherText, seed, wrongSalt);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.not.deep.equal(decryptedUint8Array);
    }));

    it('Fails to encrypt and decrypt with wrong seed and correct iv and correct salt', (async () => {
        const cipherText = encryptSeededSaltedAES256(plainText, seed, salt);

        const wrongSeed = seed.slice(0, seed.length);
        wrongSeed[0] = 0;

        const decryptedUint8Array: Uint8Array = await decryptSeededSaltedAES256(await cipherText, wrongSeed, salt);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.not.deep.equal(decryptedUint8Array);
    }));

    it('Fails to encrypt and decrypt with wrong seed and correct iv and correct salt', (async () => {
        const cipherText = encryptSeededSaltedAES256(plainText, seed, salt);

        const wrongSeed = seed.slice(0, seed.length);
        wrongSeed[0] = 0;

        const decryptedUint8Array: Uint8Array = await decryptSeededSaltedAES256(await cipherText, wrongSeed, salt);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.not.deep.equal(decryptedUint8Array);
    }));

    it('Fails to encrypt and decrypt with correct seed and wrong iv and correct salt', (async () => {
        const cipherText = encryptSeededSaltedAES256(plainText, seed, salt);

        const wrongIv = iv;
        wrongIv[0] += 1;

        const decryptedUint8Array: Uint8Array = await decryptSeededSaltedAES256({ cipherText: (await cipherText).cipherText, iv: wrongIv }, seed, salt);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.not.deep.equal(decryptedUint8Array);
    }));

    it('Fails to encrypt and decrypt with wrong seed and wrong iv and wrong salt', (async () => {
        const cipherText = encryptSeededSaltedAES256(plainText, seed, salt);

        const wrongSeed = seed.slice(0, seed.length);
        wrongSeed[0] = 0;
        const wrongSalt = salt + 1;
        const wrongIv = iv;
        wrongIv[0] += 1;

        const decryptedUint8Array: Uint8Array = await decryptSeededSaltedAES256({ cipherText: (await cipherText).cipherText, iv: wrongIv }, wrongSeed, wrongSalt);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.not.deep.equal(decryptedUint8Array);
    }));
});

describe('Key-based encryption/decryption tests', () => {
    let key: Uint8Array;
    let plainText: Uint8Array;
    let iv: Uint8Array;

    beforeEach(() => {
        key = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
        plainText = ComputeHashInstruction.CHECKSUM;
        iv = randomBytes(IV_LENGTH_AES256);
    });

    it('Encrypts and decrypts with correct key and correct iv', (async () => {
        const cipherText = encryptAES256CTRWithKey(plainText, iv, key);
        const decryptedUint8Array: Uint8Array = await decryptAES256CTRWithKey(await cipherText, key);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.deep.equal(decryptedUint8Array);
    }));

    it('Fails to encrypt and decrypt with wrong key', (async () => {
        const cipherText = encryptAES256CTRWithKey(plainText, iv, key);
        const wrongKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17]);
        const decryptedUint8Array: Uint8Array = await decryptAES256CTRWithKey(await cipherText, wrongKey);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.not.deep.equal(decryptedUint8Array);
    }));
});

describe('Mixed encryption/decryption tests', () => {
    let seed: Uint8Array;
    let salt: number;
    let plainText: Uint8Array;
    let iv: Uint8Array;

    beforeEach(() => {
        seed = Uint8Array.from([
            6, 7, 8, 9, 10,
            11, 12, 13, 14, 15,
        ]);
        salt = 12345;
        plainText = ComputeHashInstruction.CHECKSUM;
        iv = randomBytes(IV_LENGTH_AES256);
    });

    it('Encrypts with seed and decrypts with key', async () => {
        const cipherText = encryptSeededSaltedAES256(plainText, seed, salt);
        const key = generateSeededSaltedAES256Key(seed, salt);
        const decryptedUint8Array: Uint8Array = await decryptAES256CTRWithKey(await cipherText, key);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.deep.equal(decryptedUint8Array);
    });

    it('Encrypts with key and decrypts with seed', async () => {
        const key = generateSeededSaltedAES256Key(seed, salt);
        const cipherText = encryptAES256CTRWithKey(plainText, iv, key);
        const decryptedUint8Array: Uint8Array = await decryptAES256CTRWithKey(await cipherText, key);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.deep.equal(decryptedUint8Array);
    });

    it('Fails to encrypt/decrypt with wrong seed for key', async () => {
        const cipherText = encryptSeededSaltedAES256(plainText, seed, salt);
        const wrongSeed = seed.slice(0, seed.length);
        wrongSeed[0] = 0;
        const key = generateSeededSaltedAES256Key(wrongSeed, salt);
        const decryptedUint8Array: Uint8Array = await decryptAES256CTRWithKey(await cipherText, key);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.not.deep.equal(decryptedUint8Array);
    });

    it('Fails to encrypt/decrypt with wrong salt for key', async () => {
        const cipherText = encryptSeededSaltedAES256(plainText, seed, salt);
        const wrongSalt = salt + 1;
        const key = generateSeededSaltedAES256Key(seed, wrongSalt);
        const decryptedUint8Array: Uint8Array = await decryptAES256CTRWithKey(await cipherText, key);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.not.deep.equal(decryptedUint8Array);
    });

    it('Fails to encrypt/decrypt with wrong key', async () => {
        const cipherText = encryptSeededSaltedAES256(plainText, seed, salt);
        const wrongKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17]);
        const decryptedUint8Array: Uint8Array = await decryptAES256CTRWithKey(await cipherText, wrongKey);

        expect(plainText, 'Uint8Array incorrectly encrypted/decrypted').to.not.deep.equal(decryptedUint8Array);
    });
});
