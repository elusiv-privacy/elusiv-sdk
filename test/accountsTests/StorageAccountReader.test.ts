import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { concatBytes } from '@elusiv/serialization';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { serialize } from '@dao-xyz/borsh';
import { MontScalar } from '@elusiv/cryptojs';
import { AccountReader } from '../../src/sdk/accountReaders/AccountReader.js';
import { StorageAccountReader } from '../../src/sdk/accountReaders/StorageAccountReader.js';
import { TreeChunkAccountReader } from '../../src/sdk/accountReaders/TreeChunkAccountReader.js';
import {
    COULD_NOT_FETCH_DATA,
    HISTORY_ARRAY_COUNT, INVALID_READ, MERKLE_TREE_HEIGHT, STORAGE_ACC_SEED, STORAGE_MT_CHUNK_COUNT, STORAGE_MT_VALUES_PER_ACCOUNT,
} from '../../src/constants.js';
import { IndexConverter, LocalIndex, localIndexToString } from '../../src/sdk/utils/IndexConverter.js';
import { AccDataConnectionDriver } from '../helpers/drivers/AccDataConnectionDriver.js';
import { StorageAccBorsh } from '../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/StorageAccBorsh.js';
import { PDAAccountDataBorsh } from '../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/PDAAccountDataBorsh.js';
import { getElusivProgramId } from '../../src/public/WardenInfo.js';

// Need to import like this to get chai-as-promised to work

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Storage Acc parsing tests', () => {
    let reader: StorageAccountReader;
    let storageData: StorageAccBorsh;
    let treeChunkReader: TreeChunkAccountReader;
    const elusivAcc = getElusivProgramId('devnet');

    /* Storage Account Data */
    const pdaData = new PDAAccountDataBorsh(0, 0);
    const chunkKeysFormatted: PublicKey[] = [];
    const chunkKeys: Uint8Array[] = [];
    const chunks: Uint8Array[] = [];
    const treeCount = 1;
    const archivedCount = 0;
    let archiveMTRootHistory: Uint8Array;
    const mtRootCount = 100;
    const nextCommitmentPtr: LocalIndex = { index: 500_000, level: MERKLE_TREE_HEIGHT };
    const activeCount = 2;
    const commitments: Uint8Array[] = [];
    const commCount = 100;

    for (let i = 0; i < commCount; i++) {
        commitments[i] = new Uint8Array(32).fill(i + 1);
    }

    before(async () => {
        // Generate the pubkeys and data for the treechunks
        for (let i = 0; i < STORAGE_MT_CHUNK_COUNT; i++) {
            const isActiveByte = Uint8Array.from(i < activeCount ? [1] : [0]);
            chunkKeysFormatted[i] = Keypair.fromSeed(new Uint8Array(32).fill(i)).publicKey;
            chunkKeys[i] = concatBytes([isActiveByte, chunkKeysFormatted[i].toBytes()]);
            // First byte indicates in use
            chunks[i] = new Uint8Array(1 + STORAGE_MT_VALUES_PER_ACCOUNT * 32).fill(0);
            chunks[i][0] = i < activeCount ? 1 : 0;
        }

        // Put half the commitments in the first chunk, half in the second. Fill chunk one with ones
        // first to make it seem occupied.
        chunks[0].fill(255);
        chunks[0][0] = 1;
        for (let i = 0; i < commCount / 2; i++) {
            // Plus one because the first byte indicates in use
            chunks[0].set(commitments[i], 1 + i * 32);
        }
        // Indicate in use
        chunks[1].fill(255, 0, (commCount / 2) * 32);
        chunks[1][0] = 1;
        for (let i = commCount / 2; i < commCount; i++) {
            chunks[1].set(commitments[i], 1 + i * 32);
        }

        const rootHistory: number[] = [];
        for (let i = 0; i < HISTORY_ARRAY_COUNT * 32; i++) {
            rootHistory[i] = i % 256;
        }

        archiveMTRootHistory = Uint8Array.from(rootHistory);
        const mergedKeys = concatBytes(chunkKeys);

        const toSerialize = new StorageAccBorsh(
            pdaData,
            mergedKeys,
            nextCommitmentPtr.index,
            treeCount,
            archivedCount,
            archiveMTRootHistory,
            mtRootCount,
        );

        const serialized = serialize(toSerialize);
        const storageKey = AccountReader.generateElusivPDAFrom([STORAGE_ACC_SEED], elusivAcc);

        const conn = new AccDataConnectionDriver();
        conn.addAccountData(storageKey[0], Buffer.from(serialized));
        for (let i = 0; i < STORAGE_MT_CHUNK_COUNT; i++) {
            conn.addAccountData(chunkKeysFormatted[i], Buffer.from(chunks[i]));
        }

        reader = new StorageAccountReader(conn as unknown as Connection, 'devnet');
        treeChunkReader = new TreeChunkAccountReader(conn as unknown as Connection);
        storageData = await reader.getData();
    });

    it('Correctly parses archiveMTRootHistory', () => {
        const parsed = storageData.active_mt_root_history;
        expect(parsed).to.deep.equal(archiveMTRootHistory);
    });

    it('Correctly parses archivedCount', () => {
        const parsed = storageData.archived_count;
        expect(parsed).to.equal(archivedCount);
    });

    it('Correctly parses chunkKeys', () => {
        const parsed = storageData.pubkeys;
        expect(parsed).to.deep.equal(concatBytes(chunkKeys));
    });

    it('Correctly parses mtRootCount', () => {
        const parsed = storageData.mt_roots_count;
        expect(parsed).to.equal(mtRootCount);
    });

    it('Correctly parses nextCommitmentPtr', () => {
        const parsed = storageData.next_commitment_ptr;
        expect(parsed).to.equal(nextCommitmentPtr.index);
    });

    it('Correctly parses treeCount', () => {
        const parsed = storageData.trees_count;
        expect(parsed).to.equal(treeCount);
    });

    it('Correctly fetches current pointer without cache', async () => {
        const res = await reader.getCurrentPointer();
        expect(res.localIndex).to.deep.equal(nextCommitmentPtr);
    });

    it('Correctly fetches current pointer with cache', async () => {
        const data = await reader.getData();
        const res = await reader.getCurrentPointer(data);
        expect(res.localIndex).to.deep.equal(nextCommitmentPtr);
    });

    it('Corectly fetches raw chunk keys', async () => {
        const data = await reader.getData();
        const chunkKeysRaw = data.pubkeys;
        expect(chunkKeysRaw).to.deep.equal(storageData.pubkeys);
    });

    for (let i = 0; i < activeCount; i++) {
        it(`Corectly parses active chunk key at index ${i}`, async () => {
            const data = await reader.getData();
            const chunkKeysRaw = data.pubkeys;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(StorageAccountReader['getChunkKeyAtIndex'](chunkKeysRaw, i)!.toBytes()).to.deep.equal(chunkKeys[i].slice(1));
        });
        it(`Corectly fetches active chunk at index ${i}`, async () => {
            const data = await reader.getData();
            expect(await StorageAccountReader['getChunkFromIndex'](i, data, treeChunkReader)).to.deep.equal(chunks[i].slice(1));
        });
    }

    it('Correctly fetches multiple chunks for no chunks', async () => {
        const data = await reader.getData();
        const res = await Promise.all(StorageAccountReader['getChunksFromIndices']([], data, treeChunkReader));
        expect(res).to.deep.equal([]);
    });

    it('Correctly fetches multiple chunks for one chunk', async () => {
        const data = await reader.getData();
        const res = await Promise.all(StorageAccountReader['getChunksFromIndices']([0], data, treeChunkReader));
        expect(res).to.deep.equal([chunks[0].slice(1)]);
    });

    it('Correctly fetches multiple chunks for multiple chunks', async () => {
        const data = await reader.getData();
        const res = await Promise.all(StorageAccountReader['getChunksFromIndices']([0, 1], data, treeChunkReader));
        expect(res).to.deep.equal([chunks[0].slice(1), chunks[1].slice(1)]);
    });

    it('Throws for fetching multiple chunks for inactive chunk', async () => {
        const data = await reader.getData();
        expect(Promise.all(StorageAccountReader['getChunksFromIndices']([0, 1, 2], data, treeChunkReader))).to.be.rejectedWith(INVALID_READ);
    });

    it('Correctly finds commitment indices in one chunk for empty arr', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesInChunk'](chunks[0].slice(1), [], []);
        expect(res).to.deep.equal([]);
    });

    it('Correctly finds commitment indices in one chunk for one commitment', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesInChunk'](chunks[0].slice(1), [commitments[0] as MontScalar], [0]);
        expect(res).to.deep.equal([0]);
    });

    it('Correctly finds commitment indices in one chunk for multiple commitments', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesInChunk'](chunks[0].slice(1), [commitments[0] as MontScalar, commitments[20] as MontScalar], [0, 10]);
        expect(res).to.deep.equal([0, 20]);
    });

    it('Correctly returns undefined for commitment not in chunk', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesInChunk'](chunks[0].slice(1), [commitments[99] as MontScalar], [0]);
        expect(res).to.deep.equal([undefined]);
    });

    it('Correctly returns undefined for some commitment not in and some in chunk (not at end)', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesInChunk'](chunks[0].slice(1), [commitments[1] as MontScalar, commitments[99] as MontScalar], [0, 0]);
        expect(res).to.deep.equal([1, undefined]);
    });

    it('Correctly returns undefined for some commitment not in and some in chunk (not at start)', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesInChunk'](chunks[0].slice(1), [commitments[99] as MontScalar, commitments[1] as MontScalar], [0, 0]);
        expect(res).to.deep.equal([undefined, 1]);
    });

    it('Correctly returns undefined for some commitment not in and some in chunk (not in middle)', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesInChunk'](chunks[0].slice(1), [commitments[1] as MontScalar, commitments[99] as MontScalar, commitments[2] as MontScalar], [0, 0, 0]);
        expect(res).to.deep.equal([1, undefined, 2]);
    });

    it('Correctly finds indices with bigger startIndex', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesInChunk'](chunks[0].slice(1), [commitments[1] as MontScalar, commitments[20] as MontScalar], [0, 1]);
        expect(res).to.deep.equal([1, 20]);
    });

    it('Correctly finds indices with equal startIndex', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesInChunk'](chunks[0].slice(1), [commitments[1] as MontScalar, commitments[20] as MontScalar], [1, 20]);
        expect(res).to.deep.equal([1, 20]);
    });

    it('Correctly finds indices with bigger startIndex', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesInChunk'](chunks[0].slice(1), [commitments[0] as MontScalar, commitments[20] as MontScalar], [0, 10]);
        expect(res).to.deep.equal([0, 20]);
    });

    it('Correctly finds commitment indices in multiple chunks for empty arr', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesAcrossChunks']([], treeChunkReader, storageData);
        expect(Array.from(res.entries())).to.deep.equal([]);
    });

    it('Correctly finds commitment indices in multiple chunks for one commitment', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesAcrossChunks']([{ fst: commitments[0] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 0 } }], treeChunkReader, storageData);
        expect(Array.from(res.entries())).to.deep.equal([[commitments[0] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 0, indexOfAccount: 0 })]]);
    });

    it('Correctly finds commitment indices in multiple chunks for multiple commitments in the same chunk', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesAcrossChunks']([
            { fst: commitments[0] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 0 } },
            { fst: commitments[20] as MontScalar, snd: { indexInAccount: 20, indexOfAccount: 0 } },
        ], treeChunkReader, storageData);
        expect(Array.from(res.entries())).to.deep.equal([
            [commitments[0] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 0, indexOfAccount: 0 })],
            [commitments[20] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 20, indexOfAccount: 0 })],
        ]);
    });

    it('Correctly finds commitment indices in multiple chunks for multiple commitments in different chunks (correct indexOfAcc start)', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesAcrossChunks']([
            { fst: commitments[0] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 0 } },
            { fst: commitments[60] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 1 } },
        ], treeChunkReader, storageData);
        expect(Array.from(res.entries())).to.deep.equal([
            [commitments[0] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 0, indexOfAccount: 0 })],
            [commitments[60] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 60, indexOfAccount: 1 })],
        ]);

        // Switch the order
        const res2 = await StorageAccountReader['findCommitmentIndicesAcrossChunks']([
            { fst: commitments[60] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 1 } },
            { fst: commitments[0] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 0 } },
        ], treeChunkReader, storageData);

        expect(Array.from(res2.entries())).to.deep.equal([
            [commitments[0] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 0, indexOfAccount: 0 })],
            [commitments[60] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 60, indexOfAccount: 1 })],
        ]);
    });

    it('Correctly finds commitment indices in multiple chunks for multiple commitments in different chunks (incorrect indexOfAcc start)', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesAcrossChunks']([
            { fst: commitments[0] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 0 } },
            { fst: commitments[60] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 0 } },
        ], treeChunkReader, storageData);
        expect(Array.from(res.entries())).to.deep.equal([
            [commitments[0] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 0, indexOfAccount: 0 })],
            [commitments[60] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 60, indexOfAccount: 1 })],
        ]);

        // Swicth the order

        const res2 = await StorageAccountReader['findCommitmentIndicesAcrossChunks']([
            { fst: commitments[60] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 0 } },
            { fst: commitments[0] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 0 } },
        ], treeChunkReader, storageData);
        expect(Array.from(res2.entries())).to.deep.equal([
            [commitments[0] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 0, indexOfAccount: 0 })],
            [commitments[60] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 60, indexOfAccount: 1 })],
        ]);
    });

    it('Correctly finds commitment indices in multiple chunks for a bunch of commitments in different chunks', async () => {
        const res = await StorageAccountReader['findCommitmentIndicesAcrossChunks']([
            { fst: commitments[0] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 0 } },
            { fst: commitments[60] as MontScalar, snd: { indexInAccount: 60, indexOfAccount: 1 } },
            { fst: commitments[20] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 0 } },
            { fst: commitments[80] as MontScalar, snd: { indexInAccount: 0, indexOfAccount: 0 } },
        ], treeChunkReader, storageData);
        expect(Array.from(res.entries())).to.deep.equal([
            [commitments[0] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 0, indexOfAccount: 0 })],
            [commitments[20] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 20, indexOfAccount: 0 })],
            [commitments[60] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 60, indexOfAccount: 1 })],
            [commitments[80] as MontScalar, IndexConverter.accIndexToGlobalIndex({ indexInAccount: 80, indexOfAccount: 1 })],
        ]);
    });

    for (let i = activeCount; i < STORAGE_MT_CHUNK_COUNT; i++) {
        it(`Throws for trying to get inactive chunk key at index ${i}`, async () => {
            const data = await reader.getData();
            const chunkKeysRaw = data.pubkeys;
            expect(() => StorageAccountReader['getChunkKeyAtIndex'](chunkKeysRaw, i)).to.throw(INVALID_READ);
        });
        it(`Throws for fetching inactive chunk at index ${i}`, async () => {
            const data = await reader.getData();
            await expect(StorageAccountReader['getChunkFromIndex'](i, data, treeChunkReader)).to.be.rejectedWith(INVALID_READ);
        });
    }

    it('Throws for trying to get nonexistent chunk key', async () => {
        const data = await reader.getData();
        const chunkKeysRaw = data.pubkeys;
        expect(() => StorageAccountReader['getChunkKeyAtIndex'](chunkKeysRaw, STORAGE_MT_CHUNK_COUNT)).to.throw(INVALID_READ);
    });
    it('Throws for fetching inactive chunk key', async () => {
        const data = await reader.getData();
        await expect(StorageAccountReader['getChunkFromIndex'](STORAGE_MT_CHUNK_COUNT, data, treeChunkReader)).to.be.rejectedWith(INVALID_READ);
    });

    it('Correctly fetches root', async () => {
        const res = await reader.getRoot();
        expect(res).to.deep.equal(commitments[0]);
    });

    for (let i = 0; i < commitments.length / 2; i++) {
        it(`Correctly fetches commitment at index ${i}`, async () => {
            const data = await reader.getData();
            const chunk = await StorageAccountReader['getChunkFromIndex'](0, data, treeChunkReader);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const res = await StorageAccountReader['readCommitmentAtAccIndex'](chunk!, i);
            expect(res).to.deep.equal(commitments[i]);
        });
    }

    it('Correctly fetches multiple commitments', async () => {
        const localIndices: LocalIndex[] = [
            { level: 0, index: 0 },
            { level: 1, index: 0 },
            { level: 1, index: 1 },
        ];

        const res = await reader.getCommitmentsAtLocalIndices(localIndices);

        const expectedMap = new Map<string, Uint8Array>();
        expectedMap.set(localIndexToString(localIndices[0]), commitments[0]);
        expectedMap.set(localIndexToString(localIndices[1]), commitments[1]);
        expectedMap.set(localIndexToString(localIndices[2]), commitments[2]);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const realMap = res!.commitments;

        expect(res).to.not.be.undefined;
        expect(Array.from(realMap.entries())).to.deep.equal(Array.from(expectedMap.entries()));
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(res!.root).to.eventually.deep.equal(commitments[0]);
    });

    it('Correctly fetches commitment from index with smaller start index', async () => {
        const start: LocalIndex = { level: 0, index: 0 };

        const res = await reader.findCommitmentIndicesFromStartIndex([{ fst: commitments[2] as MontScalar, snd: start }]);
        expect(res.indices.get(commitments[2] as MontScalar)).to.equal(2);
    });

    it('Correctly fetches multiple commitment from index with smaller start index', async () => {
        const start: LocalIndex = { level: 0, index: 0 };

        const res = await reader.findCommitmentIndicesFromStartIndex([
            { fst: commitments[2] as MontScalar, snd: start },
            { fst: commitments[1] as MontScalar, snd: start },
        ]);
        expect(res.indices.get(commitments[2] as MontScalar)).to.equal(2);
        expect(res.indices.get(commitments[1] as MontScalar)).to.equal(1);
    });

    it('Correctly fetches commitment from index with equal start index', async () => {
        const start: LocalIndex = { level: 1, index: 1 };

        const res = await reader.findCommitmentIndicesFromStartIndex([{ fst: commitments[2] as MontScalar, snd: start }]);
        expect(res.indices.get(commitments[2] as MontScalar)).to.equal(2);
    });

    it('Correctly fetches multiple commitment from index with equal start index', async () => {
        const res = await reader.findCommitmentIndicesFromStartIndex([
            { fst: commitments[2] as MontScalar, snd: { level: 1, index: 1 } },
            { fst: commitments[1] as MontScalar, snd: { level: 1, index: 0 } },
        ]);
        expect(res.indices.get(commitments[2] as MontScalar)).to.equal(2);
        expect(res.indices.get(commitments[1] as MontScalar)).to.equal(1);
    });

    it('Throws for fetching commitment with start index greater than index', async () => {
        const start: LocalIndex = { level: 1, index: 2 };

        expect(reader.findCommitmentIndicesFromStartIndex([{ fst: commitments[2] as MontScalar, snd: start }])).to.be.rejectedWith(COULD_NOT_FETCH_DATA('commitment'));
    });

    it('Throws for fetching at least one commitment with start index greater than index', async () => {
        const start: LocalIndex = { level: 1, index: 2 };

        expect(reader.findCommitmentIndicesFromStartIndex([
            { fst: commitments[2] as MontScalar, snd: start },
            { fst: commitments[1] as MontScalar, snd: { level: 1, index: 1 } },
        ])).to.be.rejectedWith(COULD_NOT_FETCH_DATA('commitment'));
    });

    describe('Group acc indices tests', () => {
        it('Correctly groups account indices for empty array', () => {
            const res = StorageAccountReader['groupAccIndices']([]);
            expect(Array.from(res.entries())).to.deep.equal([]);
        });

        it('Correctly groups account indices for single index', () => {
            const res = StorageAccountReader['groupAccIndices']([
                { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 0, indexInAccount: 0 } },
            ]);
            expect(Array.from(res.entries())).to.deep.equal([
                [
                    0,
                    [
                        {
                            fst: new Uint8Array(32) as MontScalar,
                            snd: { indexOfAccount: 0, indexInAccount: 0 },
                        },
                    ],
                ],
            ]);
        });

        it('Correctly groups account indices for multiple indices', () => {
            const res = StorageAccountReader['groupAccIndices']([
                { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 0, indexInAccount: 0 } },
                { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 0, indexInAccount: 1 } },
                { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 1, indexInAccount: 0 } },
                { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 1, indexInAccount: 1 } },
            ]);
            expect(Array.from(res.entries())).to.deep.equal([
                [
                    0,
                    [
                        { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 0, indexInAccount: 0 } },
                        { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 0, indexInAccount: 1 } },
                    ],
                ],
                [
                    1,
                    [
                        { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 1, indexInAccount: 0 } },
                        { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 1, indexInAccount: 1 } },
                    ],
                ],
            ]);
        });

        it('Correctly groups account indices for multiple indices with different account indices', () => {
            const res = StorageAccountReader['groupAccIndices']([
                { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 0, indexInAccount: 0 } },
                { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 0, indexInAccount: 1 } },
                { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 1, indexInAccount: 0 } },
                { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 2, indexInAccount: 0 } },
            ]);
            expect(Array.from(res.entries())).to.deep.equal([
                [
                    0,
                    [
                        { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 0, indexInAccount: 0 } },
                        { fst: new Uint8Array(32) as MontScalar, snd: { indexOfAccount: 0, indexInAccount: 1 } },
                    ],
                ],
                [
                    1,
                    [
                        {
                            fst: new Uint8Array(32) as MontScalar,
                            snd: { indexOfAccount: 1, indexInAccount: 0 },
                        },
                    ],
                ],
                [
                    2,
                    [
                        {
                            fst: new Uint8Array(32) as MontScalar,
                            snd: { indexOfAccount: 2, indexInAccount: 0 },
                        },
                    ],
                ],
            ]);
        });
    });
});
