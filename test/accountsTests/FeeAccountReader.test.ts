import { Connection, PublicKey } from '@solana/web3.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { serialize } from '@dao-xyz/borsh';
import { AccountReader } from '../../src/sdk/accountReaders/AccountReader.js';
import { FeeAccountReader } from '../../src/sdk/accountReaders/FeeAccountReader.js';
import { randomUint32 } from '../../src/sdk/utils/utils.js';
import {
    COULD_NOT_FIND_ACCOUNT,
    FEE_ACC_SEED, GOVERNOR_ACC_SEED,
} from '../../src/constants.js';
import { AccDataConnectionDriver } from '../helpers/drivers/AccDataConnectionDriver.js';
import { PDAAccountDataBorsh } from '../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/PDAAccountDataBorsh.js';
import { FeeAccBorsh } from '../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/FeeAccBorsh.js';
import { ProgramFeeBorsh } from '../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/ProgramFeeBorsh.js';
import { GovernorAccBorsh } from '../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/GovernorAccBorsh.js';
import { getElusivProgramId } from '../../src/public/WardenInfo.js';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Fee Acc parsing tests', async () => {
    let reader: FeeAccountReader;

    const elusivAcc = getElusivProgramId('devnet');

    // We generate multiple past fee accounts
    const pastFeeAccCount = 3;

    /* Data in the FeeAccs */
    const feeVersions = [0, 1, 2];
    const pdaData: PDAAccountDataBorsh[] = [];
    const lamportsPerTx: bigint[] = [];
    const baseCommitmentNetworkFee: bigint[] = [];
    const proofNetworkFee: bigint[] = [];
    const baseCommitmentSubvention: bigint[] = [];
    const proofSubvention: bigint[] = [];
    const relayerHashTxFee: bigint[] = [];
    const relayerProofReward: bigint[] = [];
    const proofBaseTxCount: bigint[] = [];
    const programVersion = 1;

    before(() => {
        const conn = new AccDataConnectionDriver();
        // We generate multiple past fee accounts
        const feeAccs: FeeAccBorsh[] = [];
        const feeKeys: PublicKey[] = [];

        // Generate the past fee Accounts
        for (let i = 0; i < pastFeeAccCount; i++) {
            feeKeys[i] = AccountReader.generateElusivPDAFrom([FEE_ACC_SEED], elusivAcc, feeVersions[i])[0];
            pdaData[i] = new PDAAccountDataBorsh(0, 0);
            lamportsPerTx[i] = BigInt(randomUint32());
            baseCommitmentNetworkFee[i] = BigInt(randomUint32());
            proofNetworkFee[i] = BigInt(randomUint32());
            baseCommitmentSubvention[i] = BigInt(randomUint32());
            proofSubvention[i] = BigInt(randomUint32());
            relayerHashTxFee[i] = BigInt(randomUint32());
            relayerProofReward[i] = BigInt(randomUint32());
            proofBaseTxCount[i] = BigInt(randomUint32());

            const programFee: ProgramFeeBorsh = new ProgramFeeBorsh(
                lamportsPerTx[i],
                baseCommitmentNetworkFee[i],
                proofNetworkFee[i],
                baseCommitmentSubvention[i],
                proofSubvention[i],
                relayerHashTxFee[i],
                relayerProofReward[i],
                proofBaseTxCount[i],
            );

            feeAccs[i] = new FeeAccBorsh(pdaData[i], programFee);
            const serialized = serialize(feeAccs[i]);
            conn.addAccountData(feeKeys[i], Buffer.from(serialized));
        }

        // Generate the current governor account
        feeKeys[pastFeeAccCount] = AccountReader.generateElusivPDAFrom([FEE_ACC_SEED], elusivAcc, pastFeeAccCount)[0];
        pdaData[pastFeeAccCount] = new PDAAccountDataBorsh(0, 0);
        lamportsPerTx[pastFeeAccCount] = BigInt(randomUint32());
        baseCommitmentNetworkFee[pastFeeAccCount] = BigInt(randomUint32());
        proofNetworkFee[pastFeeAccCount] = BigInt(randomUint32());
        baseCommitmentSubvention[pastFeeAccCount] = BigInt(randomUint32());
        proofSubvention[pastFeeAccCount] = BigInt(randomUint32());
        relayerHashTxFee[pastFeeAccCount] = BigInt(randomUint32());
        relayerProofReward[pastFeeAccCount] = BigInt(randomUint32());
        proofBaseTxCount[pastFeeAccCount] = BigInt(randomUint32());

        // We need a GovernorAcc that gives us the fee version
        const govKey = AccountReader.generateElusivPDAFrom([GOVERNOR_ACC_SEED], elusivAcc);
        const commitmentBatchingRate = 8;
        const programFee: ProgramFeeBorsh = new ProgramFeeBorsh(
            lamportsPerTx[pastFeeAccCount],
            baseCommitmentNetworkFee[pastFeeAccCount],
            proofNetworkFee[pastFeeAccCount],
            baseCommitmentSubvention[pastFeeAccCount],
            proofSubvention[pastFeeAccCount],
            relayerHashTxFee[pastFeeAccCount],
            relayerProofReward[pastFeeAccCount],
            proofBaseTxCount[pastFeeAccCount],
        );

        const govAcc = new GovernorAccBorsh(
            pdaData[pastFeeAccCount],
            pastFeeAccCount,
            programFee,
            commitmentBatchingRate,
            programVersion,
        );

        const serialized = serialize(govAcc);
        conn.addAccountData(govKey[0], Buffer.from(serialized));

        reader = new FeeAccountReader(conn as unknown as Connection, 'devnet');
    });

    it('Correctly fetches current fee version', async () => {
        const currentVersion = await reader.getCurrentFeeVersion();
        expect(currentVersion).to.equal(pastFeeAccCount);
    });

    it('Correctly fetches latest fee data', async () => {
        const feeAcc = await reader.getDataFromVersion(pastFeeAccCount);
        expect(feeAcc.program_fee.lamports_per_tx).to.equal(lamportsPerTx[pastFeeAccCount]);
        expect(feeAcc.program_fee.base_commitment_network_fee).to.equal(baseCommitmentNetworkFee[pastFeeAccCount]);
        expect(feeAcc.program_fee.proof_network_fee).to.equal(proofNetworkFee[pastFeeAccCount]);
        expect(feeAcc.program_fee.base_commitment_subvention).to.equal(baseCommitmentSubvention[pastFeeAccCount]);
        expect(feeAcc.program_fee.proof_subvention).to.equal(proofSubvention[pastFeeAccCount]);
        expect(feeAcc.program_fee.warden_hash_tx_reward).to.equal(relayerHashTxFee[pastFeeAccCount]);
        expect(feeAcc.program_fee.warden_proof_reward).to.equal(relayerProofReward[pastFeeAccCount]);
    });

    feeVersions.forEach((v) => {
        it(`Correctly fetches past fee data for version ${v}`, async () => {
            const feeAcc = await reader.getDataFromVersion(v);
            expect(feeAcc.program_fee.lamports_per_tx).to.equal(lamportsPerTx[v]);
            expect(feeAcc.program_fee.base_commitment_network_fee).to.equal(baseCommitmentNetworkFee[v]);
            expect(feeAcc.program_fee.proof_network_fee).to.equal(proofNetworkFee[v]);
            expect(feeAcc.program_fee.base_commitment_subvention).to.equal(baseCommitmentSubvention[v]);
            expect(feeAcc.program_fee.proof_subvention).to.equal(proofSubvention[v]);
            expect(feeAcc.program_fee.warden_hash_tx_reward).to.equal(relayerHashTxFee[v]);
            expect(feeAcc.program_fee.warden_proof_reward).to.equal(relayerProofReward[v]);
        });
    });

    feeVersions.forEach((v) => {
        it(`Correctly fetches past fee data again for version ${v} from cache`, async () => {
            const feeAcc = await reader.getDataFromVersion(v);
            expect(feeAcc.program_fee.lamports_per_tx).to.equal(lamportsPerTx[v]);
            expect(feeAcc.program_fee.base_commitment_network_fee).to.equal(baseCommitmentNetworkFee[v]);
            expect(feeAcc.program_fee.proof_network_fee).to.equal(proofNetworkFee[v]);
            expect(feeAcc.program_fee.base_commitment_subvention).to.equal(baseCommitmentSubvention[v]);
            expect(feeAcc.program_fee.proof_subvention).to.equal(proofSubvention[v]);
            expect(feeAcc.program_fee.warden_hash_tx_reward).to.equal(relayerHashTxFee[v]);
            expect(feeAcc.program_fee.warden_proof_reward).to.equal(relayerProofReward[v]);
        });
    });

    it('Throws for fetching non-existent fee version', async () => {
        const feeKey = await AccountReader.generateElusivPDAFrom([FEE_ACC_SEED], elusivAcc, pastFeeAccCount + 1)[0];
        await expect(reader.getDataFromVersion(pastFeeAccCount + 1)).to.be.rejectedWith(COULD_NOT_FIND_ACCOUNT(feeKey.toBase58()));
    });
});
