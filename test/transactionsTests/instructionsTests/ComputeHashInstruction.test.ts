/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { SystemProgram, TransactionInstruction } from '@solana/web3.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { AccountReader } from '../../../src/sdk/accountReaders/AccountReader.js';
import { SeedWrapper } from '../../../src/sdk/clientCrypto/SeedWrapper.js';
import { BASE_COMMITMENT_HASH_ACC_SEED } from '../../../src/constants.js';
import { getElusivProgramId } from '../../../src/public/WardenInfo.js';
import { ComputeHashInstruction } from '../../../src/sdk/transactions/instructions/ComputeHashInstruction.js';
import { bytesToBs58 } from '../../../src/sdk/utils/base58Utils.js';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('ComputeHash Instruction tests', () => {
    const hashAccIndex = 1;
    const currPrivateBalance = BigInt(6);
    const nonce = 7;
    const programNonce = 8;
    const isRecipient = true;
    let seedWrapper: SeedWrapper;

    before(() => {
        seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5]));
    });

    it('Generates correct ComputeHash Instruction', () => {
        const computeHashInstruction = new ComputeHashInstruction(

            nonce,
            hashAccIndex,
            currPrivateBalance,
            isRecipient,
            programNonce,
        );

        expect(computeHashInstruction.hashAccIndex).to.equal(hashAccIndex);
        expect(computeHashInstruction.currPrivateBalance).to.equal(currPrivateBalance);
        expect(computeHashInstruction.nonce).to.equal(nonce);
        expect(computeHashInstruction.isRecipient).to.equal(isRecipient);
        expect(computeHashInstruction.programNonce).to.equal(programNonce);
        expect(() => computeHashInstruction.compileInstruction(
            seedWrapper.getRootViewingKeyWrapper(),
            'devnet',
        )).to.not.throw();
    });

    describe('Correctly compiles instruction', () => {
        let compiledIx: TransactionInstruction;
        before(async () => {
            const computeHashInstruction = new ComputeHashInstruction(

                nonce,
                hashAccIndex,
                currPrivateBalance,
                isRecipient,
                programNonce,
            );
            compiledIx = await computeHashInstruction.compileInstruction(
                seedWrapper.getRootViewingKeyWrapper(),
                'devnet',
            );
        });

        it('Correctly compiles programId', () => {
            expect(compiledIx.programId).to.deep.equal(getElusivProgramId('devnet'));
        });

        it('Correctly compiles instruction keys', () => {
            expect(compiledIx.keys.length).to.equal(1);
            const expectedHashingAccKey = AccountReader.generateElusivPDAFrom([BASE_COMMITMENT_HASH_ACC_SEED], getElusivProgramId('devnet'), hashAccIndex)[0];
            expect(compiledIx.keys[0].pubkey).to.deep.equal(expectedHashingAccKey);
            expect(compiledIx.keys[0].isSigner).to.equal(false);
            expect(compiledIx.keys[0].isWritable).to.equal(true);
        });
    });

    it('Correctly compiles and parses instruction', async () => {
        const computeHashInstruction = new ComputeHashInstruction(
            nonce,
            hashAccIndex,
            currPrivateBalance,
            isRecipient,
            programNonce,
        );

        const compiledIx = await computeHashInstruction.compileInstruction(
            seedWrapper.getRootViewingKeyWrapper(),
            'devnet',
        );
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const parsedIx = await ComputeHashInstruction.parseInstruction(
            {
                data: bytesToBs58(Uint8Array.from(compiledIx.data)),
                programId: SystemProgram.programId,
                accounts: [],
            },
            seedWrapper.getRootViewingKeyWrapper(),
            nonce,
        )!;

        expect(parsedIx).to.not.be.null;

        expect(parsedIx!.hashAccIndex).to.equal(computeHashInstruction.hashAccIndex);
        expect(parsedIx!.currPrivateBalance).to.equal(computeHashInstruction.currPrivateBalance);
        expect(parsedIx!.nonce).to.equal(nonce);
        expect(parsedIx!.isRecipient).to.equal(isRecipient);
        expect(parsedIx!.programNonce).to.equal(computeHashInstruction.programNonce);
    });

    it('Returns null when parsing invalid length data', async () => {
        const parsedIx = await ComputeHashInstruction.parseInstruction(
            {
                programId: SystemProgram.programId,
                accounts: [],
                data: bytesToBs58(new Uint8Array(1)),
            },
            seedWrapper.getRootViewingKeyWrapper(),
            nonce,
        );

        expect(parsedIx).to.be.null;
    });
});
