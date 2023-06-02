import { expect } from 'chai';
import { stringToUtf8ByteCodes } from '../../src/sdk/utils/stringUtils.js';
import { zipSameLength } from '../../src/sdk/utils/utils.js';

describe('Test Conversion from string to utf8 byte codes', () => {
    const strings = [
        '',
        'a',
        'ab',
        'abkehrf9bnioklqmviueb43vailjekv473nilerbvhej',
    ];

    const stringBytes = [
        new Uint8Array([]),
        new Uint8Array([97]),
        new Uint8Array([97, 98]),
        new Uint8Array([97, 98, 107, 101, 104, 114, 102, 57, 98, 110,
            105, 111, 107, 108, 113, 109, 118, 105, 117,
            101, 98, 52, 51, 118, 97, 105, 108, 106, 101,
            107, 118, 52, 55, 51, 110, 105, 108, 101, 114,
            98, 118, 104, 101, 106]),
    ];

    zipSameLength<string, Uint8Array>(strings, stringBytes).forEach((pair) => {
        it(`Correctly parses valid string ${pair.fst}`, () => {
            expect(stringToUtf8ByteCodes(pair.fst)).to.deep.equal(pair.snd);
        });
    });
});
