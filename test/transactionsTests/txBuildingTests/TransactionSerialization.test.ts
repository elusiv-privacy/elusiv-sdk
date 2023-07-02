import { MessageCompiledInstruction, PublicKey, SignaturePubkeyPair } from '@solana/web3.js';
import { expect } from 'chai';
import { SendQuadraPublicInputs, SendQuadraProof, COMMITMENT_METADATA_LENGTH } from 'elusiv-circuits';
import { Groth16Proof, ProofPointG1, ProofPointG2 } from 'elusiv-circuits/dist/proofGeneration';
import { MontScalar } from '@elusiv/cryptojs';
import { bigIntToUint8ArrLE, padLE, zeros } from '@elusiv/serialization';
import { Fee } from '../../../src/public/Fee.js';
import { JoinSplitSerializedJSON } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/JoinSplitBorsh.js';
import { SendPublicInputsSerializedJSON } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/SendPublicInputsBorsh.js';
import {
    CommitmentMetadataSerialized,
    DataSerialized, RawG1A, RawG2A, RawProof, SendProofSerialized, TxInstructionSerialized, U256Serialized,
} from '../../../src/sdk/transactions/txBuilding/serializedTypes/types.js';
import { TransactionSerialization } from '../../../src/sdk/transactions/txBuilding/wardenSerialization/TransactionSerialization';
import { stringToUtf8ByteCodes } from '../../../src/sdk/utils/stringUtils.js';

const U256Values: Uint8Array[] = [
    Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
    Uint8Array.from([144, 238, 210, 91, 102, 126, 178, 175, 230, 20, 16, 144, 241, 42, 206, 115, 183, 244, 8, 236, 67, 254, 76, 163, 184, 12, 95, 218, 210, 6, 172, 31]),
    Uint8Array.from([160, 152, 240, 154, 125, 95, 44, 0, 42, 189, 29, 87, 179, 155, 10, 89, 245, 1, 79, 25, 75, 149, 190, 11, 166, 112, 223, 154, 50, 222, 24, 197]),
];

const keys: PublicKey[] = [
    new PublicKey('3SkE34PVeGck2ArEffFKjihrQgURsvnoTAhitsNXNzXd'),
    new PublicKey('BhREyEsP3YAtQbTCrKcXgTNTeaq9gdjWji3Nz4d8Q1P2'),
    new PublicKey('AaapDdocMdZQaMAF1gXqKX2ixd7YYSxTpKHMcsbcF318'),
    new PublicKey('ALiQdX94fYbGUt8ar6chuAN1nj8g8bKSgJ7qV3W7bPsS'),
    new PublicKey('FUXPuLmdHMLfwEoHJPrtPj1cLJbyEYGZdkomXsNa7u3L'),
];

const sigs: Buffer[] = [
    Buffer.from([
        255, 199, 122, 29, 110, 152, 75, 58, 171, 170, 244,
        20, 211, 197, 7, 150, 172, 113, 232, 114, 98, 164,
        30, 132, 163, 124, 45, 193, 51, 117, 119, 255, 138,
        46, 152, 186, 112, 229, 82, 143, 78, 115, 1, 249,
        209, 199, 19, 23, 143, 134, 228, 54, 49, 153, 239,
        160, 164, 22, 72, 111, 246, 7, 189, 6,
    ]),
    Buffer.from([
        254, 147, 138, 2, 172, 219, 40, 243, 83, 24, 174,
        106, 59, 34, 139, 58, 6, 208, 16, 102, 213, 83,
        160, 113, 58, 179, 218, 74, 37, 85, 111, 48, 143,
        78, 75, 73, 236, 144, 162, 138, 15, 6, 122, 123,
        228, 213, 103, 118, 44, 211, 49, 166, 57, 133, 70,
        140, 179, 11, 68, 32, 189, 145, 78, 13,
    ]),
    Buffer.from([
        31, 117, 249, 110, 27, 203, 194, 57, 189, 23, 100,
        191, 46, 168, 183, 222, 132, 34, 217, 22, 120, 88,
        171, 218, 39, 88, 190, 181, 175, 253, 239, 202, 187,
        126, 213, 28, 144, 55, 177, 66, 89, 0, 146, 28,
        122, 115, 203, 99, 83, 135, 137, 35, 118, 112, 47,
        38, 248, 239, 100, 210, 38, 81, 144, 105,
    ]),
    Buffer.from([
        2, 45, 180, 28, 41, 155, 236, 189, 59, 89, 66,
        33, 76, 141, 89, 145, 77, 79, 119, 104, 245, 111,
        28, 212, 24, 5, 139, 234, 249, 227, 245, 65, 38,
        194, 39, 88, 244, 183, 228, 198, 95, 236, 3, 241,
        179, 96, 188, 177, 187, 234, 252, 198, 35, 4, 41,
        207, 42, 130, 245, 18, 246, 163, 38, 4,
    ]),

];

describe('U256 Serialization tests', () => {
    U256Values.forEach((val) => {
        it('correctly serializes 32 byte values', () => {
            expect(TransactionSerialization['serializeU256Bytes'](val)).to.deep.equal(Array.from(val));
        });
    });

    U256Values.forEach((val) => {
        it('correctly pads too short 32 byte values', () => {
            const shortened = val.slice(0, 31);
            expect(TransactionSerialization['serializeU256Bytes'](shortened)).to.deep.equal(Array.from(padLE(shortened, 32)));
        });
    });

    U256Values.forEach((val) => {
        it('throws for too long 32 byte values', () => {
            const tooLong = Array.from(val).push(0);
            const tooLongBytes = new Uint8Array(tooLong);
            expect(() => TransactionSerialization['serializeU256Bytes'](tooLongBytes)).to.throw();
        });
    });
});

describe('Key serialization tests', () => {
    it('correctly serializes empty key array', () => {
        expect(TransactionSerialization['serializeKeys']([])).to.deep.equal([[0]]);
    });

    it('correctly serializes one key array', () => {
        expect(TransactionSerialization['serializeKeys']([keys[0]])).to.deep.equal([[1], Array.from(keys[0].toBuffer())]);
    });

    it('correctly serializes uneven length key array', () => {
        expect(TransactionSerialization['serializeKeys']([keys[0], keys[1], keys[2]])).to.deep.equal([[3], Array.from(keys[0].toBuffer()), Array.from(keys[1].toBuffer()), Array.from(keys[2].toBuffer())]);
    });

    it('correctly serializes even length key array', () => {
        expect(TransactionSerialization['serializeKeys']([keys[0], keys[1], keys[2], keys[3]])).to.deep.equal([[4], Array.from(keys[0].toBuffer()), Array.from(keys[1].toBuffer()), Array.from(keys[2].toBuffer()), Array.from(keys[3].toBuffer())]);
    });
});

describe('Signature Serialization tests', () => {
    it('correctly serializes empty signature array', () => {
        expect(TransactionSerialization['serializeSignatures']([])).to.deep.equal([[0]]);
    });

    it('correctly serializes one signature array', () => {
        const formatted: SignaturePubkeyPair = { signature: sigs[0], publicKey: keys[0] };
        expect(TransactionSerialization['serializeSignatures']([formatted])).to.deep.equal([[1], Array.from(sigs[0])]);
    });

    it('correctly serializes uneven length signature array', () => {
        const formatted: SignaturePubkeyPair[] = [];
        for (let i = 0; i < 3; i++) {
            formatted.push({ signature: sigs[i], publicKey: keys[i] });
        }
        expect(TransactionSerialization['serializeSignatures'](formatted)).to.deep.equal([[3], Array.from(sigs[0]), Array.from(sigs[1]), Array.from(sigs[2])]);
    });

    it('correctly serializes even length signature array', () => {
        const formatted: SignaturePubkeyPair[] = [];
        for (let i = 0; i < 4; i++) {
            formatted.push({ signature: sigs[i], publicKey: keys[i] });
        }
        expect(TransactionSerialization['serializeSignatures'](formatted)).to.deep.equal([[4], Array.from(sigs[0]), Array.from(sigs[1]), Array.from(sigs[2]), Array.from(sigs[3])]);
    });

    it('correctly serializes null signature', () => {
        const formatted: SignaturePubkeyPair = { signature: null, publicKey: keys[0] };
        expect(TransactionSerialization['serializeSignatures']([formatted])).to.deep.equal([[1], Array.from(zeros(64))]);
    });
});

describe('Compiled Instruction Serialization tests', () => {
    it('Correctly serializes empty compiled instruction', () => {
        const emtpy: MessageCompiledInstruction = { programIdIndex: 0, accountKeyIndexes: [], data: Uint8Array.from([]) };
        const expected: TxInstructionSerialized = { programIdIndex: 0, accounts: [[0]], data: [[0]] };
        expect(TransactionSerialization['serializeMessageCompiledIx'](emtpy)).to.deep.equal(expected);
    });

    it('Correctly serializes zero-filled compiled instruction', () => {
        const zeroFilled: MessageCompiledInstruction = { programIdIndex: 0, accountKeyIndexes: [0, 0, 0], data: Uint8Array.from([0, 0, 0, 0]) };
        const expected: TxInstructionSerialized = { programIdIndex: 0, accounts: [[3], 0, 0, 0], data: [[4], 0, 0, 0, 0] };
        expect(TransactionSerialization['serializeMessageCompiledIx'](zeroFilled)).to.deep.equal(expected);
    });

    it('Correctly serializes compiled instruction', () => {
        const filled: MessageCompiledInstruction = { programIdIndex: 1, accountKeyIndexes: [0, 1, 2], data: Uint8Array.from([1, 2, 3, 4]) };
        const expected: TxInstructionSerialized = { programIdIndex: 1, accounts: [[3], 0, 1, 2], data: [[4], 1, 2, 3, 4] };
        expect(TransactionSerialization['serializeMessageCompiledIx'](filled)).to.deep.equal(expected);
    });

    it('Correctly serializes empty array of compiled ixs', () => {
        const empty: MessageCompiledInstruction[] = [];
        const expected: DataSerialized<TxInstructionSerialized> = [[0]];
        expect(TransactionSerialization['serializeMessageCompiledIxs'](empty)).to.deep.equal(expected);
    });

    it('Correctly serializes even length filled array of compiled ixs', () => {
        const filled: MessageCompiledInstruction[] = [
            { programIdIndex: 0, accountKeyIndexes: [0, 0, 0], data: Uint8Array.from([0, 0, 0, 0]) },
            { programIdIndex: 1, accountKeyIndexes: [0, 1, 2], data: Uint8Array.from([1, 2, 3, 4]) },
        ];
        const expected: DataSerialized<TxInstructionSerialized> = [
            [2],
            { programIdIndex: 0, accounts: [[3], 0, 0, 0], data: [[4], 0, 0, 0, 0] },
            { programIdIndex: 1, accounts: [[3], 0, 1, 2], data: [[4], 1, 2, 3, 4] },
        ];
        expect(TransactionSerialization['serializeMessageCompiledIxs'](filled)).to.deep.equal(expected);
    });

    it('Correctly serializes uneven length filled array of compiled ixs', () => {
        const filled: MessageCompiledInstruction[] = [
            { programIdIndex: 0, accountKeyIndexes: [0, 0, 0], data: Uint8Array.from([0, 0, 0, 0]) },
            { programIdIndex: 1, accountKeyIndexes: [0, 1, 2], data: Uint8Array.from([1, 2, 3, 4]) },
            { programIdIndex: 2, accountKeyIndexes: [0, 1, 2, 3], data: Uint8Array.from([1, 2, 3, 4, 5]) },
        ];
        const expected: DataSerialized<TxInstructionSerialized> = [
            [3],
            { programIdIndex: 0, accounts: [[3], 0, 0, 0], data: [[4], 0, 0, 0, 0] },
            { programIdIndex: 1, accounts: [[3], 0, 1, 2], data: [[4], 1, 2, 3, 4] },
            { programIdIndex: 2, accounts: [[4], 0, 1, 2, 3], data: [[5], 1, 2, 3, 4, 5] },
        ];
        expect(TransactionSerialization['serializeMessageCompiledIxs'](filled)).to.deep.equal(expected);
    });
});

describe('Base 58 serialization tests', () => {
    it('Correctly serializes empty base58 string', () => {
        const empty = '';
        const expected: number[] = [];
        expect(TransactionSerialization['serializeBase58'](empty)).to.deep.equal(expected);
    });

    it('Correctly serializes zero-filled base58 string', () => {
        const zeroFilled = '1111111111111111111111111111111111111111111111111111111111111111';
        const expected = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        expect(TransactionSerialization['serializeBase58'](zeroFilled)).to.deep.equal(expected);
    });

    it('Correctly serializes base58 string', () => {
        const filled = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        const expected = [0, 1, 17, 211, 142, 95, 201, 7, 31, 252, 210, 11, 74, 118, 60, 201, 174, 79, 37, 43, 180, 228, 143, 214, 106, 131, 94, 37, 42, 218, 147, 255, 72, 13, 109, 212, 61, 198, 42, 100, 17, 85, 165];
        expect(TransactionSerialization['serializeBase58'](filled)).to.deep.equal(expected);
    });
});

describe('U256 bigint serialization tests', () => {
    it('Correctly serializes zero', () => {
        const zero = BigInt(0);
        const expected = padLE(Uint8Array.from([0]), 32);
        expect(TransactionSerialization['serializeU256BigInt'](zero)).to.deep.equal(Array.from(expected));
    });

    it('Correctly serializes one', () => {
        const one = BigInt(1);
        const expected = padLE(Uint8Array.from([1]), 32);
        expect(TransactionSerialization['serializeU256BigInt'](one)).to.deep.equal(Array.from(expected));
    });

    it('Correctly serializes max u64', () => {
        const maxU64 = expBigInt(BigInt(2), BigInt(64)) - BigInt(1);
        const expected = padLE(Uint8Array.from([255, 255, 255, 255, 255, 255, 255, 255]), 32);
        expect(TransactionSerialization['serializeU256BigInt'](maxU64)).to.deep.equal(Array.from(expected));
    });

    it('Correctly serializes max u256', () => {
        const maxU256 = expBigInt(BigInt(2), BigInt(256)) - BigInt(1);
        const expected = [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255];
        expect(TransactionSerialization['serializeU256BigInt'](maxU256)).to.deep.equal(Array.from(expected));
    });

    it('Correctly serializes max u256 - 1', () => {
        const maxU256MinusOne = expBigInt(BigInt(2), BigInt(256)) - BigInt(2);
        const expected = [254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255];
        expect(TransactionSerialization['serializeU256BigInt'](maxU256MinusOne)).to.deep.equal(Array.from(expected));
    });
});

describe('G1 serialization tests', () => {
    it('Correctly serializes zero', () => {
        const zero: ProofPointG1 = [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar, false];
        const expected: RawG1A = {
            x: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
            y: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
            infinity: false,
        };

        expect(TransactionSerialization['serializeG1Point'](zero)).to.deep.equal(expected);
    });

    it('Correctly serializes one', () => {
        const one: ProofPointG1 = [Uint8Array.from([1]) as MontScalar, Uint8Array.from([1]) as MontScalar, false];
        const expected: RawG1A = {
            x: Array.from(padLE(Uint8Array.from([1]), 32)) as U256Serialized,
            y: Array.from(padLE(Uint8Array.from([1]), 32)) as U256Serialized,
            infinity: false,
        };

        expect(TransactionSerialization['serializeG1Point'](one)).to.deep.equal(expected);
    });

    it('Correctly serializes max u64', () => {
        const maxU64 = expBigInt(BigInt(2), BigInt(64)) - BigInt(1);
        const maxU64Point: ProofPointG1 = [bigIntToUint8ArrLE(maxU64) as MontScalar, bigIntToUint8ArrLE(maxU64) as MontScalar, false];
        const expected: RawG1A = {
            x: Array.from(padLE(Uint8Array.from([255, 255, 255, 255, 255, 255, 255, 255]), 32)) as U256Serialized,
            y: Array.from(padLE(Uint8Array.from([255, 255, 255, 255, 255, 255, 255, 255]), 32)) as U256Serialized,
            infinity: false,
        };

        expect(TransactionSerialization['serializeG1Point'](maxU64Point)).to.deep.equal(expected);
    });

    it('Correctly serializes max u256', () => {
        const maxU256 = expBigInt(BigInt(2), BigInt(256)) - BigInt(1);
        const maxU256Point: ProofPointG1 = [bigIntToUint8ArrLE(maxU256) as MontScalar, bigIntToUint8ArrLE(maxU256) as MontScalar, false];
        const expected: RawG1A = {
            x: Array.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
            y: Array.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
            infinity: false,
        };

        expect(TransactionSerialization['serializeG1Point'](maxU256Point)).to.deep.equal(expected);
    });

    it('Correctly serializes max u256 - 1', () => {
        const maxU256MinusOne = expBigInt(BigInt(2), BigInt(256)) - BigInt(2);
        const maxU256MinusOnePoint: ProofPointG1 = [bigIntToUint8ArrLE(maxU256MinusOne) as MontScalar, bigIntToUint8ArrLE(maxU256MinusOne) as MontScalar, false];
        const expected: RawG1A = {
            x: Array.from([254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
            y: Array.from([254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
            infinity: false,
        };

        expect(TransactionSerialization['serializeG1Point'](maxU256MinusOnePoint)).to.deep.equal(expected);
    });

    it('Correctly serializes infinity', () => {
        const infinity: ProofPointG1 = [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar, true];
        const expected: RawG1A = {
            x: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
            y: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
            infinity: true,
        };

        expect(TransactionSerialization['serializeG1Point'](infinity)).to.deep.equal(expected);
    });

    it('Correctly serializes random point', () => {
        const randomPoint: ProofPointG1 = [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]) as MontScalar, Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]) as MontScalar, false];
        const expected: RawG1A = {
            x: Array.from(padLE(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), 32)) as U256Serialized,
            y: Array.from(padLE(Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]), 32)) as U256Serialized,
            infinity: false,
        };

        expect(TransactionSerialization['serializeG1Point'](randomPoint)).to.deep.equal(expected);
    });

    it('Correctly serializes random point with infinity', () => {
        const randomPoint: ProofPointG1 = [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]) as MontScalar, Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]) as MontScalar, true];
        const expected: RawG1A = {
            x: Array.from(padLE(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), 32)) as U256Serialized,
            y: Array.from(padLE(Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]), 32)) as U256Serialized,
            infinity: true,
        };

        expect(TransactionSerialization['serializeG1Point'](randomPoint)).to.deep.equal(expected);
    });
});

describe('G2 Serialization tests', () => {
    it('Correctly serializes zero', () => {
        const zero: ProofPointG2 = [
            [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar],
            [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar],
            false,
        ];
        const expected: RawG2A = {
            x: [Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized],
            y: [Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized],
            infinity: false,
        };

        expect(TransactionSerialization['serializeG2Point'](zero)).to.deep.equal(expected);
    });

    it('Correctly serializes one', () => {
        const one: ProofPointG2 = [
            [Uint8Array.from([1]) as MontScalar, Uint8Array.from([0]) as MontScalar],
            [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar],
            false,
        ];
        const expected: RawG2A = {
            x: [Array.from(padLE(Uint8Array.from([1]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized],
            y: [Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized],
            infinity: false,
        };

        expect(TransactionSerialization['serializeG2Point'](one)).to.deep.equal(expected);
    });

    it('Correctly serializes max u256', () => {
        const maxU256: ProofPointG2 = [
            [bigIntToUint8ArrLE(expBigInt(BigInt(2), BigInt(256)) - BigInt(1)) as MontScalar, bigIntToUint8ArrLE(expBigInt(BigInt(2), BigInt(256)) - BigInt(1)) as MontScalar],
            [bigIntToUint8ArrLE(expBigInt(BigInt(2), BigInt(256)) - BigInt(1)) as MontScalar, bigIntToUint8ArrLE(expBigInt(BigInt(2), BigInt(256)) - BigInt(1)) as MontScalar],
            false,
        ];
        const expected: RawG2A = {
            x: [
                Array.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
                Array.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
            ],
            y: [
                Array.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
                Array.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
            ],
            infinity: false,
        };
        expect(TransactionSerialization['serializeG2Point'](maxU256)).to.deep.equal(expected);
    });

    it('Correctly serializes infinity', () => {
        const infinity: ProofPointG2 = [
            [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar],
            [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar],
            true,
        ];
        const expected: RawG2A = {
            x: [Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized],
            y: [Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized],
            infinity: true,
        };

        expect(TransactionSerialization['serializeG2Point'](infinity)).to.deep.equal(expected);
    });

    it('Correctly serializes random point', () => {
        const randomPoint: ProofPointG2 = [
            [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]) as MontScalar, Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]) as MontScalar],
            [Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]) as MontScalar, Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]) as MontScalar],
            false,
        ];
        const expected: RawG2A = {
            x: [
                Array.from(padLE(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), 32)) as U256Serialized,
                Array.from(padLE(Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]), 32)) as U256Serialized,
            ],
            y: [
                Array.from(padLE(Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]), 32)) as U256Serialized,
                Array.from(padLE(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), 32)) as U256Serialized,
            ],
            infinity: false,
        };

        expect(TransactionSerialization['serializeG2Point'](randomPoint)).to.deep.equal(expected);
    });

    it('Correctly serializes max u256 -1 point', () => {
        const maxU256Minus1: ProofPointG2 = [
            [bigIntToUint8ArrLE(expBigInt(BigInt(2), BigInt(256)) - BigInt(2)) as MontScalar, bigIntToUint8ArrLE(expBigInt(BigInt(2), BigInt(256)) - BigInt(2)) as MontScalar],
            [bigIntToUint8ArrLE(expBigInt(BigInt(2), BigInt(256)) - BigInt(2)) as MontScalar, bigIntToUint8ArrLE(expBigInt(BigInt(2), BigInt(256)) - BigInt(2)) as MontScalar],
            false,
        ];
        const expected: RawG2A = {
            x: [
                Array.from([254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
                Array.from([254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
            ],
            y: [
                Array.from([254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
                Array.from([254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]) as U256Serialized,
            ],
            infinity: false,
        };
        expect(TransactionSerialization['serializeG2Point'](maxU256Minus1)).to.deep.equal(expected);
    });
});

describe('Serialize proof tests', () => {
    it('Correctly serializes zero proof', () => {
        const zeroProof: Groth16Proof = {
            pi_a: [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar, false],
            pi_b: [
                [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar],
                [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar],
                false,
            ],
            pi_c: [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar, false],
        };

        const expected: RawProof = {
            a: {
                x: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                y: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                infinity: false,
            },
            b: {
                x: [Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized],
                y: [Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized],
                infinity: false,
            },
            c: {
                x: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                y: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                infinity: false,
            },
        };
        expect(TransactionSerialization['serializeProof'](zeroProof)).to.deep.equal(expected);
    });

    it('Correctly serializes random proof', () => {
        const randomProof: Groth16Proof = {
            pi_a: [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]) as MontScalar, Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]) as MontScalar, false],
            pi_b: [
                [Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]) as MontScalar, Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]) as MontScalar],
                [Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]) as MontScalar, Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]) as MontScalar],
                false,
            ],
            pi_c: [Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]) as MontScalar, Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]) as MontScalar, false],
        };

        const expected: RawProof = {
            a: {
                x: Array.from(padLE(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), 32)) as U256Serialized,
                y: Array.from(padLE(Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]), 32)) as U256Serialized,
                infinity: false,
            },
            b: {
                x: [Array.from(padLE(Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), 32)) as U256Serialized],
                y: [Array.from(padLE(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]), 32)) as U256Serialized],
                infinity: false,
            },
            c: {
                x: Array.from(padLE(Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]), 32)) as U256Serialized,
                y: Array.from(padLE(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), 32)) as U256Serialized,
                infinity: false,
            },
        };
        expect(TransactionSerialization['serializeProof'](randomProof)).to.deep.equal(expected);
    });
});

describe('Serialize Join Split tests', () => {
    it('Correctly serializes zero Join Split', () => {
        const zero = new SendQuadraPublicInputs(
            [],
            [],
            BigInt(0),
            BigInt(0),
            BigInt(0),
            BigInt(0),
            BigInt(0),
            {
                isAssociatedTokenAccount: false,
                recipient: BigInt(0),
                identifier: BigInt(0),
                iv: BigInt(0),
                encryptedOwner: BigInt(0),
                solanaPayId: BigInt(0),
                optionalFeeAmount: BigInt(0),
                optionalFeeCollector: BigInt(0),
            },
            BigInt(0),
            BigInt(0),
        );
        const zeroFee: Fee = {
            tokenType: 'LAMPORTS',
            txFee: 0,
            privacyFee: 0,
            tokenAccRent: 0,
            extraFee: 0,
        };
        const expected: JoinSplitSerializedJSON = {
            input_commitments: [],
            output_commitment: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
            recent_commitment_index: 0,
            fee_version: 0,
            amount: 0,
            fee: 0,
            token_id: 0,
            optional_fee: {
                collector: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                amount: 0,
            },
            metadata: Array.from(padLE(Uint8Array.from([0]), COMMITMENT_METADATA_LENGTH)) as CommitmentMetadataSerialized,
        };

        expect(TransactionSerialization['serializeJoinSplit'](zero, zeroFee)).to.deep.equal(expected);
    });

    it('Correctly serializes random Join Split', () => {
        const random = new SendQuadraPublicInputs(
            [BigInt(1), BigInt(2), BigInt(3), BigInt(4)],
            [BigInt(4), BigInt(3), BigInt(2), BigInt(1)],
            BigInt(10),
            BigInt(2),
            BigInt(68),
            BigInt(3),
            BigInt(4),
            {
                isAssociatedTokenAccount: false,
                recipient: BigInt(2),
                identifier: BigInt(3),
                iv: BigInt(4),
                encryptedOwner: BigInt(5),
                solanaPayId: BigInt(6),
                optionalFeeAmount: BigInt(123),
                optionalFeeCollector: BigInt(45),
            },
            BigInt(56),
            BigInt(78),
        );
        const randomFee: Fee = {
            tokenType: 'USDT',
            txFee: 1,
            privacyFee: 2,
            tokenAccRent: 0,
            extraFee: 0,
        };
        const expected: JoinSplitSerializedJSON = {
            input_commitments: [
                {
                    root: Array.from(padLE(Uint8Array.from([4]), 32)) as U256Serialized,
                    nullifier_hash: Array.from(padLE(Uint8Array.from([1]), 32)) as U256Serialized,
                },
                {
                    root: Array.from(padLE(Uint8Array.from([3]), 32)) as U256Serialized,
                    nullifier_hash: Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
                },
                {
                    root: Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
                    nullifier_hash: Array.from(padLE(Uint8Array.from([3]), 32)) as U256Serialized,
                },
                {
                    root: Array.from(padLE(Uint8Array.from([1]), 32)) as U256Serialized,
                    nullifier_hash: Array.from(padLE(Uint8Array.from([4]), 32)) as U256Serialized,
                },
            ],
            output_commitment: Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
            recent_commitment_index: 68,
            fee_version: 3,
            amount: 7,
            fee: 3,
            token_id: 4,
            optional_fee:
            {
                amount: 123,
                collector: Array.from(padLE(Uint8Array.from([45]), 32)) as U256Serialized,
            },
            metadata: Array.from(padLE(Uint8Array.from([56]), COMMITMENT_METADATA_LENGTH)) as CommitmentMetadataSerialized,
        };

        expect(TransactionSerialization['serializeJoinSplit'](random, randomFee)).to.deep.equal(expected);
    });

    it('Correctly serializes Join Split with only one root', () => {
        const random = new SendQuadraPublicInputs(
            [BigInt(1), BigInt(2), BigInt(3), BigInt(4)],
            [BigInt(4), BigInt(4), BigInt(4), BigInt(4)],
            BigInt(10),
            BigInt(2),
            BigInt(68),
            BigInt(3),
            BigInt(4),
            {
                isAssociatedTokenAccount: false,
                recipient: BigInt(2),
                identifier: BigInt(3),
                iv: BigInt(4),
                encryptedOwner: BigInt(5),
                solanaPayId: BigInt(6),
                optionalFeeAmount: BigInt(123),
                optionalFeeCollector: BigInt(45),
            },
            BigInt(56),
            BigInt(78),
        );
        const randomFee: Fee = {
            tokenType: 'USDT',
            txFee: 1,
            privacyFee: 2,
            tokenAccRent: 0,
            extraFee: 0,
        };
        const expected: JoinSplitSerializedJSON = {
            input_commitments: [
                {
                    root: Array.from(padLE(Uint8Array.from([4]), 32)) as U256Serialized,
                    nullifier_hash: Array.from(padLE(Uint8Array.from([1]), 32)) as U256Serialized,
                },
                {
                    root: null,
                    nullifier_hash: Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
                },
                {
                    root: null,
                    nullifier_hash: Array.from(padLE(Uint8Array.from([3]), 32)) as U256Serialized,
                },
                {
                    root: null,
                    nullifier_hash: Array.from(padLE(Uint8Array.from([4]), 32)) as U256Serialized,
                },
            ],
            output_commitment: Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
            recent_commitment_index: 68,
            fee_version: 3,
            amount: 7,
            fee: 3,
            token_id: 4,
            optional_fee:
            {
                amount: 123,
                collector: Array.from(padLE(Uint8Array.from([45]), 32)) as U256Serialized,
            },
            metadata: Array.from(padLE(Uint8Array.from([56]), COMMITMENT_METADATA_LENGTH)) as CommitmentMetadataSerialized,
        };

        expect(TransactionSerialization['serializeJoinSplit'](random, randomFee)).to.deep.equal(expected);
    });

    it('Correctly serializes Join Split with only one nHash', () => {
        const random = new SendQuadraPublicInputs(
            [BigInt(1)],
            [BigInt(4)],
            BigInt(10),
            BigInt(2),
            BigInt(68),
            BigInt(3),
            BigInt(4),
            {
                isAssociatedTokenAccount: false,
                recipient: BigInt(2),
                identifier: BigInt(3),
                iv: BigInt(4),
                encryptedOwner: BigInt(5),
                solanaPayId: BigInt(6),
                optionalFeeAmount: BigInt(123),
                optionalFeeCollector: BigInt(45),
            },
            BigInt(56),
            BigInt(78),
        );
        const randomFee: Fee = {
            tokenType: 'USDT',
            txFee: 1,
            privacyFee: 2,
            tokenAccRent: 0,
            extraFee: 0,
        };
        const expected: JoinSplitSerializedJSON = {
            input_commitments: [
                {
                    root: Array.from(padLE(Uint8Array.from([4]), 32)) as U256Serialized,
                    nullifier_hash: Array.from(padLE(Uint8Array.from([1]), 32)) as U256Serialized,
                },
            ],
            output_commitment: Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
            recent_commitment_index: 68,
            fee_version: 3,
            amount: 7,
            fee: 3,
            token_id: 4,
            optional_fee:
            {
                amount: 123,
                collector: Array.from(padLE(Uint8Array.from([45]), 32)) as U256Serialized,
            },
            metadata: Array.from(padLE(Uint8Array.from([56]), COMMITMENT_METADATA_LENGTH)) as CommitmentMetadataSerialized,
        };

        expect(TransactionSerialization['serializeJoinSplit'](random, randomFee)).to.deep.equal(expected);
    });

    it('Throws for serializing with empty nHash not at the end', () => {
        const random = new SendQuadraPublicInputs(
            [BigInt(0), BigInt(1)],
            [BigInt(4), BigInt(4)],
            BigInt(10),
            BigInt(2),
            BigInt(68),
            BigInt(3),
            BigInt(4),
            {
                isAssociatedTokenAccount: false,
                recipient: BigInt(2),
                identifier: BigInt(3),
                iv: BigInt(4),
                encryptedOwner: BigInt(5),
                solanaPayId: BigInt(6),
                optionalFeeAmount: BigInt(123),
                optionalFeeCollector: BigInt(45),
            },
            BigInt(56),
            BigInt(78),
        );
        const randomFee: Fee = {
            tokenType: 'USDT',
            txFee: 1,
            privacyFee: 2,
            tokenAccRent: 0,
            extraFee: 0,
        };
        expect(() => TransactionSerialization['serializeJoinSplit'](random, randomFee)).to.throw();
    });
});

describe('Serialize Send Public Inputs tests', () => {
    it('Correctly serializes zero Send Public Inputs', () => {
        const zero = new SendQuadraPublicInputs(
            [],
            [],
            BigInt(0),
            BigInt(0),
            BigInt(0),
            BigInt(0),
            BigInt(0),
            {
                isAssociatedTokenAccount: false,
                recipient: BigInt(0),
                identifier: BigInt(0),
                iv: BigInt(0),
                encryptedOwner: BigInt(0),
                solanaPayId: BigInt(0),
                optionalFeeAmount: BigInt(0),
                optionalFeeCollector: BigInt(0),
            },
            BigInt(0),
            BigInt(0),
        );
        const zeroFee: Fee = {
            tokenType: 'LAMPORTS',
            txFee: 0,
            privacyFee: 0,
            tokenAccRent: 0,
            extraFee: 0,
        };
        const expected: SendPublicInputsSerializedJSON = {
            join_split: {
                input_commitments: [],
                output_commitment: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                recent_commitment_index: 0,
                fee_version: 0,
                amount: 0,
                fee: 0,
                token_id: 0,
                optional_fee: {
                    collector: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                    amount: 0,
                },
                metadata: Array.from(padLE(Uint8Array.from([0]), COMMITMENT_METADATA_LENGTH)) as CommitmentMetadataSerialized,
            },
            recipient_is_associated_token_account: false,
            hashed_inputs: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
            solana_pay_transfer: false,
        };

        expect(TransactionSerialization['serializeSendPublicInputs'](zero, zeroFee, false)).to.deep.equal(expected);
    });

    it('Correctly serializes random Send Public Inputs', () => {
        const random = new SendQuadraPublicInputs(
            [BigInt(1), BigInt(2), BigInt(3), BigInt(4)],
            [BigInt(4), BigInt(3), BigInt(2), BigInt(1)],
            BigInt(10),
            BigInt(2),
            BigInt(68),
            BigInt(3),
            BigInt(4),
            {
                isAssociatedTokenAccount: false,
                recipient: BigInt(2),
                identifier: BigInt(3),
                iv: BigInt(4),
                encryptedOwner: BigInt(5),
                solanaPayId: BigInt(6),
                optionalFeeAmount: BigInt(123),
                optionalFeeCollector: BigInt(45),
            },
            BigInt(56),
            BigInt(78),
        );
        const randomFee: Fee = {
            tokenType: 'USDT',
            txFee: 1,
            privacyFee: 2,
            tokenAccRent: 0,
            extraFee: 0,
        };
        const expected: SendPublicInputsSerializedJSON = {
            join_split: {
                input_commitments: [

                    {
                        root: Array.from(padLE(Uint8Array.from([4]), 32)) as U256Serialized,
                        nullifier_hash: Array.from(padLE(Uint8Array.from([1]), 32)) as U256Serialized,
                    },
                    {
                        root: Array.from(padLE(Uint8Array.from([3]), 32)) as U256Serialized,
                        nullifier_hash: Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
                    },
                    {
                        root: Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
                        nullifier_hash: Array.from(padLE(Uint8Array.from([3]), 32)) as U256Serialized,
                    },
                    {
                        root: Array.from(padLE(Uint8Array.from([1]), 32)) as U256Serialized,
                        nullifier_hash: Array.from(padLE(Uint8Array.from([4]), 32)) as U256Serialized,
                    },
                ],
                output_commitment: Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
                recent_commitment_index: 68,
                fee_version: 3,
                amount: 7,
                fee: 3,
                token_id: 4,
                optional_fee:
                {
                    amount: 123,
                    collector: Array.from(padLE(Uint8Array.from([45]), 32)) as U256Serialized,
                },
                metadata: Array.from(padLE(Uint8Array.from([56]), COMMITMENT_METADATA_LENGTH)) as CommitmentMetadataSerialized,
            },
            solana_pay_transfer: false,
            recipient_is_associated_token_account: false,
            hashed_inputs: Array.from(padLE(Uint8Array.from([78]), 32)) as U256Serialized,
        };

        expect(TransactionSerialization['serializeSendPublicInputs'](random, randomFee, false)).to.deep.equal(expected);
    });
});

describe('Serialize Send proof Tests', () => {
    it('Correctly serializes zero Send proof', () => {
        const zeroInputs = new SendQuadraPublicInputs(
            [],
            [],
            BigInt(0),
            BigInt(0),
            BigInt(0),
            BigInt(0),
            BigInt(0),
            {
                isAssociatedTokenAccount: false,
                recipient: BigInt(0),
                identifier: BigInt(0),
                iv: BigInt(0),
                encryptedOwner: BigInt(0),
                solanaPayId: BigInt(0),
                optionalFeeAmount: BigInt(0),
                optionalFeeCollector: BigInt(0),
            },
            BigInt(0),
            BigInt(0),
        );
        const zeroFee: Fee = {
            tokenType: 'LAMPORTS',
            txFee: 0,
            privacyFee: 0,
            tokenAccRent: 0,
            extraFee: 0,
        };
        const zeroG16Proof: Groth16Proof = {
            pi_a: [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar, false],
            pi_b: [
                [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar],
                [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar],
                false,
            ],
            pi_c: [Uint8Array.from([0]) as MontScalar, Uint8Array.from([0]) as MontScalar, false],
        };

        const zeroProof: SendQuadraProof = {
            publicInputs: zeroInputs,
            proof: zeroG16Proof,
        };

        const expected: SendProofSerialized = [
            {
                a: {
                    x: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                    y: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                    infinity: false,
                },
                b: {
                    x: [Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized],
                    y: [Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized],
                    infinity: false,
                },
                c: {
                    x: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                    y: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                    infinity: false,
                },
            },
            {
                join_split: {
                    input_commitments: [],
                    output_commitment: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                    recent_commitment_index: 0,
                    fee_version: 0,
                    amount: 0,
                    fee: 0,
                    token_id: 0,
                    optional_fee: {
                        amount: 0,
                        collector: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                    },
                    metadata: Array.from(padLE(Uint8Array.from([0]), COMMITMENT_METADATA_LENGTH)) as CommitmentMetadataSerialized,
                },
                recipient_is_associated_token_account: false,
                hashed_inputs: Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
                solana_pay_transfer: true,
            },
            Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
            Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
            Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
            Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
            Array.from(padLE(Uint8Array.from([0]), 32)) as U256Serialized,
            null,
        ];

        expect(TransactionSerialization['serializeSendProof'](zeroProof, zeroFee, true)).to.deep.equal(expected);
    });

    it('Correctly serializes random Send proof', () => {
        const randomInputs = new SendQuadraPublicInputs(
            [
                BigInt(1),
                BigInt(2),
                BigInt(3),
                BigInt(4),
            ],
            [
                BigInt(11),
                BigInt(21),
                BigInt(31),
                BigInt(41),
            ],
            BigInt(30),
            BigInt(5),
            BigInt(68),
            BigInt(69),
            BigInt(2),
            {
                isAssociatedTokenAccount: false,
                recipient: BigInt(2),
                identifier: BigInt(3),
                iv: BigInt(4),
                encryptedOwner: BigInt(5),
                solanaPayId: BigInt(6),
                optionalFeeAmount: BigInt(9),
                optionalFeeCollector: BigInt(10),
                memo: stringToUtf8ByteCodes('test'),
            },
            BigInt(7),
            BigInt(8),
        );
        const randomFee: Fee = {
            tokenType: 'USDT',
            txFee: 1,
            privacyFee: 2,
            tokenAccRent: 0,
            extraFee: 0,
        };
        const randomG16Proof: Groth16Proof = {
            pi_a: [Uint8Array.from([1]) as MontScalar, Uint8Array.from([2]) as MontScalar, false],
            pi_b: [
                [Uint8Array.from([3]) as MontScalar, Uint8Array.from([4]) as MontScalar],
                [Uint8Array.from([5]) as MontScalar, Uint8Array.from([6]) as MontScalar],
                false,
            ],
            pi_c: [Uint8Array.from([7]) as MontScalar, Uint8Array.from([8]) as MontScalar, false],
        };

        const randomProof: SendQuadraProof = {
            publicInputs: randomInputs,
            proof: randomG16Proof,
        };

        const expected: SendProofSerialized = [
            {
                a: {
                    x: Array.from(padLE(Uint8Array.from([1]), 32)) as U256Serialized,
                    y: Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
                    infinity: false,
                },
                b: {
                    x: [Array.from(padLE(Uint8Array.from([3]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([4]), 32)) as U256Serialized],
                    y: [Array.from(padLE(Uint8Array.from([5]), 32)) as U256Serialized, Array.from(padLE(Uint8Array.from([6]), 32)) as U256Serialized],
                    infinity: false,
                },
                c: {
                    x: Array.from(padLE(Uint8Array.from([7]), 32)) as U256Serialized,
                    y: Array.from(padLE(Uint8Array.from([8]), 32)) as U256Serialized,
                    infinity: false,
                },
            },
            {
                join_split: {
                    input_commitments: [
                        {
                            root: Array.from(padLE(Uint8Array.from([11]), 32)) as U256Serialized,
                            nullifier_hash: Array.from(padLE(Uint8Array.from([1]), 32)) as U256Serialized,
                        },
                        {
                            root: Array.from(padLE(Uint8Array.from([21]), 32)) as U256Serialized,
                            nullifier_hash: Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
                        },
                        {
                            root: Array.from(padLE(Uint8Array.from([31]), 32)) as U256Serialized,
                            nullifier_hash: Array.from(padLE(Uint8Array.from([3]), 32)) as U256Serialized,
                        },
                        {
                            root: Array.from(padLE(Uint8Array.from([41]), 32)) as U256Serialized,
                            nullifier_hash: Array.from(padLE(Uint8Array.from([4]), 32)) as U256Serialized,
                        },
                    ],
                    output_commitment: Array.from(padLE(Uint8Array.from([5]), 32)) as U256Serialized,
                    recent_commitment_index: 68,
                    fee_version: 69,
                    amount: 27,
                    fee: 3,
                    token_id: 2,
                    metadata: Array.from(padLE(Uint8Array.from([7]), COMMITMENT_METADATA_LENGTH)) as CommitmentMetadataSerialized,
                    optional_fee: {
                        collector: Array.from(padLE(Uint8Array.from([10]), 32)) as U256Serialized,
                        amount: 9,
                    },
                },
                recipient_is_associated_token_account: false,
                hashed_inputs: Array.from(padLE(Uint8Array.from([8]), 32)) as U256Serialized,
                solana_pay_transfer: true,
            },
            Array.from(padLE(Uint8Array.from([2]), 32)) as U256Serialized,
            Array.from(padLE(Uint8Array.from([3]), 32)) as U256Serialized,
            Array.from(padLE(Uint8Array.from([4]), 32)) as U256Serialized,
            Array.from(padLE(Uint8Array.from([5]), 32)) as U256Serialized,
            Array.from(padLE(Uint8Array.from([6]), 32)) as U256Serialized,
            'test',
        ];

        expect(TransactionSerialization['serializeSendProof'](randomProof, randomFee, true)).to.deep.equal(expected);
    });
});

export function expBigInt(base: bigint, power: bigint): bigint {
    let res = BigInt(1);
    for (let i = 0; i < power; i++) {
        res *= base;
    }

    return res;
}
