import { expect } from 'chai';
import { divCeilBigInt, sumBigInt } from '../../src/sdk/utils/bigIntUtils.js';

describe('Ceiling division of bigints tests', () => {
    it('Divides two small numbers correctly', () => {
        const dividend = BigInt(3);
        const divisor = BigInt(2);
        const result = divCeilBigInt(dividend, divisor);
        expect(result.toString()).to.equal('2');
    });

    it('Divides two medium numbers correctly', () => {
        const dividend = BigInt(100);
        const divisor = BigInt(3);
        const result = divCeilBigInt(dividend, divisor);
        expect(result.toString()).to.equal('34');
    });

    it('Divides two large numbers correctly', () => {
        const dividend = BigInt('1000000000000000000');
        const divisor = BigInt('3');
        const result = divCeilBigInt(dividend, divisor);
        expect(result.toString()).to.equal('333333333333333334');
    });

    it('Divides two very large numbers correctly', () => {
        const dividend = BigInt('1234567890987654321');
        const divisor = BigInt('3');
        const result = divCeilBigInt(dividend, divisor);
        expect(result.toString()).to.equal('411522630329218107');
    });

    it('Throws an error when dividing by zero', () => {
        const dividend = BigInt('1234567890987654321');
        const divisor = BigInt(0);
        expect(() => divCeilBigInt(dividend, divisor)).to.throw();
    });
});

describe('Sum bigints tests', () => {
    it('Sums empty array of bigints correctly', () => {
        const result = sumBigInt([]);
        expect(result.toString()).to.equal('0');
    });

    it('Sums array of small numbers correctly', () => {
        const result = sumBigInt([BigInt(1), BigInt(2), BigInt(3)]);
        expect(result.toString()).to.equal('6');
    });

    it('Sums array of medium numbers correctly', () => {
        const result = sumBigInt([BigInt(10000), BigInt(20000), BigInt(30000)]);
        expect(result.toString()).to.equal('60000');
    });

    it('Sums array of large numbers correctly', () => {
        const result = sumBigInt([BigInt('1000000000000000000'), BigInt('2000000000000000000'), BigInt('3000000000000000000')]);
        expect(result.toString()).to.equal('6000000000000000000');
    });
});
