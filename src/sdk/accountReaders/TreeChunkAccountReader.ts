import { Connection, PublicKey } from '@solana/web3.js';
import { INVALID_ACCESS } from '../../constants.js';
import { TreeChunkAccBorsh } from '../transactions/txBuilding/serializedTypes/borshTypes/accounts/TreeChunkAccBorsh.js';
import { AccountReader } from './AccountReader.js';

export class TreeChunkAccountReader extends AccountReader {
    private cachedChunks : Map<PublicKey, Promise<TreeChunkAccBorsh>>;

    public constructor(connection : Connection) {
        super(connection);
        this.cachedChunks = new Map();
    }

    private async getData(chunkAccount : PublicKey) : Promise<TreeChunkAccBorsh> {
        return super.getProgramInfo(TreeChunkAccBorsh, chunkAccount);
    }

    public async getTreeChunk(chunkAccount : PublicKey) : Promise<TreeChunkAccBorsh> {
        // TODO: Mutex needed? (This is called from multiple threads)
        if (!this.cachedChunks.has(chunkAccount)) {
            this.cachedChunks.set(chunkAccount, this.getData(chunkAccount));
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const chunk = await this.cachedChunks.get(chunkAccount)!;
        if (chunk.is_in_use !== 1) throw new Error(INVALID_ACCESS('TreeChunkAcc'));
        return chunk;
    }
}
