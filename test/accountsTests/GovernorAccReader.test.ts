import { serialize } from '@dao-xyz/borsh';
import { Connection } from '@solana/web3.js';
import { expect } from 'chai';
import { AccountReader } from '../../src/sdk/accountReaders/AccountReader.js';
import { GovernorAccountReader } from '../../src/sdk/accountReaders/GovernorAccReader.js';
import { GOVERNOR_ACC_SEED } from '../../src/constants.js';
import { getElusivProgramId } from '../../src/public/WardenInfo.js';
import { GovernorAccBorsh } from '../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/GovernorAccBorsh.js';
import { PDAAccountDataBorsh } from '../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/PDAAccountDataBorsh.js';
import { ProgramFeeBorsh } from '../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/ProgramFeeBorsh.js';
import { AccDataConnectionDriver } from '../helpers/drivers/AccDataConnectionDriver.js';

describe('GovernorAccReader  tests', () => {
    let reader : GovernorAccountReader;
    let govData : GovernorAccBorsh;
    const elusivAcc = getElusivProgramId('devnet');

    const govKey = AccountReader.generateElusivPDAFrom([GOVERNOR_ACC_SEED], elusivAcc);

    /* Data in the GovernorAcc */
    const pdaData = new PDAAccountDataBorsh(0, 0);
    const feeVersion = 56384;
    const lamportsPerTx = BigInt(123);
    const baseCommitmentNetworkFee = BigInt(434);
    const proofNetworkFee = BigInt(34234);
    const baseCommitmentSubvention = BigInt(45555);
    const proofSubvention = BigInt(8778);
    const relayerHashTxFee = BigInt(3486);
    const relayerProofReward = BigInt(54542);
    const proofBaseTxCount = BigInt(32342);
    const commitmentBatchingRate = 8;
    const programVersion = 10;

    before(async () => {
        const programFee = new ProgramFeeBorsh(
            lamportsPerTx,
            baseCommitmentNetworkFee,
            proofNetworkFee,
            baseCommitmentSubvention,
            proofSubvention,
            relayerHashTxFee,
            relayerProofReward,
            proofBaseTxCount,
        );

        const toSerialize = new GovernorAccBorsh(
            pdaData,
            feeVersion,
            programFee,
            commitmentBatchingRate,
            programVersion,
        );

        const serialized = serialize(toSerialize);

        const conn = new AccDataConnectionDriver();
        conn.addAccountData(govKey[0], Buffer.from(serialized));

        reader = new GovernorAccountReader(conn as unknown as Connection, 'devnet');
        govData = await reader.getData();
    });

    it('Correctly parses the fee version', () => {
        expect(govData.fee_version).to.equal(feeVersion);
    });

    it('Correctly parses the lamports per tx', () => {
        expect(govData.program_fee.lamports_per_tx).to.equal(lamportsPerTx);
    });

    it('Correctly parses the base commitment network fee', () => {
        expect(govData.program_fee.base_commitment_network_fee).to.equal(baseCommitmentNetworkFee);
    });

    it('Correctly parses the proof network fee', () => {
        expect(govData.program_fee.proof_network_fee).to.equal(proofNetworkFee);
    });

    it('Correctly parses the base commitment subvention', () => {
        expect(govData.program_fee.base_commitment_subvention).to.equal(baseCommitmentSubvention);
    });

    it('Correctly parses the proof subvention', () => {
        expect(govData.program_fee.proof_subvention).to.equal(proofSubvention);
    });

    it('Correctly parses the relayer hash tx fee', () => {
        expect(govData.program_fee.warden_hash_tx_reward).to.equal(relayerHashTxFee);
    });

    it('Correctly parses the relayer proof reward', () => {
        expect(govData.program_fee.warden_proof_reward).to.equal(relayerProofReward);
    });

    it('Correctly parses the proof base tx count', () => {
        expect(govData.program_fee.proof_base_tx_count).to.equal(proofBaseTxCount);
    });

    it('Correctly parses the commitment batching rate', () => {
        expect(govData.commitment_batching_rate).to.equal(commitmentBatchingRate);
    });

    it('Correctly parses the program version', () => {
        expect(govData.program_version).to.equal(programVersion);
    });
});
