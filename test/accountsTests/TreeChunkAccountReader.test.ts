import { Connection, PublicKey } from '@solana/web3.js';
import { zeros } from '@elusiv/serialization';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { serialize } from '@dao-xyz/borsh';
import { TreeChunkAccountReader } from '../../src/sdk/accountReaders/TreeChunkAccountReader.js';
import { INVALID_ACCESS, STORAGE_MT_VALUES_PER_ACCOUNT } from '../../src/constants.js';
import { AccDataConnectionDriver } from '../helpers/drivers/AccDataConnectionDriver.js';
import { TreeChunkAccBorsh } from '../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/TreeChunkAccBorsh.js';

// Need to import like this to get chai-as-promised to work

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Tree Chunk Acc parsing tests', () => {
    let reader: TreeChunkAccountReader;
    let key: PublicKey;
    let commitmentData: Uint8Array;

    before(() => {
        const commitmentDataArray: number[] = [];
        for (let i = 0; i < 32 * STORAGE_MT_VALUES_PER_ACCOUNT; i++) {
            commitmentDataArray[i] = i;
        }

        commitmentData = Uint8Array.from(commitmentDataArray);
        key = new PublicKey(zeros(32));
    });

    it('Correctly fetches and parses in use TreeChunk', async () => {
        const isInUse = 1;
        const toSerialize = new TreeChunkAccBorsh(
            isInUse,
            commitmentData,
        );

        const serialized = serialize(toSerialize);

        const conn = new AccDataConnectionDriver();
        conn.addAccountData(key, Buffer.from(serialized));

        reader = new TreeChunkAccountReader(conn as unknown as Connection);

        const chunkData = await reader.getTreeChunk(key);
        expect(chunkData.commitment_data).to.deep.equal(commitmentData);
    });

    it('Throws for not in use TreeChunk', async () => {
        const isInUse = 0;
        const toSerialize = new TreeChunkAccBorsh(
            isInUse,
            commitmentData,
        );

        const serialized = serialize(toSerialize);

        const conn = new AccDataConnectionDriver();
        conn.addAccountData(key, Buffer.from(serialized));

        reader = new TreeChunkAccountReader(conn as unknown as Connection);

        await expect(reader.getTreeChunk(key)).to.be.rejectedWith(INVALID_ACCESS('TreeChunkAcc'));
    });
});
