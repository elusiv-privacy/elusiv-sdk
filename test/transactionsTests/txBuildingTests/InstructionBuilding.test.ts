/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    ComputeBudgetProgram, Keypair, PublicKey, SystemProgram,
} from '@solana/web3.js';
import { expect } from 'chai';
import { IncompleteCommitment, Poseidon } from 'elusiv-cryptojs';
import { InstructionBuilding, COMPUTE_UNIT_LIMIT, COMPUTE_UNIT_PRICE } from '../../../src/sdk/transactions/txBuilding/InstructionBuilding.js';
import { FeeVersionData } from '../../../src/sdk/paramManagers/fee/FeeManager.js';
import { StoreInstruction } from '../../../src/sdk/transactions/instructions/StoreInstruction.js';
import { ComputeHashInstruction } from '../../../src/sdk/transactions/instructions/ComputeHashInstruction.js';
import { StoreTx } from '../../../src/sdk/transactions/StoreTx.js';
import { SeedWrapper } from '../../../src/sdk/clientCrypto/SeedWrapper.js';
import { bytesToBs58 } from '../../../src/sdk/utils/base58Utils.js';
import { TokenType } from '../../../src/public/tokenTypes/TokenType.js';

describe('Instruction Building Tests', () => {
    let seedWrapper: SeedWrapper;
    before(async function () {
        this.timeout(5000);
        await Poseidon.setupPoseidon();
        seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5]));
    });

    it('Correctly builds the variable topup instructions', async () => {
        const amount = BigInt('12345');
        const tokenType: TokenType = 'LAMPORTS';
        const sender = new PublicKey('42tgKNsBuuXwxPhYNixCp4jRkkh8rvwfLUiAdZArWWR3');
        const feeVersionData: FeeVersionData = {
            feeVersion: 8,
            minBatchingRate: 9,
        };
        const nonce = 1;
        const merkleStartIndex = 3;
        const parsedPrivateBalance = BigInt('4');
        const hashAccIndex = 5;
        const isRecipient = false;
        const warden = new PublicKey(new Uint8Array(32).fill(7));

        const commitment: IncompleteCommitment = InstructionBuilding.buildTopupCommitment(
            nonce,
            amount,
            tokenType,
            merkleStartIndex,
            seedWrapper,
        );

        const storeTx: StoreTx = {
            txType: 'TOPUP',
            tokenType,
            nonce,
            commitment,
            commitmentHash: commitment.getCommitmentHash(),
            amount: commitment.getBalance(),
            sender: Keypair.fromSeed(new Uint8Array(32).fill(1)).publicKey,
            parsedPrivateBalance,
            merkleStartIndex,
            isRecipient,
            hashAccIndex,
            identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            warden,
            fee: BigInt(12000),
        };

        const instructions = await InstructionBuilding.buildVariableTopupIxs(
            seedWrapper.getRootViewingKeyWrapper(),
            storeTx,
            'devnet',
            sender,
            warden,
            feeVersionData,
        );

        expect(instructions.length).to.equal(2);

        const storeInstruction = await StoreInstruction.parseInstruction(seedWrapper.getRootViewingKeyWrapper(), {
            programId: SystemProgram.programId,
            accounts: [],
            data: bytesToBs58(instructions[0].data),
        });

        const computeHashInstruction = await ComputeHashInstruction.parseInstruction(
            {
                programId: SystemProgram.programId,
                accounts: [],
                data: bytesToBs58(instructions[1].data),
            },
            seedWrapper.getRootViewingKeyWrapper(),
            nonce,
        );

        expect(storeInstruction).to.not.be.null;
        expect(storeInstruction!.metadata.tokenType).to.equal(tokenType);
        expect(storeInstruction!.hashAccIndex).to.equal(hashAccIndex);
        expect(storeInstruction!.metadata.balance).to.equal(amount);
        expect(storeInstruction!.coreCommitmentHash).to.deep.equal(commitment.getCommitmentHashCore());
        expect(storeInstruction!.commitmentHash).to.deep.equal(commitment.getCommitmentHash());
        expect(storeInstruction!.metadata.assocCommIndex).to.equal(merkleStartIndex);
        expect(storeInstruction!.feeVersion).to.equal(feeVersionData.feeVersion);
        expect(storeInstruction!.minBatchingRate).to.equal(feeVersionData.minBatchingRate);

        expect(computeHashInstruction).to.not.be.null;
        expect(computeHashInstruction!.hashAccIndex).to.equal(hashAccIndex);
        expect(computeHashInstruction!.currPrivateBalance).to.equal(parsedPrivateBalance);
        expect(computeHashInstruction!.isRecipient).to.equal(isRecipient);
        expect(computeHashInstruction!.nonce).to.equal(nonce);
    });

    it('Correctly builds the constant topup instructions', () => {
        const constantIxs = InstructionBuilding.buildConstantTopupIxs();
        const fstIx = ComputeBudgetProgram.setComputeUnitLimit({
            units: COMPUTE_UNIT_LIMIT,
        });

        const sndIx = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: COMPUTE_UNIT_PRICE,
        });

        expect(constantIxs.length).to.equal(2);

        expect(constantIxs[0].data).to.deep.equal(fstIx.data);
        expect(constantIxs[1].data).to.deep.equal(sndIx.data);
    });
});
