import { expect } from 'chai';
import {
    parseBufferFromTxBuffer, parseUint16FromTxBuffer, parseUint32FromTxBuffer, parseUint64FromTxBuffer,
} from '../../src/sdk/transactions/txUtils.js';

describe('Parse Buffer from txBuffer tests', () => {
    it('should parse buffer from txBuffer', () => {
        const txBuffer = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const start = 2;
        const length = 5;
        const expectedBuffer = Buffer.from([2, 3, 4, 5, 6]);

        const parsedBuffer = parseBufferFromTxBuffer(txBuffer, start, length);

        expect(parsedBuffer).to.deep.equal(expectedBuffer);
    });

    it('should throw error when trying to access data outside of txBuffer', () => {
        const txBuffer = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const start = 2;
        const length = 20;

        expect(() => parseBufferFromTxBuffer(txBuffer, start, length)).to.throw();
    });
});

describe('Parse Uint16 from txBuffer tests', () => {
    it('should parse Uint16 from txBuffer', () => {
        const txBuffer = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const start = 2;
        const expectedUint16 = 770;

        const parsedUint16 = parseUint16FromTxBuffer(txBuffer, start);

        expect(parsedUint16).to.equal(expectedUint16);
    });

    it('should throw error when trying to access data outside of txBuffer', () => {
        const txBuffer = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const start = 9;

        expect(() => parseUint16FromTxBuffer(txBuffer, start)).to.throw();
    });
});

describe('Parse Uint32 from txBuffer tests', () => {
    it('should parse Uint32 from txBuffer', () => {
        const txBuffer = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const start = 2;
        const expectedUint32 = 84148994;

        const parsedUint32 = parseUint32FromTxBuffer(txBuffer, start);

        expect(parsedUint32).to.equal(expectedUint32);
    });

    it('should throw error when trying to access data outside of txBuffer', () => {
        const txBuffer = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const start = 8;

        expect(() => parseUint32FromTxBuffer(txBuffer, start)).to.throw();
    });
});

describe('Parse Uint64 from txBuffer tests', () => {
    it('should parse Uint64 from txBuffer', () => {
        const txBuffer = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const start = 2;
        const expectedUint64 = BigInt('650777868590383874');

        const parsedUint64 = parseUint64FromTxBuffer(txBuffer, start);

        expect(parsedUint64).to.equal(expectedUint64);
    });

    it('should throw error when trying to access data outside of txBuffer', () => {
        const txBuffer = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const start = 7;

        expect(() => parseUint64FromTxBuffer(txBuffer, start)).to.throw();
    });
});
