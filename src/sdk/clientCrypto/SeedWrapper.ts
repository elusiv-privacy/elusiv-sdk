import { deriveFromSeedExternal, generateRootViewingKey, generateSeededSaltedNullifier } from './keyDerivation.js';
import { RVKWrapper } from './RVKWrapper.js';

// Wraps seed operations in closures to avoid passing the seed around everywhere & it
// not being accidentally loggable at run time
export class SeedWrapper {
    private rvk: RVKWrapper;

    private readonly generateNullifierClosure: (nonce: number) => Uint8Array;

    private readonly deriveKeyExternalClosure: (info: string, salt: number, length: number) => Uint8Array;

    public constructor(seed: Uint8Array) {
        // Seed functions
        this.generateNullifierClosure = (nonce: number) => generateSeededSaltedNullifier(seed, nonce);
        this.deriveKeyExternalClosure = (info: string, salt: number, length: number) => deriveFromSeedExternal(seed, info, salt, length);
        const rootViewingKey = generateRootViewingKey(seed);
        this.rvk = new RVKWrapper(rootViewingKey);
    }

    public getRootViewingKeyWrapper(): RVKWrapper {
        return this.rvk;
    }

    public deriveKeyExternal(info: string, salt: number, length: number): Uint8Array {
        return this.deriveKeyExternalClosure(info, salt, length);
    }

    public generateNullifier(nonce: number): Uint8Array {
        return this.generateNullifierClosure(nonce);
    }
}
