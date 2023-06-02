/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import { padLE } from 'elusiv-serialization';
import { EncryptedValue } from '../../../src/sdk/clientCrypto/encryption.js';
import { SeedWrapper } from '../../../src/sdk/clientCrypto/SeedWrapper.js';
import { FinalizeVerificationInstruction } from '../../../src/sdk/transactions/instructions/FinalizeVerificationInstruction.js';
import { bytesToBs58 } from '../../../src/sdk/utils/base58Utils.js';

describe('Finalize Verification Instruction tests', () => {
    const nonce = 10;

    const amount = BigInt(1);
    const tokenId = 'LAMPORTS';
    const mtIndex = 2;
    const commIndex = 3;
    const owner = new PublicKey(new Uint8Array(0).fill(9));
    let encryptedOwner: EncryptedValue;
    const verificationAccountIndex = 6;

    let serializedInstruction: Uint8Array;
    let seedWrapper: SeedWrapper;

    before(async () => {
        seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5]));
        encryptedOwner = await seedWrapper.getRootViewingKeyWrapper().encryptSeededSaltedAES256(owner.toBytes(), nonce);
    });

    beforeEach(() => {
        const instruction = new FinalizeVerificationInstruction(
            amount,
            tokenId,
            mtIndex,
            encryptedOwner,
            verificationAccountIndex,
            owner,
        );
        serializedInstruction = instruction.compile(false, commIndex);
    });

    it('Correctly parses the instruction with seed and salt', async () => {
        const parsed = await FinalizeVerificationInstruction.parseInstructionFromSeedSalt(
            {
                programId: SystemProgram.programId,
                accounts: [],
                data: bytesToBs58(serializedInstruction),
            },
            seedWrapper.getRootViewingKeyWrapper(),
            nonce,
        );

        expect(parsed).to.not.be.null;
        expect(parsed!.amount).to.deep.equal(amount);
        expect(parsed!.tokenId).to.deep.equal(tokenId);
        expect(parsed!.mtIndex).to.deep.equal(mtIndex);
        expect(parsed!.encryptedOwner).to.deep.equal(encryptedOwner);
        expect(parsed!.verificationAccountIndex).to.deep.equal(verificationAccountIndex);
        expect(parsed!.owner.equals(owner)).to.be.true;
    });

    it('Correctly parses the instruction with viewing key', async () => {
        const key = seedWrapper.getRootViewingKeyWrapper()
            .generateDecryptionKey(nonce);

        const parsed = await FinalizeVerificationInstruction.parseInstructionFromViewingKey({
            programId: SystemProgram.programId,
            accounts: [],
            data: bytesToBs58(serializedInstruction),
        }, key);

        expect(parsed).to.not.be.null;
        expect(parsed!.amount).to.deep.equal(amount);
        expect(parsed!.tokenId).to.deep.equal(tokenId);
        expect(parsed!.mtIndex).to.deep.equal(mtIndex);
        expect(parsed!.encryptedOwner).to.deep.equal(encryptedOwner);
        expect(parsed!.verificationAccountIndex).to.deep.equal(verificationAccountIndex);
        expect(parsed!.owner.equals(owner)).to.be.true;
    });

    it('Returns null if the instruction has the wrong length', async () => {
        let parsed = await FinalizeVerificationInstruction.parseInstructionFromSeedSalt(
            {
                programId: SystemProgram.programId,
                accounts: [],
                data: bytesToBs58(serializedInstruction.slice(0, serializedInstruction.length - 1)),
            },
            seedWrapper.getRootViewingKeyWrapper(),
            nonce,
        );

        expect(parsed).to.be.null;

        parsed = await FinalizeVerificationInstruction.parseInstructionFromSeedSalt(
            {
                programId: SystemProgram.programId,
                accounts: [],
                data: bytesToBs58(padLE(serializedInstruction, serializedInstruction.length + 1)),
            },
            seedWrapper.getRootViewingKeyWrapper(),
            nonce,
        );

        expect(parsed).to.be.null;
    });

    it('Returns null if the iv padding is not zero', async () => {
        const ivPaddingStartIndex = 44;
        serializedInstruction[ivPaddingStartIndex] = 1;

        const parsed = await FinalizeVerificationInstruction.parseInstructionFromSeedSalt(
            {
                programId: SystemProgram.programId,
                accounts: [],
                data: bytesToBs58(serializedInstruction),
            },
            seedWrapper.getRootViewingKeyWrapper(),
            nonce,
        );

        expect(parsed).to.be.null;
    });
});
