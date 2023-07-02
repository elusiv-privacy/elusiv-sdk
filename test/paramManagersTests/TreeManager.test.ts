import {
    MerkleTree, Poseidon, ReprScalar,
} from '@elusiv/cryptojs';
import { bigIntToNumber, serializeUint256LE } from '@elusiv/serialization';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { StorageAccountReaderDriver } from '../helpers/drivers/StorageAccountReaderDriver.js';
import { MERKLE_TREE_HEIGHT, STORAGE_MT_VALUES_PER_ACCOUNT } from '../../src/constants.js';
import { CommitmentInfo, TreeManager } from '../../src/sdk/paramManagers/TreeManager.js';
import { StorageAccountReader } from '../../src/sdk/accountReaders/StorageAccountReader.js';
import { zipSameLength } from '../../src/sdk/utils/utils.js';

// Need to import like this to get chai-as-promised to work

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Tree Manager tests', () => {
    let treeManager: TreeManager;
    let tree: MerkleTree;
    const commitmentCount = 500_000;
    const nextCommitmentPtr = commitmentCount;
    const nonExistingCommitment = BigInt(500_002);
    // First commitment, commitment right at start of a chunk, commitment right at end of a chunk, last commitment, random commitment
    const commitmentsToFetch: bigint[] = [
        BigInt(1),
        BigInt((2 ** MERKLE_TREE_HEIGHT - 1) % STORAGE_MT_VALUES_PER_ACCOUNT),
        BigInt(((2 ** MERKLE_TREE_HEIGHT - 1) % STORAGE_MT_VALUES_PER_ACCOUNT) + STORAGE_MT_VALUES_PER_ACCOUNT - 1),
        BigInt(commitmentCount - 1),
        BigInt(Math.floor(Math.random() * commitmentCount)),
    ];

    before(async function () {
        // Setting up tree takes a longass time
        this.timeout(90_000);
        // Only creating the new tree requires poseidon being initialized,
        // so continue with other stuff first
        const driverPromise = Poseidon.setupPoseidon()
            .then(async () => {
                const toInsert: ReprScalar[] = [];
                for (let i = 0; i < commitmentCount; i++) {
                    toInsert[i] = serializeUint256LE(BigInt(i + 1)) as ReprScalar;
                }
                const poseidon = Poseidon.getPoseidon();
                tree = new MerkleTree(MERKLE_TREE_HEIGHT, poseidon);
                await tree.batchInsertAsync(toInsert.map((c) => poseidon.hashBytesToBigIntLE(c)));
                const storageReaderDriver = new StorageAccountReaderDriver(tree, poseidon);
                return storageReaderDriver as unknown as StorageAccountReader;
            });

        // Circumvent the private constructor
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        treeManager = new (TreeManager as any)(await driverPromise) as TreeManager;
    });

    it('Correctly returns true for hasCommitment for an existing commitment in tree', async () => {
        expect(await treeManager.hasCommitment(Poseidon.getPoseidon().hashBigIntToBytesLE(BigInt(1)), 0));
    });

    it('Correctly returns false for hasCommitment for a non-existing commitment in tree', async () => {
        expect(await treeManager.hasCommitment(Poseidon.getPoseidon().hashBigIntToBytesLE(BigInt(commitmentCount + 1)), 0));
    });

    it('Correctly fetches latestIndex', async () => {
        const res = await treeManager.getLatestLeafIndex();
        expect(res).to.equal(nextCommitmentPtr);
    });

    [1, 10, 100, 1000, 10_000].forEach((offset) => {
        commitmentsToFetch.forEach((comm) => {
            describe(`Correctly fetches commitment info for ${comm} with offset ${offset}`, () => {
                let commitmentInfo: CommitmentInfo;
                before(async () => {
                    const serialized = Poseidon.getPoseidon().hashBigIntToBytesLE(comm);
                    commitmentInfo = (await treeManager.getCommitmentsInfo([{ fst: serialized, snd: bigIntToNumber(comm) - offset }]))[0];
                });

                it('Correctly fetches index', async () => {
                    expect(commitmentInfo.index).to.equal(bigIntToNumber(comm) - 1);
                });

                it('Correctly fetches root', async () => {
                    expect(commitmentInfo.root).to.equal(tree.getRoot(), 'Incorrect root');
                });

                it('Correctly fetches opening', async () => {
                    expect(commitmentInfo.opening).to.have.ordered.members(tree.getOpening(bigIntToNumber(comm) - 1), 'Incorrect opening');
                });

                it('Correctly recomputes root', () => {
                    const reconstructedRoot = reconstructRoot(comm, commitmentInfo.opening, bigIntToNumber(comm) - 1);
                    expect(reconstructedRoot).to.equal(tree.getRoot(), 'Incorrect root');
                });
            });
        });
        it('Throws for non-existing commitment', async () => {
            const nonExistingCommitmentSer = Poseidon.getPoseidon().hashBigIntToBytesLE(nonExistingCommitment);
            await expect(treeManager.getCommitmentsInfo([{ fst: nonExistingCommitmentSer, snd: bigIntToNumber(nonExistingCommitment) - offset }])).to.be.rejected;
        });
    });

    [[1, 2, 10, 1000], [2, 1, 1000, 10], [1000, 10, 1]].forEach((comms) => {
        describe(`Fetching info for multiple commitments at once: ${comms}`, () => {
            let commInfos: CommitmentInfo[];
            before(async () => {
                const commPairs = zipSameLength(comms.map((c) => Poseidon.getPoseidon().hashBigIntToBytesLE(BigInt(c))), comms.map((c) => Math.max(0, c - 2)));
                commInfos = await treeManager.getCommitmentsInfo(commPairs);
            });

            it('Correctly fetches indices', async () => {
                expect(commInfos.map((c) => c.index)).to.deep.equal(comms.map((c) => c - 1));
            });

            it('Correctly fetches root', async () => {
                expect(commInfos[0].root).to.equal(tree.getRoot(), 'Incorrect root');
            });

            it('Correctly fetches opening', async () => {
                for (let i = 0; i < comms.length; i++) {
                    expect(commInfos[i].opening).to.have.ordered.members(tree.getOpening(comms[i] - 1), `Incorrect opening for ${i}`);
                }
            });

            it('Correctly recomputes root', () => {
                for (let i = 0; i < comms.length; i++) {
                    const reconstructedRoot = reconstructRoot(BigInt(comms[i]), commInfos[i].opening, comms[i] - 1);
                    expect(reconstructedRoot).to.equal(tree.getRoot(), 'Incorrect root');
                }
            });
        });
    });

    it('Correctly fetches the root', async () => {
        const root = await treeManager.getRoot();
        expect(root).to.equal(tree.getRoot());
    });
});

function reconstructRoot(comm: bigint, opening: bigint[], index: number): bigint {
    let indexInner = index;
    let currValue = comm;

    for (let i = 0; i < opening.length; i++) {
        currValue = Poseidon.getPoseidon().poseidonHashBigInt(
            // Are we on the left?
            indexInner % 2 === 0
                ? [currValue, opening[i]]
                : [opening[i], currValue],
        );

        // Update index on the next level
        indexInner = Math.floor(indexInner / 2);
    }

    return currValue;
}
