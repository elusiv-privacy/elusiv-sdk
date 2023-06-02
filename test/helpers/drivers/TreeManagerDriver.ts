import { MerkleTree, Poseidon, ReprScalar } from 'elusiv-cryptojs';

export class TreeManagerDriver {
    private tree : MerkleTree;

    constructor(tree : MerkleTree) {
        this.tree = tree;
    }

    public getRoot() : bigint {
        return this.tree.getRoot();
    }

    public getLatestLeafIndex() : number {
        return this.tree.getLeaves().length - 1;
    }

    public getCommitmentInfo(commitmentHash : ReprScalar, startIndex : number) : { opening : bigint[], index : number, root : bigint } {
        const leafIndex = this.tree.getLeafIndex(startIndex, Poseidon.getPoseidon().hashBytesToBigIntLE(commitmentHash));
        const opening = this.tree.getOpening(leafIndex);
        return { opening, index: leafIndex, root: this.tree.getRoot() };
    }
}
