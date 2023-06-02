import { Cluster, Connection } from '@solana/web3.js';
import { GOVERNOR_ACC_SEED } from '../../constants.js';
import { GovernorAccBorsh } from '../transactions/txBuilding/serializedTypes/borshTypes/accounts/GovernorAccBorsh.js';
import { AccountReader } from './AccountReader.js';

export class GovernorAccountReader extends AccountReader {
    private cluster : Cluster;

    public constructor(connection : Connection, cluster : Cluster) {
        super(connection);
        this.cluster = cluster;
    }

    public async getData() : Promise<GovernorAccBorsh> {
        return super.getProgramInfoFromSeeds(GovernorAccBorsh, this.cluster, [GOVERNOR_ACC_SEED]);
    }
}
