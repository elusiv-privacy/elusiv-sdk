import { expect } from 'chai';
import { MERKLE_TREE_HEIGHT, STORAGE_MT_CHUNK_COUNT, STORAGE_MT_VALUES_PER_ACCOUNT } from '../../src/constants.js';
import {
    IndexConverter, LocalIndex, GlobalIndex,
} from '../../src/sdk/utils/IndexConverter.js';

describe('IndexConverter tests', () => {
    it('Converts from local to global index for root', () => {
        const localIndex : LocalIndex = { level: 0, index: 0 };
        const globalIndex : GlobalIndex = IndexConverter.localIndexToGlobalIndex(localIndex);
        expect(globalIndex).to.equal(0);
    });

    it('Converts from local to global index for start of level 1', () => {
        const localIndex : LocalIndex = { level: 1, index: 0 };
        const globalIndex : GlobalIndex = IndexConverter.localIndexToGlobalIndex(localIndex);
        expect(globalIndex).to.equal(1);
    });

    it('Converts from local to global index for end of level 1', () => {
        const localIndex : LocalIndex = { level: 1, index: 1 };
        const globalIndex : GlobalIndex = IndexConverter.localIndexToGlobalIndex(localIndex);
        expect(globalIndex).to.equal(2);
    });

    it('Converts from local to global index for start of level 10', () => {
        const localIndex : LocalIndex = { level: 10, index: 0 };
        const globalIndex : GlobalIndex = IndexConverter.localIndexToGlobalIndex(localIndex);
        expect(globalIndex).to.equal(1023);
    });

    it('Converts from local to global index for middle of level 10', () => {
        const localIndex : LocalIndex = { level: 10, index: 512 };
        const globalIndex : GlobalIndex = IndexConverter.localIndexToGlobalIndex(localIndex);
        expect(globalIndex).to.equal(1535);
    });

    it('Converts from local to global index for end of level 10', () => {
        const localIndex : LocalIndex = { level: 10, index: 1023 };
        const globalIndex : GlobalIndex = IndexConverter.localIndexToGlobalIndex(localIndex);
        expect(globalIndex).to.equal(2046);
    });

    it('Converts from local to global index for start of leaves', () => {
        const localIndex : LocalIndex = { level: MERKLE_TREE_HEIGHT, index: 0 };
        const globalIndex : GlobalIndex = IndexConverter.localIndexToGlobalIndex(localIndex);
        expect(globalIndex).to.equal(2 ** MERKLE_TREE_HEIGHT - 1);
    });

    it('Converts from local to global index for middle of leaves', () => {
        const localIndex : LocalIndex = { level: MERKLE_TREE_HEIGHT, index: 2 ** (MERKLE_TREE_HEIGHT - 1) };
        const globalIndex : GlobalIndex = IndexConverter.localIndexToGlobalIndex(localIndex);
        expect(globalIndex).to.equal(1572863);
    });

    it('Converts from local to global index for end of leaves', () => {
        const localIndex : LocalIndex = { level: MERKLE_TREE_HEIGHT, index: 2 ** (MERKLE_TREE_HEIGHT) - 1 };
        const globalIndex : GlobalIndex = IndexConverter.localIndexToGlobalIndex(localIndex);
        expect(globalIndex).to.equal(2097150);
    });

    it('Throws error when converting from local to global index for level too high', () => {
        const localIndex : LocalIndex = { level: MERKLE_TREE_HEIGHT + 1, index: 0 };
        expect(() => IndexConverter.localIndexToGlobalIndex(localIndex)).to.throw();
    });

    it('Throws error when converting from local to global index for index too high', () => {
        const localIndex : LocalIndex = { level: 0, index: 1 };
        expect(() => IndexConverter.localIndexToGlobalIndex(localIndex)).to.throw();
    });

    it('Correctly converts from global to account index for root ', () => {
        const globalIndex : GlobalIndex = 0 as GlobalIndex;
        const { indexOfAccount, indexInAccount } = IndexConverter.globalIndextoAccIndex(globalIndex);
        expect(indexOfAccount).to.equal(0);
        expect(indexInAccount).to.equal(0);
        expect(IndexConverter.accIndexToGlobalIndex({ indexOfAccount, indexInAccount })).to.equal(globalIndex);
    });

    it('Correctly converts from global to account index for middle of first account ', () => {
        const globalIndex : GlobalIndex = Math.floor(STORAGE_MT_VALUES_PER_ACCOUNT / 2) as GlobalIndex;
        const { indexOfAccount, indexInAccount } = IndexConverter.globalIndextoAccIndex(globalIndex);
        expect(indexOfAccount).to.equal(0);
        expect(indexInAccount).to.equal(Math.floor(STORAGE_MT_VALUES_PER_ACCOUNT / 2));
        expect(IndexConverter.accIndexToGlobalIndex({ indexOfAccount, indexInAccount })).to.equal(globalIndex);
    });

    it('Correctly converts from global to account index for end of first account ', () => {
        const globalIndex : GlobalIndex = STORAGE_MT_VALUES_PER_ACCOUNT - 1 as GlobalIndex;
        const { indexOfAccount, indexInAccount } = IndexConverter.globalIndextoAccIndex(globalIndex);
        expect(indexOfAccount).to.equal(0);
        expect(indexInAccount).to.equal(STORAGE_MT_VALUES_PER_ACCOUNT - 1);
        expect(IndexConverter.accIndexToGlobalIndex({ indexOfAccount, indexInAccount })).to.equal(globalIndex);
    });

    it('Correctly converts from global to account index for start of middle account ', () => {
        const globalIndex : GlobalIndex = STORAGE_MT_VALUES_PER_ACCOUNT * (Math.floor(STORAGE_MT_CHUNK_COUNT / 2)) as GlobalIndex;
        const { indexOfAccount, indexInAccount } = IndexConverter.globalIndextoAccIndex(globalIndex);
        expect(indexOfAccount).to.equal(Math.floor(STORAGE_MT_CHUNK_COUNT / 2));
        expect(indexInAccount).to.equal(0);
        expect(IndexConverter.accIndexToGlobalIndex({ indexOfAccount, indexInAccount })).to.equal(globalIndex);
    });

    it('Correctly converts from global to account index for middle of middle account ', () => {
        const globalIndex : GlobalIndex = STORAGE_MT_VALUES_PER_ACCOUNT * (Math.floor(STORAGE_MT_CHUNK_COUNT / 2)) + Math.floor(STORAGE_MT_VALUES_PER_ACCOUNT / 2) as GlobalIndex;
        const { indexOfAccount, indexInAccount } = IndexConverter.globalIndextoAccIndex(globalIndex);
        expect(indexOfAccount).to.equal(Math.floor(STORAGE_MT_CHUNK_COUNT / 2));
        expect(indexInAccount).to.equal(Math.floor(STORAGE_MT_VALUES_PER_ACCOUNT / 2));
        expect(IndexConverter.accIndexToGlobalIndex({ indexOfAccount, indexInAccount })).to.equal(globalIndex);
    });

    it('Correctly converts from global to account index for end of middle account ', () => {
        const globalIndex : GlobalIndex = STORAGE_MT_VALUES_PER_ACCOUNT * (Math.floor(STORAGE_MT_CHUNK_COUNT / 2)) + STORAGE_MT_VALUES_PER_ACCOUNT - 1 as GlobalIndex;
        const { indexOfAccount, indexInAccount } = IndexConverter.globalIndextoAccIndex(globalIndex);
        expect(indexOfAccount).to.equal(Math.floor(STORAGE_MT_CHUNK_COUNT / 2));
        expect(indexInAccount).to.equal(STORAGE_MT_VALUES_PER_ACCOUNT - 1);
        expect(IndexConverter.accIndexToGlobalIndex({ indexOfAccount, indexInAccount })).to.equal(globalIndex);
    });

    it('Correctly converts from global to account index for start of last account ', () => {
        const globalIndex : GlobalIndex = STORAGE_MT_VALUES_PER_ACCOUNT * (STORAGE_MT_CHUNK_COUNT - 1) as GlobalIndex;
        const { indexOfAccount, indexInAccount } = IndexConverter.globalIndextoAccIndex(globalIndex);
        expect(indexOfAccount).to.equal(STORAGE_MT_CHUNK_COUNT - 1);
        expect(indexInAccount).to.equal(0);
        expect(IndexConverter.accIndexToGlobalIndex({ indexOfAccount, indexInAccount })).to.equal(globalIndex);
    });

    it('Correctly converts from global to account index for middle of last account ', () => {
        const globalIndex : GlobalIndex = STORAGE_MT_VALUES_PER_ACCOUNT * (STORAGE_MT_CHUNK_COUNT - 1) + Math.floor(STORAGE_MT_VALUES_PER_ACCOUNT / 2) as GlobalIndex;
        const { indexOfAccount, indexInAccount } = IndexConverter.globalIndextoAccIndex(globalIndex);
        expect(indexOfAccount).to.equal(STORAGE_MT_CHUNK_COUNT - 1);
        expect(indexInAccount).to.equal(Math.floor(STORAGE_MT_VALUES_PER_ACCOUNT / 2));
        expect(IndexConverter.accIndexToGlobalIndex({ indexOfAccount, indexInAccount })).to.equal(globalIndex);
    });

    it('Correctly converts from global to account index for maximum index ', () => {
        const globalIndex : GlobalIndex = 2 ** (MERKLE_TREE_HEIGHT + 1) - 2 as GlobalIndex;
        const { indexOfAccount, indexInAccount } = IndexConverter.globalIndextoAccIndex(globalIndex);
        expect(indexOfAccount).to.equal(STORAGE_MT_CHUNK_COUNT - 1);
        expect(indexInAccount).to.equal(globalIndex % STORAGE_MT_VALUES_PER_ACCOUNT);
        expect(IndexConverter.accIndexToGlobalIndex({ indexOfAccount, indexInAccount })).to.equal(globalIndex);
    });

    it('Throws for global index out of range', () => {
        const globalIndex : GlobalIndex = 2 ** (MERKLE_TREE_HEIGHT + 1) as GlobalIndex;
        expect(() => IndexConverter.globalIndextoAccIndex(globalIndex)).to.throw();
    });

    it('Correctly convert global Index to local index for root', () => {
        const globalIndex : GlobalIndex = 0 as GlobalIndex;
        const localIndex : LocalIndex = IndexConverter.globalIndexToLocalIndex(globalIndex);
        expect(localIndex.level).to.equal(0);
        expect(localIndex.index).to.equal(0);
    });

    it('Correctly convert global Index to local index for start of level 1', () => {
        const globalIndex : GlobalIndex = 1 as GlobalIndex;
        const localIndex : LocalIndex = IndexConverter.globalIndexToLocalIndex(globalIndex);
        expect(localIndex.level).to.equal(1);
        expect(localIndex.index).to.equal(0);
    });

    it('Correctly convert global Index to local index for end of level 1', () => {
        const globalIndex : GlobalIndex = 2 as GlobalIndex;
        const localIndex : LocalIndex = IndexConverter.globalIndexToLocalIndex(globalIndex);
        expect(localIndex.level).to.equal(1);
        expect(localIndex.index).to.equal(1);
    });

    it('Correctly convert global Index to local index for start of level 10', () => {
        const globalIndex : GlobalIndex = 2 ** 10 - 1 as GlobalIndex;
        const localIndex : LocalIndex = IndexConverter.globalIndexToLocalIndex(globalIndex);
        expect(localIndex.level).to.equal(10);
        expect(localIndex.index).to.equal(0);
    });

    it('Correctly convert global Index to local index for middle of level 10', () => {
        const globalIndex : GlobalIndex = 2 ** 10 - 1 + 2 ** 9 as GlobalIndex;
        const localIndex : LocalIndex = IndexConverter.globalIndexToLocalIndex(globalIndex);
        expect(localIndex.level).to.equal(10);
        expect(localIndex.index).to.equal(2 ** 9);
    });

    it('Correctly convert global Index to local index for end of level 10', () => {
        const globalIndex : GlobalIndex = 2 ** 11 - 2 as GlobalIndex;
        const localIndex : LocalIndex = IndexConverter.globalIndexToLocalIndex(globalIndex);
        expect(localIndex.level).to.equal(10);
        expect(localIndex.index).to.equal(2 ** 10 - 1);
    });

    it('Correctly convert global Index to local index for start of leaves', () => {
        const globalIndex : GlobalIndex = 2 ** MERKLE_TREE_HEIGHT - 1 as GlobalIndex;
        const localIndex : LocalIndex = IndexConverter.globalIndexToLocalIndex(globalIndex);
        expect(localIndex.level).to.equal(MERKLE_TREE_HEIGHT);
        expect(localIndex.index).to.equal(0);
    });

    it('Correctly convert global Index to local index for middle of leaves', () => {
        const globalIndex : GlobalIndex = 2 ** MERKLE_TREE_HEIGHT - 1 + 2 ** MERKLE_TREE_HEIGHT / 2 as GlobalIndex;
        const localIndex : LocalIndex = IndexConverter.globalIndexToLocalIndex(globalIndex);
        expect(localIndex.level).to.equal(MERKLE_TREE_HEIGHT);
        expect(localIndex.index).to.equal(2 ** MERKLE_TREE_HEIGHT / 2);
    });

    it('Correctly convert global Index to local index for end of leaves', () => {
        const globalIndex : GlobalIndex = 2 ** (MERKLE_TREE_HEIGHT + 1) - 2 as GlobalIndex;
        const localIndex : LocalIndex = IndexConverter.globalIndexToLocalIndex(globalIndex);
        expect(localIndex.level).to.equal(MERKLE_TREE_HEIGHT);
        expect(localIndex.index).to.equal(2 ** MERKLE_TREE_HEIGHT - 1);
    });

    it('Throws for global index out of range', () => {
        const globalIndex : GlobalIndex = 2 ** (MERKLE_TREE_HEIGHT + 1) - 1 as GlobalIndex;
        expect(() => IndexConverter.globalIndexToLocalIndex(globalIndex)).to.throw();
    });

    it('Correctly converts leaf index to local Index for start of leaves', () => {
        const leafIndex = 0;
        const localIndex : LocalIndex = IndexConverter.leafIndexToLocalIndex(leafIndex);
        expect(localIndex.level).to.equal(MERKLE_TREE_HEIGHT);
        expect(localIndex.index).to.equal(0);
    });

    it('Correctly converts leaf index to local Index for middle of leaves', () => {
        const leafIndex : number = 2 ** MERKLE_TREE_HEIGHT / 2;
        const localIndex : LocalIndex = IndexConverter.leafIndexToLocalIndex(leafIndex);
        expect(localIndex.level).to.equal(MERKLE_TREE_HEIGHT);
        expect(localIndex.index).to.equal(2 ** MERKLE_TREE_HEIGHT / 2);
    });

    it('Correctly converts leaf index to local Index for end of leaves', () => {
        const leafIndex : number = 2 ** MERKLE_TREE_HEIGHT - 1;
        const localIndex : LocalIndex = IndexConverter.leafIndexToLocalIndex(leafIndex);
        expect(localIndex.level).to.equal(MERKLE_TREE_HEIGHT);
        expect(localIndex.index).to.equal(2 ** MERKLE_TREE_HEIGHT - 1);
    });

    it('Throws for leaf index out of range', () => {
        const leafIndex : number = 2 ** MERKLE_TREE_HEIGHT;
        expect(() => IndexConverter.leafIndexToLocalIndex(leafIndex)).to.throw();
    });
});
