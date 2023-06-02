import { expect } from 'chai';
import { bytesToBs58, bs58ToBytes } from '../../src/sdk/utils/base58Utils.js';

describe('Base 58 conversion tests', () => {
    it('Encodes an empty Uint8Array to base 58', () => {
        const bytes = new Uint8Array();
        const base58 = bytesToBs58(bytes);
        expect(base58).to.equal('');
    });

    it('Decodes an empty base 58 string to Uint8Array', () => {
        const base58 = '';
        const bytes = bs58ToBytes(base58);
        expect(bytes).to.deep.equal(new Uint8Array());
    });

    it('Encodes a Publickey to base 58', () => {
        const keyBytes = new Uint8Array([
            155, 188, 100, 15, 206, 129, 110, 4,
            87, 9, 192, 35, 121, 75, 249, 44,
            191, 247, 152, 132, 83, 162, 226, 96,
            154, 219, 93, 216, 162, 81, 220, 83,
        ]);
        const bs58Key = bytesToBs58(keyBytes);

        expect(bs58Key).to.equal('BUvooiSyuhZhWq3YzjKQqGo2m9AAePV2WLG4Mf4sXGv6');
    });

    it('Decodes a Publickey from base 58', () => {
        const bs58Key = 'Dd1k91cWt84qJoQr3FT7EXQpSaMtZtwPwdho7RbMWtEV';
        const keyBytes = bs58ToBytes(bs58Key);

        expect(keyBytes).to.deep.equal(new Uint8Array([
            187, 133, 254, 67, 98, 31, 212, 129,
            162, 216, 211, 18, 50, 251, 94, 180,
            217, 128, 218, 108, 62, 208, 25, 240,
            85, 76, 85, 127, 187, 29, 143, 66,
        ]));
    });

    it('Encodes a Sig to base 58', () => {
        const keyBytes = new Uint8Array([
            179, 203, 164, 47, 121, 145, 65, 28, 197, 194, 222,
            9, 104, 210, 96, 28, 142, 240, 187, 163, 191, 227,
            228, 255, 202, 167, 217, 237, 127, 172, 199, 112, 46,
            207, 9, 190, 226, 70, 74, 136, 49, 60, 225, 110,
            175, 174, 26, 254, 203, 237, 181, 174, 211, 124, 115,
            44, 215, 141, 47, 185, 33, 83, 159, 15,
        ]);
        const bs58Key = bytesToBs58(keyBytes);

        expect(bs58Key).to.equal('4bVXeck6kaWa3mysRUdVMARiCCa3WjSzw5dbQGptRT8jXtfGBJGPB9bfGSDCqyEtXrdjgcBic2BH2yXJibC12z9t');
    });

    it('Decodes a Sig from base 58', () => {
        const bs58Key = '5icnPJJDDkwk7JAysgKZB2iSW1bHTvQDuPkbzN8X26GVrswY5eH1gQTRpfjN5ErYfZn7j3wJb39LiHeHLYZDdmn3';
        const keyBytes = bs58ToBytes(bs58Key);

        expect(keyBytes).to.deep.equal(new Uint8Array([
            235, 244, 244, 239, 126, 233, 224, 26, 62, 163, 29,
            195, 165, 118, 78, 12, 248, 133, 231, 71, 112, 36,
            25, 142, 239, 38, 254, 134, 33, 145, 75, 191, 95,
            179, 76, 169, 65, 151, 81, 82, 183, 110, 139, 117,
            91, 21, 37, 114, 141, 38, 197, 10, 64, 18, 150,
            192, 87, 80, 228, 103, 207, 144, 158, 4,
        ]));
    });
});
