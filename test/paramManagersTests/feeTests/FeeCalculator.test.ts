import { expect } from 'chai';
import { IncompleteSendQuadraProofInputs } from 'elusiv-circuits';
import { bytesToBigIntLE } from '@elusiv/serialization';
import { getComputationFeeTotal } from '../../../src/public/Fee.js';
import { FeeCalculator } from '../../../src/sdk/paramManagers/fee/FeeCalculator.js';
import { FeeAccBorsh } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/FeeAccBorsh.js';
import { PDAAccountDataBorsh } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/PDAAccountDataBorsh.js';
import { ProgramFeeBorsh } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/ProgramFeeBorsh.js';

describe('Fee calculator tests', () => {
    const feeAcc = new FeeAccBorsh(
        new PDAAccountDataBorsh(255, 0),
        new ProgramFeeBorsh(
            BigInt('5000'),
            BigInt('0'),
            BigInt('0'),
            BigInt('10000'),
            BigInt('40000'),
            BigInt('0'),
            BigInt('0'),
            BigInt('62'),
        ),
    );

    const feeCalculator: FeeCalculator = new FeeCalculator(feeAcc, 0);

    it('Correctly calculates send tx fee for 1 commitment', () => {
        const roots = [
            new Uint8Array([
                45, 176, 198, 197, 25, 47, 235, 11, 9, 198, 212, 243, 254, 36, 220, 91,
                241, 162, 222, 70, 160, 243, 213, 175, 163, 188, 87, 40, 195, 202, 187,
                11,
            ]),
            new Uint8Array([0]),
            new Uint8Array([0]),
            new Uint8Array([0]),
        ].map(bytesToBigIntLE);
        const nHashes = [
            new Uint8Array([
                252, 207, 145, 26, 173, 49, 84, 63, 72, 150, 198, 141, 105, 64, 225,
                94, 138, 97, 50, 76, 110, 85, 92, 220, 84, 225, 203, 222, 97, 23, 117,
                22,
            ]),
            new Uint8Array([0]),
            new Uint8Array([0]),
            new Uint8Array([0]),
        ].map(bytesToBigIntLE);

        const recentCommIndex = BigInt(1938);

        const feeVersion = BigInt('0');
        const amount = BigInt('1000000000');
        const tokenId = BigInt('0');

        const inputs: IncompleteSendQuadraProofInputs = {
            // Unused
            commitmentHashes: [],
            // Unused
            nullifiers: [],
            // Unused
            balances: [],
            // Unused
            assocCommIndexes: [],
            // Unused
            openings: [],
            // Unused
            position: [],
            roots,
            nHashes,
            feeVersion,
            tokenId,
            hashedData: {
                // Unused
                recipient: BigInt(0),
                identifier: BigInt(0),
                iv: BigInt(0),
                encryptedOwner: BigInt(0),
                solanaPayId: BigInt(0),
                isAssociatedTokenAccount: true,
                optionalFeeCollector: BigInt(0),
                optionalFeeAmount: BigInt(0),
            },
        };

        const fee = feeCalculator.getSendFee(inputs, amount, Number(recentCommIndex), 0, true);
        const total = getComputationFeeTotal(fee);
        expect(total).to.equal(405000);
    });

    it('Correctly calculates send tx fee for 2 commitments', () => {
        const roots = [
            new Uint8Array([
                45, 176, 198, 197, 25, 47, 235, 11, 9, 198, 212, 243, 254, 36, 220, 91,
                241, 162, 222, 70, 160, 243, 213, 175, 163, 188, 87, 40, 195, 202, 187,
                11,
            ]),
            new Uint8Array([0]),
            new Uint8Array([0]),
            new Uint8Array([0]),
        ].map(bytesToBigIntLE);
        const nHashes = [
            new Uint8Array([
                252, 207, 145, 26, 173, 49, 84, 63, 72, 150, 198, 141, 105, 64, 225,
                94, 138, 97, 50, 76, 110, 85, 92, 220, 84, 225, 203, 222, 97, 23, 117,
                22,
            ]),
            new Uint8Array([
                252, 207, 145, 26, 173, 49, 84, 63, 72, 150, 198, 141, 105, 64, 225,
                94, 138, 97, 50, 76, 110, 85, 92, 220, 84, 225, 203, 222, 97, 23, 117,
                22,
            ]),
            new Uint8Array([0]),
            new Uint8Array([0]),
        ].map(bytesToBigIntLE);

        const recentCommIndex = BigInt(1938);

        const feeVersion = BigInt('0');
        const amount = BigInt('1000000000');
        const tokenId = BigInt('0');

        const inputs: IncompleteSendQuadraProofInputs = {
            // Unused
            commitmentHashes: [],
            // Unused
            nullifiers: [],
            // Unused
            balances: [],
            // Unused
            assocCommIndexes: [],
            // Unused
            openings: [],
            // Unused
            position: [],
            roots,
            nHashes,
            feeVersion,
            tokenId,
            hashedData: {
                // Unused
                recipient: BigInt(0),
                identifier: BigInt(0),
                iv: BigInt(0),
                encryptedOwner: BigInt(0),
                solanaPayId: BigInt(0),
                isAssociatedTokenAccount: true,
                optionalFeeCollector: BigInt(0),
                optionalFeeAmount: BigInt(0),
            },
        };

        const fee = feeCalculator.getSendFee(inputs, amount, Number(recentCommIndex), 0, true);
        const total = getComputationFeeTotal(fee);
        expect(total).to.equal(405000);
    });

    it('Correctly calculates send tx fee for 3 commitments', () => {
        const roots = [
            new Uint8Array([
                45, 176, 198, 197, 25, 47, 235, 11, 9, 198, 212, 243, 254, 36, 220, 91,
                241, 162, 222, 70, 160, 243, 213, 175, 163, 188, 87, 40, 195, 202, 187,
                11,
            ]),
            new Uint8Array([0]),
            new Uint8Array([0]),
            new Uint8Array([0]),
        ].map(bytesToBigIntLE);
        const nHashes = [
            new Uint8Array([
                252, 207, 145, 26, 173, 49, 84, 63, 72, 150, 198, 141, 105, 64, 225,
                94, 138, 97, 50, 76, 110, 85, 92, 220, 84, 225, 203, 222, 97, 23, 117,
                22,
            ]),
            new Uint8Array([
                252, 207, 145, 26, 173, 49, 84, 63, 72, 150, 198, 141, 105, 64, 225,
                94, 138, 97, 50, 76, 110, 85, 92, 220, 84, 225, 203, 222, 97, 23, 117,
                22,
            ]),
            new Uint8Array([
                252, 207, 145, 26, 173, 49, 84, 63, 72, 150, 198, 141, 105, 64, 225,
                94, 138, 97, 50, 76, 110, 85, 92, 220, 84, 225, 203, 222, 97, 23, 117,
                22,
            ]),
            new Uint8Array([0]),
        ].map(bytesToBigIntLE);

        const recentCommIndex = BigInt(1938);

        const feeVersion = BigInt('0');
        const amount = BigInt('1000000000');
        const tokenId = BigInt('0');

        const inputs: IncompleteSendQuadraProofInputs = {
            // Unused
            commitmentHashes: [],
            // Unused
            nullifiers: [],
            // Unused
            balances: [],
            // Unused
            assocCommIndexes: [],
            // Unused
            openings: [],
            // Unused
            position: [],
            roots,
            nHashes,
            feeVersion,
            tokenId,
            hashedData: {
                // Unused
                recipient: BigInt(0),
                identifier: BigInt(0),
                iv: BigInt(0),
                encryptedOwner: BigInt(0),
                solanaPayId: BigInt(0),
                isAssociatedTokenAccount: true,
                optionalFeeCollector: BigInt(0),
                optionalFeeAmount: BigInt(0),
            },
        };

        const fee = feeCalculator.getSendFee(inputs, amount, Number(recentCommIndex), 0, true);
        const total = getComputationFeeTotal(fee);
        expect(total).to.equal(410000);
    });

    it('Correctly calculates transaction count for 4 commitments', () => {
        // const hashedInputs = bytesToBigIntLE(new Uint8Array([
        //     57, 29, 224, 255, 78, 152, 79, 69, 79, 102, 55, 189, 153, 255, 73, 246, 38, 17,
        //     129, 49, 39, 182, 71, 195, 78, 63, 141, 245, 157, 145, 68, 5,
        // ]));
        const roots = [
            new Uint8Array([
                45, 176, 198, 197, 25, 47, 235, 11, 9, 198, 212, 243, 254, 36, 220, 91,
                241, 162, 222, 70, 160, 243, 213, 175, 163, 188, 87, 40, 195, 202, 187,
                11,
            ]),
            new Uint8Array([0]),
            new Uint8Array([0]),
            new Uint8Array([0]),
        ].map(bytesToBigIntLE);
        const nHashes = [
            new Uint8Array([
                252, 207, 145, 26, 173, 49, 84, 63, 72, 150, 198, 141, 105, 64, 225,
                94, 138, 97, 50, 76, 110, 85, 92, 220, 84, 225, 203, 222, 97, 23, 117,
                22,
            ]),
            new Uint8Array([
                33, 253, 8, 35, 52, 65, 118, 119, 97, 202, 81, 80, 147, 73, 16, 181,
                10, 13, 175, 201, 109, 172, 108, 67, 176, 73, 60, 178, 126, 100, 250,
                24,
            ]),
            new Uint8Array([
                198, 59, 92, 92, 190, 47, 142, 254, 110, 92, 152, 184, 44, 7, 108, 142,
                64, 159, 224, 219, 240, 238, 106, 111, 49, 28, 184, 204, 94, 197, 151,
                6,
            ]),
            new Uint8Array([
                122, 160, 17, 175, 224, 221, 7, 152, 55, 69, 177, 230, 158, 101, 246,
                174, 22, 54, 209, 28, 201, 192, 47, 139, 88, 115, 29, 62, 169, 221, 21,
                38,
            ]),
        ].map(bytesToBigIntLE);

        // const outputComm = bytesToBigIntLE(new Uint8Array([
        //     210, 175, 75, 184, 82, 231, 116, 209, 221, 59, 200, 146, 65, 159, 127, 55, 172,
        //     91, 116, 123, 59, 149, 178, 14, 80, 8, 101, 128, 31, 214, 134, 34,
        // ]));
        const recentCommIndex = BigInt(1938);

        const feeVersion = BigInt('0');
        const amount = BigInt('1000000000');
        const tokenId = BigInt('0');

        const inputs: IncompleteSendQuadraProofInputs = {
            // Unused
            commitmentHashes: [],
            // Unused
            nullifiers: [],
            // Unused
            balances: [],
            // Unused
            assocCommIndexes: [],
            // Unused
            openings: [],
            // Unused
            position: [],
            roots,
            nHashes,
            feeVersion,
            tokenId,
            hashedData: {
                // Unused
                recipient: BigInt(0),
                identifier: BigInt(0),
                iv: BigInt(0),
                encryptedOwner: BigInt(0),
                solanaPayId: BigInt(0),
                isAssociatedTokenAccount: true,
                optionalFeeCollector: BigInt(0),
                optionalFeeAmount: BigInt(0),
            },
        };

        const fee = feeCalculator.getSendFee(inputs, amount, Number(recentCommIndex), 0, true);
        const total = getComputationFeeTotal(fee);
        expect(total).to.equal(415000);
    });
});
