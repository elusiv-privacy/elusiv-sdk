import { Cluster, Connection } from '@solana/web3.js';
import { FeeAccountReader } from '../../accountReaders/FeeAccountReader.js';
import { GovernorAccountReader } from '../../accountReaders/GovernorAccReader.js';
import { FeeAccBorsh } from '../../transactions/txBuilding/serializedTypes/borshTypes/accounts/FeeAccBorsh.js';
import { GovernorAccBorsh } from '../../transactions/txBuilding/serializedTypes/borshTypes/accounts/GovernorAccBorsh.js';
import { FeeCalculator } from './FeeCalculator.js';

export type FeeVersionData = {
    feeVersion: number,
    minBatchingRate: number,
}

export class FeeManager {
    private feeReader: FeeAccountReader;

    private govReader: GovernorAccountReader;

    private constructor(feeReader: FeeAccountReader, govReader: GovernorAccountReader) {
        this.feeReader = feeReader;
        this.govReader = govReader;
    }

    public static createFeeManager(connection: Connection, cluster: Cluster): FeeManager {
        const feeReader = new FeeAccountReader(connection, cluster);
        const govReader = new GovernorAccountReader(connection, cluster);
        return new FeeManager(feeReader, govReader);
    }

    public getFeeVersionData(): Promise<FeeVersionData> {
        return this.govReader.getData().then((govData) => FeeManager.getFeeVersionDataFromGovData(govData));
    }

    public async getFeeCalculator(feeVersion?: number): Promise<{ calculator: FeeCalculator, feeVersionData: FeeVersionData }> {
        const govDataProm: Promise<GovernorAccBorsh> = this.govReader.getData();
        let feeData: FeeAccBorsh;
        let feeVersionInner: number;

        // If we specify a fee version, fetch fee data from chain. Else, just fetch the latest fee data directly from the governor acc (which we have to fetch either way)
        if (feeVersion === undefined) {
            feeData = FeeAccountReader.govDataToFeeData(await govDataProm);
            feeVersionInner = (await govDataProm).fee_version;
        }
        else {
            feeData = await this.feeReader.getDataFromVersion(feeVersion);
            feeVersionInner = feeVersion;
        }

        return {
            calculator: new FeeCalculator(
                feeData,
                (await govDataProm).commitment_batching_rate,
            ),
            feeVersionData: { feeVersion: feeVersionInner, minBatchingRate: (await govDataProm).commitment_batching_rate },
        };
    }

    public async getCurrentFeeVersion(): Promise<number> {
        return this.feeReader.getCurrentFeeVersion();
    }

    private static getFeeVersionDataFromGovData(gov: GovernorAccBorsh): FeeVersionData {
        return { feeVersion: gov.fee_version, minBatchingRate: gov.commitment_batching_rate };
    }
}
