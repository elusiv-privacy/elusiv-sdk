import { expect } from 'chai';
import { FeeAccountReader } from '../../../src/sdk/accountReaders/FeeAccountReader.js';
import { GovernorAccountReader } from '../../../src/sdk/accountReaders/GovernorAccReader.js';
import { Pair } from '../../../src/sdk/utils/Pair.js';
import { FeeAccountReaderDriver } from '../../helpers/drivers/FeeAccountReaderDriver.js';
import { GovernorAccountReaderDriver } from '../../helpers/drivers/GovernorAccountReaderDriver.js';
import { FeeManager } from '../../../src/sdk/paramManagers/fee/FeeManager.js';
import { FeeAccBorsh } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/FeeAccBorsh.js';
import { ProgramFeeBorsh } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/ProgramFeeBorsh.js';
import { PDAAccountDataBorsh } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/PDAAccountDataBorsh.js';
import { GovernorAccBorsh } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/GovernorAccBorsh.js';

describe('Feemanager tests', () => {
    const feeVersions : Pair<number, FeeAccBorsh>[] = [
        {
            fst: 0,
            snd: new FeeAccBorsh(
                new PDAAccountDataBorsh(1, 2),
                new ProgramFeeBorsh(
                    BigInt(1),
                    BigInt(2),
                    BigInt(3),
                    BigInt(4),
                    BigInt(5),
                    BigInt(6),
                    BigInt(7),
                    BigInt(8),
                ),
            ),
        },
        {
            fst: 1,
            snd: new FeeAccBorsh(
                new PDAAccountDataBorsh(10, 20),
                new ProgramFeeBorsh(
                    BigInt(10),
                    BigInt(20),
                    BigInt(30),
                    BigInt(40),
                    BigInt(50),
                    BigInt(60),
                    BigInt(70),
                    BigInt(80),
                ),
            ),
        },
        {
            fst: 2,
            snd: new FeeAccBorsh(
                new PDAAccountDataBorsh(100, 200),
                new ProgramFeeBorsh(
                    BigInt(100),
                    BigInt(200),
                    BigInt(300),
                    BigInt(400),
                    BigInt(500),
                    BigInt(600),
                    BigInt(700),
                    BigInt(800),
                ),
            ),
        },
    ];

    const batchingRate = 100;
    const programVersion = 1;

    const feeReader : FeeAccountReader = new FeeAccountReaderDriver(feeVersions) as unknown as FeeAccountReader;
    const govReader : GovernorAccountReader = new GovernorAccountReaderDriver(feeAccToGovAcc(feeVersions[2].snd, feeVersions[2].fst, batchingRate, programVersion)) as unknown as GovernorAccountReader;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feeManager = new (FeeManager as any)(feeReader, govReader) as FeeManager;

    it('Should return correct fee version', async () => {
        const feeVersion = await feeManager.getCurrentFeeVersion();
        expect(feeVersion).to.equal(feeVersions[2].fst);
    });

    it('Should return latest fee account', async () => {
        const feeVersionData = await feeManager.getFeeVersionData();
        expect(feeVersionData.feeVersion).to.equal(feeVersions[2].fst);
        expect(feeVersionData.minBatchingRate).to.equal(batchingRate);
    });

    it('Should fetch correct latest feeCalculator', async () => {
        const { calculator, feeVersionData } = await feeManager.getFeeCalculator();

        expect(feeVersionData.feeVersion).to.equal(feeVersions[2].fst);
        expect(feeVersionData.minBatchingRate).to.equal(batchingRate);
        expect(calculator['feeData']).to.deep.equal(feeVersions[2].snd);
        expect(calculator['minBatchingRate']).to.deep.equal(batchingRate);
    });

    it('Should fetch correct feeCalculator with specified version', async () => {
        const { calculator, feeVersionData } = await feeManager.getFeeCalculator(1);

        expect(feeVersionData.feeVersion).to.equal(feeVersions[1].fst);
        expect(feeVersionData.minBatchingRate).to.equal(batchingRate);
        expect(calculator['feeData']).to.deep.equal(feeVersions[1].snd);
        expect(calculator['minBatchingRate']).to.deep.equal(batchingRate);
    });
});

function feeAccToGovAcc(feeData : FeeAccBorsh, feeVersion : number, batchingRate : number, programVersion : number) : GovernorAccBorsh {
    return new GovernorAccBorsh(
        feeData['pda_data'],
        feeVersion,
        feeData.program_fee,
        batchingRate,
        programVersion,
    );
}
