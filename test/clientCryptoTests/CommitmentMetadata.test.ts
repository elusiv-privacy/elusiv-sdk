import { expect } from 'chai';
import { mergeUint8 } from 'elusiv-serialization';
import { COMMITMENT_METADATA_LENGTH } from 'elusiv-circuits';
import { seededRandomUNSAFE } from 'elusiv-cryptojs';
import { getTokenType } from '../../src/public/tokenTypes/TokenTypeFuncs.js';
import { CommitmentMetadata } from '../../src/sdk/clientCrypto/CommitmentMetadata.js';
import { MAX_UINT20, MAX_UINT32, MAX_UINT64 } from '../../src/constants.js';
import { encryptAES256CTRWithKey } from '../../src/sdk/clientCrypto/encryption.js';
import { RVKWrapper } from '../../src/sdk/clientCrypto/RVKWrapper.js';
import { generateCommMetadataKey } from '../../src/sdk/clientCrypto/keyDerivation.js';

describe('Commitmentment metadata tests', () => {
    let seed: Uint8Array;
    let commHash: Uint8Array;
    const randomness = seededRandomUNSAFE(42);

    beforeEach(() => {
        seed = randomBytes(randomness, 32);
        commHash = randomBytes(randomness, 32);
    });

    it('Correctly builds a commitment metadata object', () => {
        const nonce = 1;
        const tokenType = 2;
        const assocCommIndex = 3;
        const balance = 4n;

        const metadata = new CommitmentMetadata(nonce, getTokenType(tokenType), assocCommIndex, balance);

        expect(metadata.nonce).to.equal(nonce);
        expect(metadata.tokenType).to.equal(getTokenType(tokenType));
        expect(metadata.assocCommIndex).to.equal(assocCommIndex);
        expect(metadata.balance).to.equal(balance);
    });

    it('Correctly builds a commitment metadata object from a Uint8Array', () => {
        const nonce = 1;
        const tokenType = 2;
        const assocCommIndex = 3;
        const balance = 4n;

        const metadata = new CommitmentMetadata(nonce, getTokenType(tokenType), assocCommIndex, balance);

        const metadataFromBytes = CommitmentMetadata.fromBytes(metadata.toBytes());

        expect(metadataFromBytes.nonce).to.equal(nonce);
        expect(metadataFromBytes.tokenType).to.equal(getTokenType(tokenType));
        expect(metadataFromBytes.assocCommIndex).to.equal(assocCommIndex);
        expect(metadataFromBytes.balance).to.equal(balance);
    });

    it('Correctly encrypts and decrypts a commitment metadata object', async () => {
        const nonce = 1;
        const tokenType = 2;
        const assocCommIndex = 3;
        const balance = 4n;

        const rvk = new RVKWrapper(seed);

        const metadata = new CommitmentMetadata(nonce, getTokenType(tokenType), assocCommIndex, balance);

        const encryptedMetadata = await metadata.serializeAndEncrypt(rvk, commHash);

        const serialized = metadata.toBytes();
        const encrypted = await encryptAES256CTRWithKey(serialized, commHash.slice(0, 16), generateCommMetadataKey(rvk.getRootViewingKey(), commHash));
        expect(encryptedMetadata.cipherText).to.deep.equal(encrypted.cipherText);

        const decryptedMetadata = await CommitmentMetadata.deserializeAndDecrypt(encryptedMetadata.cipherText, rvk, commHash);

        expect(decryptedMetadata.nonce).to.equal(nonce);
        expect(decryptedMetadata.tokenType).to.equal(getTokenType(tokenType));
        expect(decryptedMetadata.assocCommIndex).to.equal(assocCommIndex);
        expect(decryptedMetadata.balance).to.equal(balance);
    });

    it('Fails to decrypt a commitment metadata object with a different key', async () => {
        const nonce = 1;
        const tokenType = 2;
        const assocCommIndex = 3;
        const balance = 4n;

        const rvk = new RVKWrapper(seed);

        const metadata = new CommitmentMetadata(nonce, getTokenType(tokenType), assocCommIndex, balance);

        const serialized = metadata.toBytes();
        const encryptedMetadata = await encryptAES256CTRWithKey(serialized, commHash.slice(0, 16), generateCommMetadataKey(rvk.getRootViewingKey().slice(0, commHash.length - 1), commHash));

        try {
            const decryptedMetadata = await CommitmentMetadata.deserializeAndDecrypt(encryptedMetadata.cipherText, rvk, commHash);

            expect(decryptedMetadata.nonce).to.not.equal(nonce);
            expect(decryptedMetadata.tokenType).to.not.equal(getTokenType(tokenType));
            expect(decryptedMetadata.assocCommIndex).to.not.equal(assocCommIndex);
            expect(decryptedMetadata.balance).to.not.equal(balance);
        }
        catch (e) {
            expect((e as Error).message).to.equal('Invalid token type');
        }
    });

    it('Fails to decrypt a commitment metadata object with a commhash', async () => {
        const nonce = 1;
        const tokenType = 2;
        const assocCommIndex = 3;
        const balance = 4n;

        const rvk = new RVKWrapper(seed);

        const metadata = new CommitmentMetadata(nonce, getTokenType(tokenType), assocCommIndex, balance);

        const serialized = metadata.toBytes();
        const encryptedMetadata = await encryptAES256CTRWithKey(serialized, commHash.slice(0, 16), generateCommMetadataKey(rvk.getRootViewingKey(), commHash.slice(0, commHash.length - 1)));

        try {
            const decryptedMetadata = await CommitmentMetadata.deserializeAndDecrypt(encryptedMetadata.cipherText, rvk, commHash);

            expect(decryptedMetadata.nonce).to.not.equal(nonce);
            expect(decryptedMetadata.tokenType).to.not.equal(getTokenType(tokenType));
            expect(decryptedMetadata.assocCommIndex).to.not.equal(assocCommIndex);
            expect(decryptedMetadata.balance).to.not.equal(balance);
        }
        catch (e) {
            expect((e as Error).message).to.equal('Invalid token type');
        }
    });

    it("Fails to parse a build a commitment metadata from a Uint8Array that's the incorrect length", () => {
        const nonce = 1;
        const tokenType = 2;
        const assocCommIndex = 3;
        const balance = 4n;

        const metadata = new CommitmentMetadata(nonce, getTokenType(tokenType), assocCommIndex, balance);

        const bytes = metadata.toBytes();

        expect(() => CommitmentMetadata.fromBytes(bytes.slice(0, bytes.length - 1))).to.throw('Invalid length for metadata');
        expect(() => CommitmentMetadata.fromBytes(mergeUint8([bytes, new Uint8Array([42])]))).to.throw('Invalid length for metadata');
    });

    it('Ensure the commitment metadata length is correct', () => {
        expect(COMMITMENT_METADATA_LENGTH).to.equal(CommitmentMetadata.fromBytes(new Uint8Array(COMMITMENT_METADATA_LENGTH)).toBytes().length);
        expect(COMMITMENT_METADATA_LENGTH).to.equal(17);
    });

    it('Throws with out of range parameters', () => {
        expect(() => new CommitmentMetadata(-1, getTokenType(0), 0, 0n)).to.throw('Invalid nonce');
        expect(() => new CommitmentMetadata(MAX_UINT32 + 1, getTokenType(0), 0, 0n)).to.throw('Invalid nonce');
        expect(() => new CommitmentMetadata(0, getTokenType(0), MAX_UINT20 + 1, 0n)).to.throw('Invalid assoc comm index');
        expect(() => new CommitmentMetadata(0, getTokenType(0), -1, 0n)).to.throw('Invalid assoc comm index');
        expect(() => new CommitmentMetadata(0, getTokenType(0), 0, -1n)).to.throw('Invalid amount');
        expect(() => new CommitmentMetadata(0, getTokenType(0), 0, MAX_UINT64 + BigInt(1))).to.throw('Invalid amount');
    });
});

function randomBytes(randomness: () => number, length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = Math.round(randomness() * 256);
    }
    return bytes;
}
