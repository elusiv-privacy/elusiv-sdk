import { PublicKey } from '@solana/web3.js';
import {
    decryptAES256CTRWithKey, decryptSeededSaltedAES256, encryptAES256CTRWithKey, EncryptedValue, encryptSeededSaltedAES256,
} from './encryption.js';
import { generateCommMetadataKey, generateId, generateSeededSaltedAES256Key } from './keyDerivation.js';

// Wraps root viewing key operations in closures to avoid passing the raw rvk around everywhere & it
// not being accidentally loggable at run time
export class RVKWrapper {
    private readonly getIdentifierKeyClosure: (nonce: number) => PublicKey;

    private readonly generateAES256KeyClosure: (nonce: number) => Uint8Array;

    private readonly encryptAES256Closure: (payload: Uint8Array, nonce: number) => Promise<EncryptedValue>;

    private readonly decryptAES256Closure: (cipherText: EncryptedValue, nonce: number) => Promise<Uint8Array>;

    private readonly getRootViewingKeyClosure: () => Uint8Array;

    private readonly encryptCommMetadataClosure: (metadata: Uint8Array, commHash: Uint8Array) => Promise<EncryptedValue>;

    private readonly decryptCommMetadataClosure: (metadata: Uint8Array, commHash: Uint8Array) => Promise<Uint8Array>;

    public constructor(rvk: Uint8Array) {
        this.getRootViewingKeyClosure = () => rvk;
        this.generateAES256KeyClosure = (nonce: number) => generateSeededSaltedAES256Key(rvk, nonce);
        this.getIdentifierKeyClosure = (nonce: number) => new PublicKey(generateId(rvk, nonce));
        this.encryptAES256Closure = (payload: Uint8Array, nonce: number) => encryptSeededSaltedAES256(payload, rvk, nonce);
        this.decryptAES256Closure = (cipherText: EncryptedValue, nonce: number) => decryptSeededSaltedAES256(cipherText, rvk, nonce);
        this.encryptCommMetadataClosure = (metadata: Uint8Array, commHash: Uint8Array) => {
            const key = generateCommMetadataKey(rvk, commHash);
            return encryptAES256CTRWithKey(metadata, commHash.slice(0, 16), key);
        };
        this.decryptCommMetadataClosure = (metadata: Uint8Array, commHash: Uint8Array) => {
            const key = generateCommMetadataKey(rvk, commHash);
            return decryptAES256CTRWithKey({ cipherText: metadata, iv: commHash.slice(0, 16) }, key);
        };
    }

    public getRootViewingKey(): Uint8Array {
        return this.getRootViewingKeyClosure();
    }

    public getIdentifierKey(nonce: number): PublicKey {
        return this.getIdentifierKeyClosure(nonce);
    }

    public generateDecryptionKey(nonce: number): Uint8Array {
        return this.generateAES256KeyClosure(nonce);
    }

    public async encryptSeededSaltedAES256(payload: Uint8Array, nonce: number): Promise<EncryptedValue> {
        return this.encryptAES256Closure(payload, nonce);
    }

    public async decryptSeededSaltedAES256(cipherText: EncryptedValue, nonce: number): Promise<Uint8Array> {
        return this.decryptAES256Closure(cipherText, nonce);
    }

    public async encryptMetadata(metadata: Uint8Array, commHash: Uint8Array): Promise<EncryptedValue> {
        return this.encryptCommMetadataClosure(metadata, commHash);
    }

    public async decryptMetadata(metadata: Uint8Array, commHash: Uint8Array): Promise<Uint8Array> {
        return this.decryptCommMetadataClosure(metadata, commHash);
    }
}
