import { Cluster, Connection } from '@solana/web3.js';
import {
    MontScalar, Poseidon, ReprScalar,
} from '@elusiv/cryptojs';
import { equalsUint8Arr, zeros } from '@elusiv/serialization';
import { StorageAccountReader } from '../accountReaders/StorageAccountReader.js';
import { COULD_NOT_FIND_COMMITMENT, INVALID_SIZE } from '../../constants.js';
import { IndexConverter, LocalIndex, localIndexToString } from '../utils/IndexConverter.js';
import { Pair } from '../utils/Pair.js';
import { GeneralSet } from '../utils/GeneralSet.js';

export type CommitmentInfo = {
    index: number,
    opening: bigint[],
    root: bigint,
}

export class TreeManager {
    private storageReader: StorageAccountReader;

    private constructor(storageReader: StorageAccountReader) {
        this.storageReader = storageReader;
    }

    public static createTreeManager(connection: Connection, cluster: Cluster): TreeManager {
        const storageReader = new StorageAccountReader(connection, cluster);
        return new TreeManager(storageReader);
    }

    // NOTE: getOpening also returns root and is more efficient by fetching both
    // in one call instead of seperately. If you need both anyway, use getOpening
    public async getRoot(): Promise<bigint> {
        return this.storageReader.getRoot().then((b) => TreeManager.parseTreeBytesToBigInt(b, 0));
    }

    // Returns latest index of leaf (i.e. the first leaf inserted has index 0)
    public async getLatestLeafIndex(): Promise<number> {
        return (await this.storageReader.getCurrentPointer()).localIndex.index;
    }

    // Params: Pair<CommitmentHash, Leafstartpointer>
    public async getCommitmentsInfo(
        commitments: Pair<ReprScalar, number>[],
    ): Promise<CommitmentInfo[]> {
        const commitmentIndices = await this.getCommitmentIndices(commitments.map((c) => ({ fst: c.fst, snd: IndexConverter.leafIndexToLocalIndex(c.snd) })));
        const ops = await this.getOpenings(commitmentIndices);
        if (ops.openings.length !== commitmentIndices.length && commitmentIndices.length !== commitments.length) throw new Error(INVALID_SIZE('commIndices', commitmentIndices.length, commitments.length));
        const res: CommitmentInfo[] = [];
        for (let i = 0; i < commitments.length; i++) {
            res[i] = {
                index: commitmentIndices[i].index,
                opening: ops.openings[i],
                root: ops.root,
            };
        }

        return res;
    }

    public async hasCommitment(commitmentHash: ReprScalar, leafStartPointer: number): Promise<boolean> {
        const startPointer: LocalIndex = IndexConverter.leafIndexToLocalIndex(leafStartPointer);
        let commitmentIndex: LocalIndex;
        try {
            commitmentIndex = (await this.getCommitmentIndices([{ fst: commitmentHash, snd: startPointer }]))[0];
        }
        catch (e: unknown) {
            if (e instanceof Error) {
                return false;
            }
            throw e;
        }

        return commitmentIndex.index !== -1;
    }

    // Fetches the global index for multiple commitments with different startIndices at once:
    // First, it fetches the account index in which chunk their startindex is. The reason we do this in one place instead of async is that often times
    // commitments have their startindex in the same chunk and this avoids fetching the same chunk multiple times
    private async getCommitmentIndices(commitments: Pair<ReprScalar, LocalIndex>[]): Promise<LocalIndex[]> {
        const commsMont: Pair<MontScalar, LocalIndex>[] = commitments.map((c) => ({ fst: Poseidon.getPoseidon().reprToMont(c.fst), snd: c.snd }));
        const globalIndices = (await this.storageReader.findCommitmentIndicesFromStartIndex(commsMont)).indices;

        return commsMont.map((c) => {
            const gIndex = globalIndices.get(c.fst);
            if (gIndex === undefined) throw new Error(COULD_NOT_FIND_COMMITMENT);
            return IndexConverter.globalIndexToLocalIndex(gIndex);
        });
    }

    private async getOpenings(leafIndices: readonly LocalIndex[]): Promise<{ openings: bigint[][], root: bigint }> {
        // Get indices of commitments we need to fetch (height - 1 because we're 0 indexed)
        const openingIndices: readonly (readonly LocalIndex[])[] = leafIndices.map((li) => this.getOpeningIndices(li));
        const allIndices: readonly LocalIndex[] = openingIndices.reduce((pO, o) => pO.concat(o), []);
        // We add the _ in between to avoid having e.g. 91,9 and 9,19 being mapped to the same values
        const indicesSet = new GeneralSet((l: LocalIndex) => `${l.index.toString()}_${l.level.toString()}`);
        indicesSet.addArr(allIndices);
        const uniqueIndices = indicesSet.toArray();
        // First value is in layer openingIndices.length, last value is in layer 1
        const res = await this.storageReader.getCommitmentsAtLocalIndices(uniqueIndices);
        const openingBytes = res.commitments;
        const openings: bigint[][] = [];

        openingIndices.forEach((opening, cIndex) => {
            openings[cIndex] = opening.map((oIndex) => {
                const val = openingBytes.get(localIndexToString(oIndex));
                if (val === undefined) throw new Error(COULD_NOT_FIND_COMMITMENT);
                return TreeManager.parseTreeBytesToBigInt(val, oIndex.level);
            });
        });

        const root = TreeManager.parseTreeBytesToBigInt(await res.root, 0);

        return { openings, root };
    }

    private getOpeningIndices(index: LocalIndex): LocalIndex[] {
        return this.getOpeningIndicesInner(index.index, index.level);
    }

    private getOpeningIndicesInner(index: number, layer: number): LocalIndex[] {
        if (layer <= 0) {
            return [];
        }
        // We are a node on the left --> The opening partner is after us
        const partnerIndex = index % 2 === 0 ? index + 1 : index - 1;

        // Save the partnerIndex and call for hash of self and partner in the layer above
        return [{ index: partnerIndex, level: layer }].concat(
            this.getOpeningIndicesInner(Math.floor(index / 2), layer - 1),
        );
    }

    // IMPORTANT: Bytes stored in the on-chain data are in the Montgomery Form,
    // but we need them in Weierstrass form to generate proofs with. Therefore we first convert to Weierstrass
    // and then parse.
    // Also, non-initialized values are stored as just 0s, but the default value at the lowest level
    // is the empty hash, so replace those as well
    private static parseTreeBytesToBigInt(bytesMontgomery: MontScalar, level: number): bigint {
        // Default value
        if (equalsUint8Arr(bytesMontgomery as Uint8Array, zeros(32))) {
            return Poseidon.getPoseidon().hashBytesToBigIntLE(TreeManager.getDefault(level));
        }

        const bytesWeierstrass = Poseidon.getPoseidon().montToRepr(bytesMontgomery);
        return Poseidon.getPoseidon().hashBytesToBigIntLE(bytesWeierstrass);
    }

    private static getDefault(level: number): ReprScalar {
        // In Montgomery form
        const defaultValues: MontScalar[] = [
            Uint8Array.from([215, 208, 169, 37, 21, 214, 245, 126, 221, 48, 194, 233, 207, 177, 29, 18, 85, 167, 242, 130, 212, 71, 7, 78, 114, 10, 173, 101, 60, 84, 109, 9]),
            Uint8Array.from([68, 89, 173, 222, 230, 170, 252, 78, 231, 34, 126, 164, 43, 187, 137, 244, 131, 254, 238, 133, 35, 169, 175, 160, 145, 110, 94, 131, 102, 137, 115, 40]),
            Uint8Array.from([51, 251, 186, 127, 55, 143, 98, 20, 22, 65, 243, 34, 243, 240, 93, 64, 22, 16, 89, 136, 58, 238, 219, 189, 137, 240, 147, 136, 227, 199, 8, 18]),
            Uint8Array.from([236, 110, 13, 154, 171, 245, 53, 65, 211, 210, 85, 234, 88, 34, 220, 212, 62, 173, 99, 42, 162, 174, 187, 11, 168, 240, 202, 51, 148, 184, 142, 34]),
            Uint8Array.from([24, 105, 228, 247, 251, 67, 134, 40, 68, 98, 71, 80, 37, 131, 62, 181, 223, 238, 211, 88, 230, 89, 159, 179, 65, 229, 221, 202, 160, 119, 2, 31]),
            Uint8Array.from([23, 63, 108, 217, 4, 51, 59, 214, 94, 255, 90, 176, 19, 205, 240, 52, 98, 138, 26, 96, 194, 30, 124, 185, 113, 59, 71, 135, 22, 189, 223, 21]),
            Uint8Array.from([121, 74, 240, 81, 202, 98, 247, 184, 68, 43, 52, 182, 165, 2, 113, 154, 163, 26, 73, 186, 58, 190, 218, 129, 134, 0, 143, 187, 72, 241, 51, 29]),
            Uint8Array.from([204, 81, 128, 228, 236, 75, 32, 52, 141, 233, 50, 175, 99, 20, 90, 132, 38, 45, 25, 223, 247, 10, 112, 33, 0, 79, 144, 138, 59, 187, 10, 20]),
            Uint8Array.from([237, 115, 97, 145, 232, 65, 190, 215, 163, 149, 19, 111, 159, 166, 20, 97, 61, 235, 236, 85, 0, 247, 173, 110, 244, 211, 71, 235, 223, 210, 220, 3]),
            Uint8Array.from([177, 89, 55, 44, 13, 53, 50, 76, 143, 95, 226, 63, 243, 253, 248, 153, 1, 33, 141, 61, 84, 78, 175, 170, 17, 92, 8, 242, 221, 246, 226, 5]),
            Uint8Array.from([228, 244, 77, 241, 92, 212, 9, 105, 212, 241, 190, 161, 17, 14, 166, 107, 164, 226, 117, 236, 56, 57, 174, 36, 61, 114, 205, 34, 240, 31, 13, 33]),
            Uint8Array.from([190, 171, 114, 180, 49, 21, 132, 161, 141, 16, 77, 191, 105, 239, 105, 105, 8, 64, 253, 159, 196, 2, 99, 181, 129, 34, 5, 36, 120, 240, 129, 23]),
            Uint8Array.from([54, 63, 5, 212, 210, 204, 167, 180, 13, 135, 84, 97, 129, 172, 209, 79, 29, 33, 249, 83, 92, 61, 19, 196, 93, 251, 179, 42, 250, 163, 197, 22]),
            Uint8Array.from([77, 199, 105, 95, 222, 183, 99, 229, 133, 193, 250, 29, 35, 92, 66, 209, 150, 145, 122, 205, 136, 103, 205, 207, 32, 181, 252, 167, 89, 74, 52, 18]),
            Uint8Array.from([77, 214, 11, 70, 225, 121, 188, 80, 144, 34, 40, 76, 75, 163, 124, 153, 146, 178, 225, 180, 243, 38, 20, 128, 220, 24, 194, 179, 70, 169, 160, 28]),
            Uint8Array.from([198, 123, 74, 104, 202, 32, 61, 240, 51, 94, 111, 182, 36, 122, 130, 150, 62, 80, 89, 255, 161, 142, 26, 242, 207, 185, 133, 129, 254, 165, 170, 0]),
            Uint8Array.from([37, 132, 186, 12, 74, 180, 105, 226, 213, 211, 193, 225, 27, 50, 138, 4, 63, 92, 234, 13, 17, 8, 83, 158, 236, 140, 4, 107, 19, 189, 227, 31]),
            Uint8Array.from([110, 88, 234, 59, 103, 185, 212, 46, 227, 64, 178, 47, 204, 121, 184, 122, 140, 228, 122, 122, 109, 4, 4, 203, 29, 99, 252, 22, 192, 185, 82, 32]),
            Uint8Array.from([245, 111, 221, 89, 163, 253, 120, 251, 192, 102, 179, 28, 32, 160, 220, 2, 210, 250, 182, 48, 149, 102, 78, 135, 242, 178, 240, 129, 158, 28, 194, 45]),
            Uint8Array.from([80, 180, 254, 174, 183, 151, 82, 229, 123, 24, 44, 98, 7, 166, 152, 78, 191, 94, 109, 201, 215, 229, 108, 66, 136, 150, 102, 80, 152, 67, 183, 24]),
            Uint8Array.from([130, 154, 1, 250, 228, 248, 226, 43, 27, 76, 165, 173, 91, 84, 165, 131, 78, 224, 152, 167, 123, 115, 91, 213, 116, 49, 167, 101, 109, 41, 161, 8]),
        ] as MontScalar[];
        return Poseidon.getPoseidon().montToRepr(defaultValues[level]);
    }
}
