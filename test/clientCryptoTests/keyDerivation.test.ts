import { bytesToHex } from '@noble/hashes/utils';
import { expect } from 'chai';
import {
    generateId, generateRootViewingKey, generateSeededSaltedAES256Key, generateSeededSaltedIV, generateSeededSaltedNullifier,
} from '../../src/sdk/clientCrypto/keyDerivation';
import { GeneralSet } from '../../src/sdk/utils/GeneralSet';

const seeds : Uint8Array[] = [
    new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17]),
    new Uint8Array([11, 12, 13, 14, 15, 16, 17, 18, 19, 110, 111, 112, 113, 114, 115, 116, 117]),
];
const salts : number[] = [12345, 42];
const pairs : [Uint8Array, Uint8Array, number, number][] = [
    [seeds[0], seeds[0], salts[0], salts[0]],
    [seeds[0], seeds[1], salts[0], salts[0]],
    [seeds[0], seeds[0], salts[0], salts[1]],
    [seeds[0], seeds[1], salts[0], salts[1]],
];

describe('Nullifier tests', () => {
    // Pairs of params for generating 2 nullifiers
    pairs.forEach(([seed1, seed2, salt1, salt2]) => {
        const sameSeed = seed1 === seed2;
        const sameSalt = salt1 === salt2;
        const bothSame = sameSalt && sameSeed;
        it(`Generates ${bothSame ? 'same' : 'different '} nullifiers for same seed: ${sameSeed} and same salt: ${sameSalt}`, () => {
            const n1 = generateSeededSaltedNullifier(seed1, salt1);
            const n2 = generateSeededSaltedNullifier(seed2, salt2);

            if (bothSame) {
                expect(n1.toString()).to.equal(n2.toString());
            }
            else {
                expect(n1.toString()).to.not.equal(n2.toString());
            }
        });
    });
});

describe('ID tests', () => {
    // Pairs of params for generating 2 ids
    pairs.forEach(([seed1, seed2, salt1, salt2]) => {
        const sameSeed = seed1 === seed2;
        const sameSalt = salt1 === salt2;
        const bothSame = sameSalt && sameSeed;

        it(`Generates ${bothSame ? 'same' : 'different '} send ID for same seed: ${sameSeed} and same salt: ${sameSalt} with NO refKey`, () => {
            const id1 = generateId(seed1, salt1);
            const id2 = generateId(seed2, salt2);
            if (bothSame) {
                expect(id1).to.deep.equal(id2, 'Different Id');
            }
            else {
                expect(id1).to.not.deep.equal(id2, 'Same Id');
            }
        });
    });
});

describe('All kdfs tests', () => {
    pairs.forEach(([seed1, seed2, salt1, salt2]) => {
        const sameSeed = seed1 === seed2;
        const sameSalt = salt1 === salt2;
        const bothSame = sameSalt && sameSeed;

        if (bothSame) {
            it('Doesn\'t collide even with same seed and salt for different domains', () => {
                const root = generateRootViewingKey(seed1);
                const keys = [
                    root,
                    generateRootViewingKey(root),
                    generateId(root, salt1),
                    generateId(seed1, salt1),
                    generateSeededSaltedAES256Key(root, salt1),
                    generateSeededSaltedAES256Key(seed1, salt1),
                    generateSeededSaltedIV(root, salt1),
                    generateSeededSaltedIV(seed1, salt1),
                    generateSeededSaltedNullifier(root, salt1),
                    generateSeededSaltedNullifier(seed1, salt1),
                ];
                const asSet = new GeneralSet<Uint8Array>(bytesToHex);
                asSet.addArr(keys);
                expect(asSet.toArray().length).to.equal(keys.length);
            });
        }
    });
});
