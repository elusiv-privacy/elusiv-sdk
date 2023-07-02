/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    MerkleTree, MontScalar, Poseidon, ReprScalar,
} from '@elusiv/cryptojs';
import { zeros } from '@elusiv/serialization';
import { StorageAccBorsh } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/StorageAccBorsh';
import {
    GlobalIndex, IndexConverter, LocalIndex, localIndexToString,
} from '../../../src/sdk/utils/IndexConverter.js';
import { Pair } from '../../../src/sdk/utils/Pair.js';

export class StorageAccountReaderDriver {
    private tree: MerkleTree;

    private poseidon: Poseidon;

    public constructor(tree: MerkleTree, poseidon: Poseidon) {
        this.tree = tree;
        this.poseidon = poseidon;
    }

    public insertLeaves(leaves: ReprScalar[]): Promise<number> {
        return this.tree.batchInsertAsync(leaves.map((l) => this.poseidon.hashBytesToBigIntLE(l)));
    }

    // eslint-disable-next-line class-methods-use-this
    public async getData(): Promise<StorageAccBorsh> {
        throw new Error('Method not implemented.');
    }

    public async getCurrentPointer(
        storageDataCached?: StorageAccBorsh,
    ): Promise<{ localIndex: LocalIndex, storageAcc: StorageAccBorsh }> {
        return { localIndex: { index: this.tree.getLeaves().length, level: this.tree.height }, storageAcc: null as unknown as StorageAccBorsh };
    }

    public async findCommitmentIndexFromStartIndex(
        startIndex: LocalIndex,
        commitmentToFind: MontScalar,
        storageDataCached?: StorageAccBorsh,
    ): Promise<{ index: GlobalIndex, storageAcc: StorageAccBorsh }> {
        const reprComm = this.poseidon.montToRepr(commitmentToFind);
        const reprBigInt = this.poseidon.hashBytesToBigIntLE(reprComm);
        const leafIndex = this.tree.getLeafIndex(startIndex.index, reprBigInt);

        const globalIndex = IndexConverter.localIndexToGlobalIndex({ index: leafIndex, level: this.tree.height });

        return { index: globalIndex, storageAcc: null as unknown as StorageAccBorsh };
    }

    public async getRoot(storageDataCached?: StorageAccBorsh): Promise<MontScalar> {
        const rootRepr = this.poseidon.hashBigIntToBytesLE(this.tree.getRoot());

        return this.poseidon.reprToMont(rootRepr);
    }

    // Option to pass storageData if it was already fetched prior for consecutive calls
    // Also returns root since this is used for opening where usually root is also needed
    public async getCommitmentsAtLocalIndices(
        localIndices: LocalIndex[],
        storageDataCached?: StorageAccBorsh,
    ): Promise<{ commitments: Map<string, MontScalar>, root: Promise<MontScalar>, storageAcc: StorageAccBorsh }> {
        const commitments: Map<string, MontScalar> = new Map();
        for (let i = 0; i < localIndices.length; i++) {
            commitments.set(
                localIndexToString(localIndices[i]),
                this.getCommitmentAtLocalIndex(localIndices[i]),
            );
        }

        return { commitments, root: this.getRoot(), storageAcc: null as unknown as StorageAccBorsh };
    }

    public async findCommitmentIndicesFromStartIndex(
        comms: readonly Pair<MontScalar, LocalIndex>[],
        storageDataCached?: StorageAccBorsh,
    ): Promise<{ indices: Map<MontScalar, GlobalIndex>, storageAcc: StorageAccBorsh }> {
        const indices = new Map<MontScalar, GlobalIndex>();
        for (let i = 0; i < comms.length; i++) {
            const comm = comms[i].fst;
            const startIndex = comms[i].snd;
            // eslint-disable-next-line no-await-in-loop
            const index = await this.findCommitmentIndexFromStartIndex(startIndex, comm);

            indices.set(comm, index.index);
        }

        return { indices, storageAcc: null as unknown as StorageAccBorsh };
    }

    private getCommitmentAtLocalIndex(
        localIndex: LocalIndex,
    ): MontScalar {
        // Merkle tree impl has levels inversed
        const level = this.tree.getLevel(this.tree.height - localIndex.level);
        const node = level[localIndex.index];
        if (node === undefined && localIndex.index < 2 ** localIndex.level) {
            return zeros(32) as MontScalar;
        }
        const commRepr = this.poseidon.hashBigIntToBytesLE(node);
        return this.poseidon.reprToMont(commRepr);
    }
}
