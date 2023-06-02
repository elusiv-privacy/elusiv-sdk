import {
    INDEX_OUT_OF_BOUNDS, MERKLE_TREE_HEIGHT, STORAGE_MT_CHUNK_COUNT, STORAGE_MT_VALUES_PER_ACCOUNT,
} from '../../constants.js';

// When accessing the on-chain MT, there's 3 types indices:
// 1. The index of a commitment relative to its layer (localIndex)
// 2. The index of a commitment inside the global index array (globalIndex)
// 3. The index of a commitment relative to the account its stored in (accIndex or indexInAccount)
// Can be extended to include all possible conversions, however for now we only need these two

export type LocalIndex = { level: number, index: number };
export type GlobalIndex = number & {_label : 'global'};
export type AccIndex = { indexOfAccount: number, indexInAccount: number };

export class IndexConverter {
    public static localIndexToGlobalIndex(index: LocalIndex): GlobalIndex {
        if (index.level > MERKLE_TREE_HEIGHT) throw new Error(INDEX_OUT_OF_BOUNDS);
        if (index.index >= getNodeCountLevel(index.level)) throw new Error(INDEX_OUT_OF_BOUNDS);

        return 2 ** index.level - 1 + index.index as GlobalIndex;
    }

    // Returns both the index of the account the commitment is in and the accIndex
    public static globalIndextoAccIndex(
        index: GlobalIndex,
        valuesPerAccount: number = STORAGE_MT_VALUES_PER_ACCOUNT,
        accountCount: number = STORAGE_MT_CHUNK_COUNT,
    ): AccIndex {
        if (index >= getNodeCountMT(MERKLE_TREE_HEIGHT)) throw new Error(INDEX_OUT_OF_BOUNDS);

        // Index of the account in which this value can be found
        const indexOfAccount = Math.floor(index / valuesPerAccount);
        // Index of the value inside the above specified account
        const indexInAccount: number = index % valuesPerAccount;

        // Should never happen after the above check, but just in case
        if (indexOfAccount >= accountCount) throw new Error(INDEX_OUT_OF_BOUNDS);

        return { indexOfAccount, indexInAccount };
    }

    public static globalIndexToLocalIndex(globalIndex: GlobalIndex): LocalIndex {
        if (globalIndex >= getNodeCountMT(MERKLE_TREE_HEIGHT)) throw new Error(INDEX_OUT_OF_BOUNDS);
        const level = this.getLevelFromIndex(globalIndex);
        return { index: globalIndex - (2 ** level - 1), level };
    }

    public static accIndexToGlobalIndex(
        accIndex : AccIndex,
        valuesPerAccount: number = STORAGE_MT_VALUES_PER_ACCOUNT,
        accountCount: number = STORAGE_MT_CHUNK_COUNT,
    ) : GlobalIndex {
        if (accIndex.indexOfAccount >= accountCount) throw new Error(INDEX_OUT_OF_BOUNDS);
        return accIndex.indexOfAccount * valuesPerAccount + accIndex.indexInAccount as GlobalIndex;
    }

    public static localIndexToAccIndex(index : LocalIndex) : AccIndex {
        const globalI = this.localIndexToGlobalIndex(index);
        return this.globalIndextoAccIndex(globalI);
    }

    public static leafIndexToLocalIndex(leafIndex: number): LocalIndex {
        if (leafIndex >= getNodeCountLevel(MERKLE_TREE_HEIGHT)) throw new Error(INDEX_OUT_OF_BOUNDS);
        return { index: leafIndex, level: MERKLE_TREE_HEIGHT };
    }

    private static getLevelFromIndex(globalIndex: GlobalIndex): number {
        return Math.floor(Math.log2(globalIndex + 1));
    }
}

export function localIndexToString(li : LocalIndex) : string {
    return `${li.index.toString()},${li.level.toString()}`;
}

function getNodeCountMT(height: number) {
    return 2 ** (height + 1) - 1;
}

function getNodeCountLevel(level: number) {
    return 2 ** level;
}
