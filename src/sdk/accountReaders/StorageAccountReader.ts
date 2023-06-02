// StorageAcc = storage (Multiaccount =
// after first 3 bytes comes array (length = 25) of PubKeys each 33 bytes
// first byte: is used (or can just check if fully 0))
// Each PublicKey points to a subaccount each has 83887 values
// (except nr 25, has a few less) --> 2^level - 1 + index,
// root is level 0, leaves are level 20 -> index is 256 bit value

import { Cluster, Connection, PublicKey } from '@solana/web3.js';
import { MontScalar } from 'elusiv-cryptojs';
import { equalsUint8Arr, zeros } from 'elusiv-serialization';
import {
    COULD_NOT_FETCH_DATA,
    INVALID_READ, MERKLE_TREE_HEIGHT, STORAGE_ACC_SEED, STORAGE_MT_CHUNK_COUNT,
    STORAGE_MT_VALUES_PER_ACCOUNT,
} from '../../constants.js';
import { StorageAccBorsh } from '../transactions/txBuilding/serializedTypes/borshTypes/accounts/StorageAccBorsh.js';
import {
    AccIndex, GlobalIndex, IndexConverter, LocalIndex, localIndexToString,
} from '../utils/IndexConverter.js';
import { Pair } from '../utils/Pair.js';
import {
    isDefinedSparseArr, mergeMaps, readFixedLengthValueFromBuffer,
} from '../utils/utils.js';
import { AccountReader } from './AccountReader.js';
import { TreeChunkAccountReader } from './TreeChunkAccountReader.js';

export class StorageAccountReader extends AccountReader {
    private cluster : Cluster;

    public constructor(connection: Connection, cluster : Cluster) {
        super(connection);
        this.cluster = cluster;
    }

    public async getData(): Promise<StorageAccBorsh> {
        return super.getProgramInfoFromSeeds(StorageAccBorsh, this.cluster, [STORAGE_ACC_SEED]);
    }

    public async getCurrentPointer(
        storageDataCached?: StorageAccBorsh,
    ): Promise<{ localIndex: LocalIndex, storageAcc: StorageAccBorsh }> {
        const storageData = (storageDataCached === undefined
            ? await this.getData()
            : storageDataCached);
        return { localIndex: { index: storageData.next_commitment_ptr, level: MERKLE_TREE_HEIGHT }, storageAcc: storageData };
    }

    public async findCommitmentIndicesFromStartIndex(
        comms: readonly Pair<MontScalar, LocalIndex>[],
        storageDataCached?: StorageAccBorsh,
    ): Promise<{ indices: Map<MontScalar, GlobalIndex>, storageAcc: StorageAccBorsh }> {
        const storageData = storageDataCached === undefined
            ? await this.getData()
            : storageDataCached;
        const treeChunkReader = new TreeChunkAccountReader(this.connection);

        const groupedByAccs = StorageAccountReader.groupAccIndices(
            comms.map((p) => ({ fst: p.fst, snd: IndexConverter.localIndexToAccIndex(p.snd) })),
        );

        const fetchedCommIndices : Promise<Map<MontScalar, GlobalIndex>>[] = [];
        for (const accIndex of groupedByAccs.keys()) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            fetchedCommIndices.push(StorageAccountReader.findCommitmentIndicesAcrossChunks(groupedByAccs.get(accIndex)!, treeChunkReader, storageData));
        }

        return { indices: await Promise.all(fetchedCommIndices).then((maps) => mergeMaps(maps)), storageAcc: storageData };
    }

    private static async findCommitmentIndicesAcrossChunks(comms: readonly Pair<MontScalar, AccIndex>[], treeChunkReader: TreeChunkAccountReader, storageAcc: StorageAccBorsh): Promise<Map<MontScalar, GlobalIndex>> {
        const res : Map<MontScalar, GlobalIndex> = new Map();
        if (comms.length === 0) return res;

        // These *should* always have the same account. In case they don't, we start at the lowest one to
        // make sure we don't miss any commitments.
        const minAcc = comms.reduce((acc, c) => Math.min(acc, c.snd.indexOfAccount), STORAGE_MT_CHUNK_COUNT);

        for (let accIndex = minAcc; res.size !== comms.length && accIndex < STORAGE_MT_CHUNK_COUNT; accIndex++) {
            // eslint-disable-next-line no-await-in-loop
            const chunk = await StorageAccountReader.getChunkFromIndex(accIndex, storageAcc, treeChunkReader);
            const leftToFindComms = comms.filter((c) => !res.has(c.fst));
            const foundIndices = StorageAccountReader.findCommitmentIndicesInChunk(
                chunk,
                leftToFindComms.map((c) => c.fst),
                //  we are in the account this starting index applies to, start there. Else start at 0
                leftToFindComms.map((c) => (c.snd.indexOfAccount === accIndex ? c.snd.indexInAccount : 0)),
            );
            // Insert the commitment we found in this chunk into the map
            foundIndices.forEach((indexInAccount, i) => {
                if (indexInAccount !== undefined) {
                    res.set(leftToFindComms[i].fst, IndexConverter.accIndexToGlobalIndex({ indexInAccount, indexOfAccount: accIndex }));
                }
            });
        }

        return res;
    }

    // Checks one chunk for n commitments. Returns array of index|undefined, where index means the nth commitment was found there.
    // Pait<Commhash, startindex>
    private static findCommitmentIndicesInChunk(chunk: Uint8Array, commHashes: readonly MontScalar[], startIndices : number[]): (number | undefined)[] {
        const zeroCommitment = zeros(32);
        const sortedStartIndices = startIndices.sort();
        // TODO: Replace this with a map?
        const res: (number | undefined)[] = new Array(commHashes.length);
        // Confusing name, but just the start index we're currently on from the above array.
        // We can always skip to the next one, because start index is always a minimum where that commitment has to be.
        // So if we find a commitment at index n and the next start index is m, there is no commitment that could be any where between n and m.
        let startIndexIndex = 0;
        for (let i = sortedStartIndices[startIndexIndex]; i < STORAGE_MT_VALUES_PER_ACCOUNT; i++) {
            const fetchedCommitment = StorageAccountReader.readCommitmentAtAccIndex(
                chunk,
                i,
            );

            // If we start hitting zeros, we've reached the end of the populated tree
            if (equalsUint8Arr(fetchedCommitment, zeroCommitment)) {
                throw new Error(COULD_NOT_FETCH_DATA('commitment'));
            }

            // Indicates if we've found a commitment
            let found = false;
            // if it's a valid hash, check if it's one of the one we're looking for
            commHashes.forEach((val, j) => {
                // Not undefined means we've already found the jth commitment, so no need to check that one
                if (res[j] === undefined && equalsUint8Arr(val, new Uint8Array(fetchedCommitment))) {
                    // If they're equal, save the current index in that commitments spot
                    res[j] = i;
                    found = true;
                }
            });

            // If we found a commitment, potentially skip to the next start index
            if (found) {
                startIndexIndex++;
                // -1 because at the top of the loop this will be immediately incremented by one, but we want to check
                // at this index too
                const nextStart = sortedStartIndices[startIndexIndex] - 1;
                i = nextStart > i ? nextStart : i;
            }

            // If every commitment we're looking for is defined, return
            if (isDefinedSparseArr(res)) break;
        }

        return res;
    }

    // Option to pass storageData if it was already fetched prior for consecutive calls
    // Also returns root since this is used for opening where usually root is also needed
    public async getCommitmentsAtLocalIndices(
        localIndices: LocalIndex[],
        storageDataCached?: StorageAccBorsh,
    ): Promise<{ commitments: Map<string, MontScalar>, root: Promise<MontScalar>, storageAcc: StorageAccBorsh }> {
        const storageData = storageDataCached === undefined
            ? await this.getData()
            : storageDataCached;
        const treeChunkReader = new TreeChunkAccountReader(this.connection);
        // Initiates fetching of all chunks that are needed since this is the real bottleneck
        const uniqueAccs = StorageAccountReader.getChunksFromIndices(
            [...new Set(localIndices.map((i) => IndexConverter.localIndexToAccIndex(i).indexOfAccount))],
            storageData,
            treeChunkReader,
        );

        const res : Map<string, MontScalar> = new Map();

        const commitmentsToFetch: Promise<void>[] = [];
        const rootPromise: Promise<MontScalar> = this.getRoot(storageData);

        for (const i of localIndices) {
            const accIndexData = IndexConverter.localIndexToAccIndex(i);

            commitmentsToFetch.push(uniqueAccs[accIndexData.indexOfAccount]
                .then((data) => StorageAccountReader.readCommitmentAtAccIndex(
                    data,
                    accIndexData.indexInAccount,
                )).then((comm) => {
                    res.set(localIndexToString(i), comm);
                }));
        }

        // Wait for all the commitments to be fetched

        await Promise.all(commitmentsToFetch);

        return { commitments: res, root: rootPromise, storageAcc: storageData };
    }

    public async getRoot(storageDataCached?: StorageAccBorsh): Promise<MontScalar> {
        const storageAcc = storageDataCached === undefined
            ? await this.getData()
            : storageDataCached;

        const treeChunkReader = new TreeChunkAccountReader(this.connection);
        const chunk = await StorageAccountReader.getChunkFromIndex(0, storageAcc, treeChunkReader);
        if (chunk === null) throw new Error(COULD_NOT_FETCH_DATA('root'));
        return StorageAccountReader.readCommitmentAtAccIndex(chunk, 0);
    }

    private static async getChunkFromIndex(accIndex: number, storageAcc: StorageAccBorsh, treeChunkReader: TreeChunkAccountReader): Promise<Uint8Array> {
        const key = StorageAccountReader.getChunkKeyAtIndex(storageAcc.pubkeys, accIndex);
        if (key === null) throw new Error(COULD_NOT_FETCH_DATA('chunk'));
        return treeChunkReader
            .getTreeChunk(key).then((data) => data.commitment_data);
    }

    private static getChunksFromIndices(accIndices: number[], storageAcc: StorageAccBorsh, treeChunkReader: TreeChunkAccountReader): Promise<Uint8Array>[] {
        const res : Promise<Uint8Array>[] = [];
        accIndices.forEach((i) => {
            res[i] = StorageAccountReader.getChunkFromIndex(i, storageAcc, treeChunkReader);
        });
        return res;
    }

    private static readCommitmentAtAccIndex(bytes: Uint8Array, accIndex: number) {
        // A commitment is 32 bytes long
        const COMMITMENT_LENGTH = 32;
        return readFixedLengthValueFromBuffer(
            bytes,
            accIndex,
            COMMITMENT_LENGTH,
        ) as MontScalar;
    }

    private static getChunkKeyAtIndex(mergedChunkKeys: Uint8Array, index: number): PublicKey | null {
        if (index >= STORAGE_MT_CHUNK_COUNT) throw new Error(INVALID_READ);
        // Chunk keys are encoded as 33 bytes, whereby the first byte indicates if it's active
        const CHUNK_KEY_LENGTH = 33;
        const fetchedKeyBuffer = readFixedLengthValueFromBuffer(mergedChunkKeys, index, CHUNK_KEY_LENGTH);
        if (fetchedKeyBuffer === null) return null;
        if (fetchedKeyBuffer[0] === 0) {
            throw new Error(INVALID_READ);
        }
        return new PublicKey(fetchedKeyBuffer.slice(1, CHUNK_KEY_LENGTH));
    }

    // Map from accIndex to comms being inside that account
    private static groupAccIndices(comms: Pair<MontScalar, AccIndex>[]): Map<number, Pair<MontScalar, AccIndex>[]> {
        const res = new Map<number, Pair<MontScalar, AccIndex>[]>();

        comms.forEach((comm) => {
            if (!res.has(comm.snd.indexOfAccount)) {
                res.set(comm.snd.indexOfAccount, []);
            }
            res.set(
                comm.snd.indexOfAccount,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                [...res.get(comm.snd.indexOfAccount)!, comm],
            );
        });
        return res;
    }
}
