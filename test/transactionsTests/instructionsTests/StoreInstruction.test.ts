import { PublicKey, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import { ReprScalar } from 'elusiv-cryptojs';
import { SeedWrapper } from '../../../src/sdk/clientCrypto/SeedWrapper.js';
import { StoreInstruction } from '../../../src/sdk/transactions/instructions/StoreInstruction.js';
import { getElusivProgramId } from '../../../src/public/WardenInfo.js';
import { CommitmentMetadata } from '../../../src/sdk/clientCrypto/CommitmentMetadata.js';
import { bytesToBs58 } from '../../../src/sdk/utils/base58Utils.js';
import { TokenType } from '../../../src/public/tokenTypes/TokenType.js';

describe('Store Instruction tests', () => {
    const tokenType = 'LAMPORTS';
    const hashAccIndex = 0;
    const balance = BigInt(1);
    const coreCommitmentHash: ReprScalar = new Uint8Array([
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x58,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x59,
        0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x60,
        0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x61,
    ]) as ReprScalar;
    const commitmentHash: ReprScalar = new Uint8Array([
        0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x68,
        0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x69,
        0x2f, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x70,
        0x36, 0x37, 0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x71,
    ]) as ReprScalar;
    const merkleStartIndex = 2;
    const feeVersion = 3;
    const minBatchingRate = 4;
    const sender = new PublicKey('42tgKNsBuuXwxPhYNixCp4jRkkh8rvwfLUiAdZArWWR3');
    const warden = new PublicKey('6gW7nVxYuukNAjkGErKjSL9PSswLuJGPS5Rk1yCiZKTn');
    const programId = getElusivProgramId('devnet');

    const nonce = 5;

    const params: [TokenType, number, bigint, ReprScalar,
        ReprScalar, number, number, number] = [
        tokenType,
        hashAccIndex,
        balance,
        coreCommitmentHash,
        commitmentHash,
        merkleStartIndex,
        feeVersion,
        minBatchingRate,
    ];

    let seedWrapper: SeedWrapper;

    before(() => {
        seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5]));
    });

    it('Generates correct Store Instruction', async () => {
        const metadata = new CommitmentMetadata(
            nonce,
            params[0],
            params[5],
            params[2],
        );
        const serializedMeta = await metadata.serializeAndEncrypt(seedWrapper.getRootViewingKeyWrapper(), params[4]);

        const storeInstruction = new StoreInstruction(
            params[1],
            params[3],
            params[4],
            params[6],
            params[7],
            metadata,
            serializedMeta.cipherText,
        );

        expect(storeInstruction.metadata.tokenType).to.equal(tokenType);
        expect(storeInstruction.hashAccIndex).to.equal(hashAccIndex);
        expect(storeInstruction.metadata.balance).to.equal(balance);
        expect(storeInstruction.coreCommitmentHash).to.deep.equal(coreCommitmentHash);
        expect(storeInstruction.commitmentHash).to.deep.equal(commitmentHash);
        expect(storeInstruction.metadata.assocCommIndex).to.equal(merkleStartIndex);
        expect(storeInstruction.feeVersion).to.equal(feeVersion);
        expect(storeInstruction.minBatchingRate).to.equal(minBatchingRate);
        expect(() => storeInstruction.compileInstruction(
            seedWrapper.getRootViewingKeyWrapper(),
            'devnet',
            nonce,
            sender,
            warden,
        )).to.not.throw();
    });

    it('Correctly compiles instruction', async () => {
        const metadata = new CommitmentMetadata(
            nonce,
            params[0],
            params[5],
            params[2],
        );
        const serializedMeta = await metadata.serializeAndEncrypt(seedWrapper.getRootViewingKeyWrapper(), params[4]);

        const storeIx = new StoreInstruction(
            params[1],
            params[3],
            params[4],
            params[6],
            params[7],
            metadata,
            serializedMeta.cipherText,
        );

        const compiledIx = storeIx.compileInstruction(
            seedWrapper.getRootViewingKeyWrapper(),
            'devnet',
            nonce,
            sender,
            warden,
        );
        expect(compiledIx.keys.length).to.equal(storeIx.getAccounts(
            seedWrapper.getRootViewingKeyWrapper(),
            nonce,
            new PublicKey(new Uint8Array(32).fill(5)),
            'devnet',
            sender,
            warden,
        ).length);
        expect(compiledIx.programId).to.deep.equal(programId);
    });

    it('Correctly parses compiled instruction', async () => {
        const metadata = new CommitmentMetadata(
            nonce,
            params[0],
            params[5],
            params[2],
        );
        const serializedMeta = await metadata.serializeAndEncrypt(seedWrapper.getRootViewingKeyWrapper(), params[4]);

        const storeIx = new StoreInstruction(
            params[1],
            params[3],
            params[4],
            params[6],
            params[7],
            metadata,
            serializedMeta.cipherText,
        );

        const compiledIx = storeIx.compileInstruction(
            seedWrapper.getRootViewingKeyWrapper(),
            'devnet',
            nonce,
            sender,
            warden,
        );

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const parsedIx = await StoreInstruction.parseInstruction(seedWrapper.getRootViewingKeyWrapper(), {
            programId: SystemProgram.programId,
            accounts: [],
            data: bytesToBs58(Uint8Array.from(compiledIx.data)),
        })!;

        expect(parsedIx).to.not.be.null;

        expect(parsedIx?.metadata.tokenType).to.equal(tokenType);
        expect(parsedIx?.hashAccIndex).to.equal(hashAccIndex);
        expect(parsedIx?.metadata.balance).to.equal(balance);
        expect(parsedIx?.coreCommitmentHash).to.deep.equal(coreCommitmentHash);
        expect(parsedIx?.commitmentHash).to.deep.equal(commitmentHash);
        expect(parsedIx?.metadata.assocCommIndex).to.equal(merkleStartIndex);
        expect(parsedIx?.feeVersion).to.equal(feeVersion);
        expect(parsedIx?.minBatchingRate).to.equal(minBatchingRate);
    });

    it('Returns null when incorrect length data is parsed', async () => {
        expect(await StoreInstruction.parseInstruction(seedWrapper.getRootViewingKeyWrapper(), {
            programId: SystemProgram.programId,
            accounts: [],
            data: bytesToBs58(new Uint8Array(1)),
        })).to.be.null;
    });
});
