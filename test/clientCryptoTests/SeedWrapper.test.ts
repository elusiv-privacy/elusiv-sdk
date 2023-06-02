import { PublicKey } from '@solana/web3.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { decryptSeededSaltedAES256, encryptSeededSaltedAES256 } from '../../src/sdk/clientCrypto/encryption.js';
import {
    deriveFromSeedExternal,
    elusivInfos,
    generateId, generateRootViewingKey, generateSeededSaltedAES256Key, generateSeededSaltedNullifier,
} from '../../src/sdk/clientCrypto/keyDerivation.js';
import { RVKWrapper } from '../../src/sdk/clientCrypto/RVKWrapper.js';
import { SeedWrapper } from '../../src/sdk/clientCrypto/SeedWrapper.js';

chai.use(chaiAsPromised);
const expect = chai.expect;
let seedWrapper: SeedWrapper;

describe('SeedWrapper tests', () => {
    const seed = new Uint8Array([
        0, 1, 2, 3, 4, 5, 6, 7,
        8, 9, 10, 11, 12, 13, 14, 15,
        16, 17, 18, 19, 20, 21, 22, 23,
        24, 25, 26, 27, 28, 29, 30, 31,
        32, 33, 34, 35, 36, 37, 38, 39,
        40, 41, 42, 43, 44, 45, 46, 47,
        48, 49, 50, 51, 52, 53, 54, 55,
        56, 57, 58, 59, 60, 61, 62, 63,
    ]);
    const rawRVK = generateRootViewingKey(seed);
    const rvk = new RVKWrapper(rawRVK);

    before(() => {
        seedWrapper = new SeedWrapper(seed);
    });

    it('Correctly gets the idkey for nonce 0', () => {
        const nonce = 0;
        expect(rvk.getIdentifierKey(nonce)).to.deep.equal(new PublicKey(generateId(rawRVK, nonce)));
    });

    it('Correctly gets the idkey for arbitrary nonce', () => {
        const nonce = 743;
        expect(rvk.getIdentifierKey(nonce)).to.deep.equal(new PublicKey(generateId(rawRVK, nonce)));
    });

    it('Correctly generates an AES256 key for nonce 0', () => {
        const nonce = 0;
        const key = rvk.generateDecryptionKey(nonce);
        expect(key).to.have.length(32);
        expect(key).to.deep.equal(generateSeededSaltedAES256Key(rawRVK, nonce));
    });

    it('Correctly generates an AES256 key for arbitrary nonce', () => {
        const nonce = 347;
        const key = rvk.generateDecryptionKey(nonce);
        expect(key).to.have.length(32);
        expect(key).to.deep.equal(generateSeededSaltedAES256Key(rawRVK, nonce));
    });

    it('Correctly encrypts and decrypts with AES256 for nonce 0', async () => {
        const nonce = 0;
        const payload = new Uint8Array([1, 2, 3, 4, 5]);
        const cipherText = await rvk.encryptSeededSaltedAES256(payload, nonce);
        expect(cipherText).to.deep.equal(await encryptSeededSaltedAES256(payload, rawRVK, nonce));

        const decrypted = await rvk.decryptSeededSaltedAES256(await cipherText, nonce);
        expect(decrypted).to.deep.equal(payload);
        expect(decrypted).to.not.deep.equal(await decryptSeededSaltedAES256(await cipherText, seed, nonce));
        expect(decrypted).to.deep.equal(await decryptSeededSaltedAES256(await cipherText, rawRVK, nonce));
    });

    it('Correctly encrypts and decrypts with AES256 for arbitrary nonce', async () => {
        const nonce = 473;
        const payload = new Uint8Array([1, 2, 3, 4, 5]);
        const cipherText = await rvk.encryptSeededSaltedAES256(payload, nonce);
        expect(cipherText).to.not.deep.equal(await encryptSeededSaltedAES256(payload, seed, nonce));
        expect(cipherText).to.deep.equal(await encryptSeededSaltedAES256(payload, rawRVK, nonce));

        const decrypted = await rvk.decryptSeededSaltedAES256(await cipherText, nonce);
        expect(decrypted).to.deep.equal(payload);
        expect(decrypted).to.not.deep.equal(await decryptSeededSaltedAES256(await cipherText, seed, nonce));
        expect(decrypted).to.deep.equal(await decryptSeededSaltedAES256(await cipherText, rawRVK, nonce));
    });

    it('Correctly gets different encrypt/decrypt results for different nonce', async () => {
        const realNonce = 473;
        const payload = new Uint8Array([1, 2, 3, 4, 5]);
        const cipherText = await rvk.encryptSeededSaltedAES256(payload, realNonce);
        expect(cipherText).to.deep.equal(await encryptSeededSaltedAES256(payload, rawRVK, realNonce));
        expect(cipherText).to.not.deep.equal(await encryptSeededSaltedAES256(payload, seed, realNonce));

        const wrongNonce = realNonce + 1;

        const decrypted = await rvk.decryptSeededSaltedAES256(await cipherText, wrongNonce);
        expect(decrypted).to.not.deep.equal(payload);
        expect(decrypted).to.not.deep.equal(await decryptSeededSaltedAES256(await cipherText, seed, wrongNonce));
        expect(decrypted).to.deep.equal(await decryptSeededSaltedAES256(await cipherText, rawRVK, wrongNonce));
    });

    it('Correctly generates the nullfier for arbitrary nonce', () => {
        const nonce = 473;
        const realNullifier = seedWrapper.generateNullifier(nonce);
        expect(realNullifier).to.not.deep.equal(generateSeededSaltedNullifier(rawRVK, nonce));
        expect(realNullifier).to.deep.equal(generateSeededSaltedNullifier(seed, nonce));
    });

    it('Correctly derives an external key from the seed', () => {
        const info = 'MyInfo';
        const salt = 1234;
        const length = 32;
        const real = seedWrapper.deriveKeyExternal(info, salt, length);
        const expected = deriveFromSeedExternal(seed, info, salt, length);
        expect(real).to.deep.equal(expected);
    });

    it('Throws for deriving an external key with info length 0', () => {
        const info = '';
        const salt = 1234;
        const length = 32;
        expect(() => seedWrapper.deriveKeyExternal(info, salt, length)).to.throw();
    });

    it('Throws for deriving an external key with info starting with elusiv', () => {
        const info = 'elusiv';
        const salt = 1234;
        const length = 32;
        expect(() => seedWrapper.deriveKeyExternal(info, salt, length)).to.throw();
    });

    it('Throws for deriving an external key with info in elusivInfos', () => {
        for (const info of elusivInfos) {
            const salt = 1234;
            const length = 32;
            expect(() => seedWrapper.deriveKeyExternal(info, salt, length)).to.throw();
        }
    });

    it('Throws dor deriving an external key with salt greater than the max uint32', () => {
        const info = 'MyInfo';
        const salt = 2 ** 32;
        const length = 32;
        expect(() => seedWrapper.deriveKeyExternal(info, salt, length)).to.throw();
    });
});
