import { Cluster, Connection } from '@solana/web3.js';
import { FEE_ACC_SEED } from '../../constants.js';
import { getElusivProgramId } from '../../public/WardenInfo.js';
import { FeeAccBorsh } from '../transactions/txBuilding/serializedTypes/borshTypes/accounts/FeeAccBorsh.js';
import { GovernorAccBorsh } from '../transactions/txBuilding/serializedTypes/borshTypes/accounts/GovernorAccBorsh.js';
import { AccountReader } from './AccountReader.js';
import { GovernorAccountReader } from './GovernorAccReader.js';

export class FeeAccountReader extends AccountReader {
    private govReader : GovernorAccountReader;

    private cachedFee : FeeAccBorsh[] = [];

    private cluster : Cluster;

    public constructor(connection : Connection, cluster : Cluster) {
        super(connection);
        this.cluster = cluster;
        this.govReader = new GovernorAccountReader(connection, cluster);
    }

    public async getCurrentFeeVersion() : Promise<number> {
        const gov = await this.govReader.getData();
        const version = gov.fee_version;
        this.cachedFee[version] = FeeAccountReader.govDataToFeeData(gov);
        return version;
    }

    public async getData() : Promise<FeeAccBorsh> {
        return FeeAccountReader.govDataToFeeData(await this.govReader.getData());
    }

    public async getDataFromVersion(version : number) : Promise<FeeAccBorsh> {
        if (this.cachedFee[version] === undefined) {
            const currFeeKey = AccountReader.generateElusivPDAFrom([FEE_ACC_SEED], getElusivProgramId(this.cluster), version);
            this.cachedFee[version] = await super.getProgramInfo(FeeAccBorsh, currFeeKey[0]);
        }
        return this.cachedFee[version];
    }

    public static govDataToFeeData(govData : GovernorAccBorsh) : FeeAccBorsh {
        return new FeeAccBorsh(govData.pda_data, govData.program_fee);
    }
}
