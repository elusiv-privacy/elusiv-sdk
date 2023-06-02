import { expect } from 'chai';
import { zipSameLength, mergeMaps, isDefinedSparseArr } from '../../src/sdk/utils/utils.js';

describe('Array zip tests', () => {
    it('Zips two equal length arrays of same type', () => {
        const a = [1, 2, 3];
        const b = [4, 5, 6];
        const zipped = zipSameLength(a, b);
        expect(zipped).to.deep.equal([{ fst: 1, snd: 4 }, { fst: 2, snd: 5 }, { fst: 3, snd: 6 }]);
    });

    it('Zips two equal length arrays of different types', () => {
        const a = [1, 2, 3];
        const b = ['4', '5', '6'];
        const zipped = zipSameLength(a, b);
        expect(zipped).to.deep.equal([{ fst: 1, snd: '4' }, { fst: 2, snd: '5' }, { fst: 3, snd: '6' }]);
    });

    it('Zips two empty arrays', () => {
        const a: number[] = [];
        const b: string[] = [];
        const zipped = zipSameLength(a, b);
        expect(zipped).to.deep.equal([]);
    });

    it('Throws for two unequal length arrays', () => {
        const a = [1, 2, 3];
        const b = [4, 5];
        expect(() => zipSameLength(a, b)).to.throw();
    });
});

describe('Map merging tests', () => {
    it('Merges two empty maps', () => {
        const a = new Map();
        const b = new Map();
        const merged = mergeMaps([a, b]);
        expect(merged).to.deep.equal(new Map());
    });

    it('Merges two maps with no overlapping keys', () => {
        const a = new Map([['a', 1], ['b', 2]]);
        const b = new Map([['c', 3], ['d', 4]]);
        const merged = mergeMaps([a, b]);
        expect(merged).to.deep.equal(new Map([['a', 1], ['b', 2], ['c', 3], ['d', 4]]));
    });

    it('Merges two maps with overlapping keys', () => {
        const a = new Map([['a', 1], ['b', 2]]);
        const b = new Map([['a', 3], ['d', 4]]);
        const merged = mergeMaps([a, b]);
        expect(merged).to.deep.equal(new Map([['a', 3], ['b', 2], ['d', 4]]));
    });

    it('Merges multiple maps with no overlapping keys', () => {
        const a = new Map([['a', 1], ['b', 2]]);
        const b = new Map([['c', 3], ['d', 4]]);
        const c = new Map([['e', 5], ['f', 6]]);
        const merged = mergeMaps([a, b, c]);
        expect(merged).to.deep.equal(new Map([['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5], ['f', 6]]));
    });

    it('Merges multiple maps with overlapping keys', () => {
        const a = new Map([['a', 1], ['b', 2]]);
        const b = new Map([['c', 3], ['d', 4]]);
        const c = new Map([['d', 5], ['f', 6]]);
        const merged = mergeMaps([a, b, c]);
        expect(merged).to.deep.equal(new Map([['a', 1], ['b', 2], ['c', 3], ['d', 5], ['f', 6]]));
    });
});

describe('Is defined sparse array tests', () => {
    it('Returns true for an empty array', () => {
        expect(isDefinedSparseArr([])).to.be.true;
    });

    it('Returns false for an empty sparse array', () => {
        expect(isDefinedSparseArr(new Array(5))).to.be.false;
    });

    it('Returns false for an array with undefined values', () => {
        expect(isDefinedSparseArr([undefined, undefined])).to.be.false;
    });

    it('Returns false for a array with just some values defined', () => {
        expect(isDefinedSparseArr([1, undefined, 3])).to.be.false;
    });

    it('Returns false for a sparse array with just some values defined', () => {
        const arr = new Array(3);
        arr[0] = 1;
        arr[2] = 3;
        expect(isDefinedSparseArr(arr)).to.be.false;
    });

    it('Returns true for an array with defined values', () => {
        expect(isDefinedSparseArr([1, 2, 3])).to.be.true;
    });
});
