import { expect } from 'chai';
import { GeneralSet } from '../../src/sdk/utils/GeneralSet.js';

describe('GeneralSet tests', () => {
    it('Should add elements', () => {
        const set = new GeneralSet<number>((n) => n.toString());
        set.add(1);
        set.add(2);
        set.add(3);
        set.add(4);
        set.add(5);
        set.add(6);
        set.add(7);
        set.add(8);
        set.add(9);
        set.add(10);
        expect(set.toArray()).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('Should delete elements', () => {
        const set = new GeneralSet<number>((n) => n.toString());
        set.add(1);
        set.add(2);
        set.add(3);
        set.add(4);
        set.add(5);
        set.add(6);
        set.add(7);
        set.add(8);
        set.add(9);
        set.add(10);
        set.delete(3);
        set.delete(4);
        set.delete(5);
        set.delete(6);
        expect(set.toArray()).to.deep.equal([1, 2, 7, 8, 9, 10]);
    });

    it('Should overwrite duplicate elements', () => {
        const set = new GeneralSet<number[]>((n) => n.length.toString());
        set.add([1, 2, 3]);
        set.add([3, 3, 3]);

        expect(set.toArray()).to.deep.equal([[3, 3, 3]]);
    });

    it('Should add multiple elements at once as an array', () => {
        const set = new GeneralSet<number>((n) => n.toString());
        set.addArr([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(set.toArray()).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
});
