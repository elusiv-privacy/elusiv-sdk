import {
    Keypair, MessageCompiledInstruction, ParsedInnerInstruction, ParsedInstruction, PartiallyDecodedInstruction, PublicKey, SystemProgram, VersionedMessage,
} from '@solana/web3.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { IncompleteCommitment, Poseidon, ReprScalar } from 'elusiv-cryptojs';
import { FeeVersionData } from '../../../src/sdk/paramManagers/fee/FeeManager.js';
import { getNumberFromTokenType, TokenType } from '../../../src/public/tokenTypes/TokenType.js';
import { ComputeHashInstruction } from '../../../src/sdk/transactions/instructions/ComputeHashInstruction.js';
import { StoreInstruction } from '../../../src/sdk/transactions/instructions/StoreInstruction.js';
import { StoreTx } from '../../../src/sdk/transactions/StoreTx.js';
import { TransactionBuilding } from '../../../src/sdk/transactions/txBuilding/TransactionBuilding.js';
import { InstructionParsing } from '../../../src/sdk/transactions/txParsing/InstructionParsing.js';
import {
    COMPUTE_COMM_HASH_IX_CODE,
    FAILED_TO_PARSE, FINALIZE_VERIFICATION_IX_CODE, INIT_VERIFICATION_IX_CODE, MAX_MT_COUNT, MAX_UINT20, SEND_ARITY, STORE_BASE_COMM_IX_CODE,
} from '../../../src/constants.js';
import { InitVerificationInstruction } from '../../../src/sdk/transactions/instructions/InitVerificationInstruction.js';
import { FinalizeVerificationInstruction } from '../../../src/sdk/transactions/instructions/FinalizeVerificationInstruction.js';
import { SeedWrapper } from '../../../src/sdk/clientCrypto/SeedWrapper.js';
import { bytesToBs58 } from '../../../src/sdk/utils/base58Utils.js';
import { CommitmentMetadata } from '../../../src/sdk/clientCrypto/CommitmentMetadata.js';
import { getElusivProgramId } from '../../../src/public/WardenInfo.js';
import { ParsedLamportTransfer } from '../../../src/sdk/transactions/txBuilding/serializedTypes/types.js';

chai.use(chaiAsPromised);
const expect = chai.expect;

const MAX_UINT64 = BigInt('18446744073709551615');
const MAX_UINT32 = 4294967295;
describe('Instruction parsing tests', () => {
    it('Returns true for isElusivInstruction for instruction that has elusiv as program acc', () => {
        const ix: PartiallyDecodedInstruction = {
            programId: getElusivProgramId('devnet'),
            accounts: [],
            data: bytesToBs58(Buffer.from('')),
        };
        expect(InstructionParsing.isElusivIx('devnet', ix)).to.be.true;
    });

    it('Returns false for isElusivInstruction for instruction that does not have elusiv as program acc', () => {
        const ix: PartiallyDecodedInstruction = {
            programId: SystemProgram.programId,
            accounts: [],
            data: bytesToBs58(Buffer.from('')),
        };
        expect(InstructionParsing.isElusivIx('devnet', ix)).to.be.false;
    });

    it('Correctly identifies InitVerificationIx', () => {
        const idKey = new PublicKey(new Uint8Array(32).fill(20));
        const ix: PartiallyDecodedInstruction = {
            programId: getElusivProgramId('devnet'),
            accounts: [idKey],
            data: bytesToBs58(Buffer.from([INIT_VERIFICATION_IX_CODE])),
        };
        expect(InstructionParsing.isInitVerificationIx('devnet', ix, idKey)).to.be.true;
        expect(InstructionParsing.isSendIx('devnet', ix, idKey)).to.be.true;
    });

    it('Correctly identifies FinalizeVerificationIx', () => {
        const idKey = new PublicKey(new Uint8Array(32).fill(20));

        const ix: PartiallyDecodedInstruction = {
            programId: getElusivProgramId('devnet'),
            accounts: [idKey],
            data: bytesToBs58(Buffer.from([FINALIZE_VERIFICATION_IX_CODE])),
        };

        expect(InstructionParsing.isFinalizeVerificationIx('devnet', ix, idKey)).to.be.true;
        expect(InstructionParsing.isSendIx('devnet', ix, idKey)).to.be.true;
    });

    it('Correctly identifies not InitVerificationIx', () => {
        const idKey = new PublicKey(new Uint8Array(32).fill(20));

        const fakeIx: PartiallyDecodedInstruction = {
            programId: SystemProgram.programId,
            accounts: [],
            data: bytesToBs58(Buffer.from([INIT_VERIFICATION_IX_CODE + 1])),
        };

        expect(InstructionParsing.isInitVerificationIx('devnet', fakeIx, idKey)).to.be.false;
        expect(InstructionParsing.isSendIx('devnet', fakeIx, idKey)).to.be.false;
    });

    it('Correctly identifies StoreIx', () => {
        const validIxs = [COMPUTE_COMM_HASH_IX_CODE, STORE_BASE_COMM_IX_CODE];
        const idKey = new PublicKey(new Uint8Array(32).fill(20));

        validIxs.forEach((ixCode) => {
            const ix: PartiallyDecodedInstruction = {
                programId: getElusivProgramId('devnet'),
                accounts: [idKey],
                data: bytesToBs58(Buffer.from([ixCode])),
            };

            expect(InstructionParsing.isStoreIx('devnet', ix, idKey)).to.be.true;
        });
    });

    it('Correctly identifies not InitVerificationIx', () => {
        const idKey = new PublicKey(new Uint8Array(32).fill(20));

        const fakeIx: PartiallyDecodedInstruction = {
            programId: SystemProgram.programId,
            accounts: [],
            data: bytesToBs58(Buffer.from([STORE_BASE_COMM_IX_CODE + COMPUTE_COMM_HASH_IX_CODE + 1])),
        };

        expect(InstructionParsing.isStoreIx('devnet', fakeIx, idKey)).to.be.false;
    });

    it('Correctly identifies not FinalizeVerificationIx', () => {
        const idKey = new PublicKey(new Uint8Array(32).fill(20));

        const fakeIx: PartiallyDecodedInstruction = {
            programId: SystemProgram.programId,
            accounts: [],
            data: bytesToBs58(Buffer.from([FINALIZE_VERIFICATION_IX_CODE + 1])),
        };

        expect(InstructionParsing.isFinalizeVerificationIx('devnet', fakeIx, idKey)).to.be.false;
        expect(InstructionParsing.isSendIx('devnet', fakeIx, idKey)).to.be.false;
    });

    describe('Topup instructions parsing tests', () => {
        let topupTx: StoreTx;
        let topupTxMessage: VersionedMessage;
        let topupIxs: PartiallyDecodedInstruction[];

        const senders = [Keypair.fromSeed(new Uint8Array(32).fill(3)).publicKey];
        const tokenTypes: TokenType[] = [
            'LAMPORTS',
            'USDC',
        ];
        const isRecipients = [
            false,
            true,
        ];
        const warden = new PublicKey(new Uint8Array(32).fill(11));

        const feeVersionDatas: FeeVersionData[] = [
            { feeVersion: 0, minBatchingRate: 0 },
            { feeVersion: MAX_UINT32, minBatchingRate: MAX_UINT32 },
        ];
        const nonces = [
            0,
            MAX_UINT32,
        ];
        const balances = [
            BigInt(0),
            MAX_UINT64,
        ];

        const merkleStartIndexs = [
            0,
            MAX_UINT20,
        ];
        const hashAccIndexs = [
            0,
            MAX_UINT32,
        ];

        const fillerInstruction: PartiallyDecodedInstruction = {
            programId: SystemProgram.programId,
            accounts: [],
            data: bytesToBs58(new Uint8Array(0)),
        };

        before(async () => {
            await Poseidon.setupPoseidon();
        });

        nonces.forEach((nonce) => tokenTypes.forEach((tokenType) => senders.forEach((sender) => isRecipients.forEach((isRecipient) => feeVersionDatas.forEach((feeVersionData) => balances.forEach((balance) => merkleStartIndexs.forEach((merkleStartIndex) => hashAccIndexs.forEach((hashAccIndex) => {
            describe(`Tests with nonce ${nonce} and tokentype ${tokenType}, isRecipient ${isRecipient} and balance ${balance} and merkleStartIndex ${merkleStartIndex} and hashAccIndex ${hashAccIndex} and sender ${sender.toBase58()}`, () => {
                let seedWrapper: SeedWrapper;
                before(async () => {
                    seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5]));
                    const nullifier = seedWrapper.generateNullifier(nonce);
                    const commitment = new IncompleteCommitment(
                        nullifier,
                        balance,
                        BigInt(getNumberFromTokenType(tokenType)),
                        BigInt(merkleStartIndex),
                        Poseidon.getPoseidon(),
                    );

                    topupTx = {
                        nonce,
                        txType: 'TOPUP',
                        tokenType,
                        amount: commitment.getBalance(),
                        commitment,
                        commitmentHash: commitment.getCommitmentHash(),
                        isRecipient,
                        sender,
                        parsedPrivateBalance: commitment.getBalance(),
                        merkleStartIndex,
                        hashAccIndex,
                        identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
                        warden,
                        fee: BigInt(12000),
                    };

                    const rawTopup = await TransactionBuilding['buildRawTopupTransaction'](
                        topupTx,
                        seedWrapper.getRootViewingKeyWrapper(),
                        'devnet',
                        feeVersionData,
                        {
                            blockhash: '42xqHqEiZKNSozcXCN7YR8xW3TL6wwbbZbaMQMp93icH',
                            lastValidBlockHeight: 10,

                        },
                    );
                    topupTxMessage = rawTopup.compileMessage();
                });

                beforeEach(() => {
                    topupIxs = topupTxMessage.compiledInstructions.map((ix) => msgCompiledIxToPartiallyDecodedIx(ix, topupTxMessage.staticAccountKeys));
                });

                it('Should correctly get the variable instructions', () => {
                    const variableCompiledIxs = InstructionParsing.getCompiledVariableIxsFromRawStoreIxs(topupIxs);
                    expect(variableCompiledIxs.length).to.equal(2);
                    expect(variableCompiledIxs[0]).to.deep.equal(topupIxs[2]);
                    expect(variableCompiledIxs[1]).to.deep.equal(topupIxs[3]);
                });

                it('Should correctly get the constant instructions', () => {
                    const constantCompiledIxs = InstructionParsing.getCompiledConstantIxsFromRawStoreIxs(topupIxs);
                    expect(constantCompiledIxs.length).to.equal(2);
                    expect(constantCompiledIxs[0]).to.deep.equal(topupIxs[0]);
                    expect(constantCompiledIxs[1]).to.deep.equal(topupIxs[1]);
                });

                describe('Correctly parses a topup transaction\'s variable instructions', () => {
                    let storeIx: StoreInstruction;
                    let computeIx: ComputeHashInstruction;

                    before(async () => {
                        topupIxs = topupTxMessage.compiledInstructions.map((ix) => msgCompiledIxToPartiallyDecodedIx(ix, topupTxMessage.staticAccountKeys));
                        const variableCompiledIxs = InstructionParsing.getCompiledVariableIxsFromRawStoreIxs(topupIxs);
                        const res = await InstructionParsing.tryParseVariableInstructionsStore(variableCompiledIxs, nonce, seedWrapper.getRootViewingKeyWrapper());
                        storeIx = res.storeIx as StoreInstruction;
                        computeIx = res.computeIx;
                    });

                    it('Correctly parses balance', () => {
                        expect(storeIx.metadata.balance).to.equal(topupTx.commitment.getBalance());
                    });

                    it('Correctly parses core commitment hash', () => {
                        expect(storeIx.coreCommitmentHash).to.deep.equal(topupTx.commitment.getCommitmentHashCore());
                    });

                    it('Correctly parses commitment hash', () => {
                        expect(storeIx.commitmentHash).to.deep.equal(topupTx.commitment.getCommitmentHash());
                    });

                    it('Correctly parses tokenType', () => {
                        expect(storeIx.metadata.tokenType).to.equal(topupTx.tokenType);
                    });

                    it('Correctly parses merklestartindex', () => {
                        expect(storeIx.metadata.assocCommIndex).to.equal(topupTx.merkleStartIndex);
                    });

                    it('Correctly parses feeVersion', () => {
                        expect(storeIx.feeVersion).to.equal(feeVersionData.feeVersion);
                    });

                    it('Correctly parses minBatchingRate', () => {
                        expect(storeIx.minBatchingRate).to.equal(feeVersionData.minBatchingRate);
                    });

                    it('Correctly parses hashAccIndex', () => {
                        expect(storeIx.hashAccIndex).to.equal(topupTx.hashAccIndex);
                        expect(computeIx.hashAccIndex).to.equal(topupTx.hashAccIndex);
                    });

                    it('Correctly parses isRecipient', () => {
                        expect(computeIx.isRecipient).to.equal(topupTx.isRecipient);
                    });

                    it('Correctly parses current private balance', () => {
                        expect(computeIx.currPrivateBalance).to.equal(topupTx.parsedPrivateBalance);
                    });
                });

                it('Should throw for trying to parse wrong length variable ixs', () => {
                    const ixs = topupTxMessage.compiledInstructions.map((ix) => msgCompiledIxToPartiallyDecodedIx(ix, topupTxMessage.staticAccountKeys));

                    expect(InstructionParsing.tryParseVariableInstructionsStore(ixs, nonce, seedWrapper.getRootViewingKeyWrapper())).to.be.rejected;
                });

                it('Should throw for trying to parse undefined compute ix', () => {
                    const variableCompiledIxs = InstructionParsing.getCompiledVariableIxsFromRawStoreIxs(topupIxs);
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    variableCompiledIxs[0] = fillerInstruction;
                    expect(InstructionParsing.tryParseVariableInstructionsStore(variableCompiledIxs, nonce, seedWrapper.getRootViewingKeyWrapper())).to.be.rejected;
                });

                it('Should throw for trying to parse undefined store ix', () => {
                    const variableCompiledIxs = InstructionParsing.getCompiledVariableIxsFromRawStoreIxs(topupIxs);
                    variableCompiledIxs[1] = fillerInstruction;
                    expect(InstructionParsing.tryParseVariableInstructionsStore(variableCompiledIxs, nonce, seedWrapper.getRootViewingKeyWrapper())).to.be.rejected;
                });

                it('Should throw for trying to slice too short length constant ixs', () => {
                    topupIxs.pop();
                    expect(() => InstructionParsing.getCompiledConstantIxsFromRawStoreIxs(topupIxs)).to.throw();
                });

                it('Should throw for trying to slice too short length variable ixs', () => {
                    topupIxs.pop();
                    expect(() => InstructionParsing.getCompiledVariableIxsFromRawStoreIxs(topupIxs)).to.throw();
                });

                it('Should throw for trying to slice too long length constant ixs', () => {
                    topupIxs.push(topupIxs[0]);
                    expect(() => InstructionParsing.getCompiledConstantIxsFromRawStoreIxs(topupIxs)).to.throw();
                });

                it('Should throw for trying to slice too long length variable ixs', () => {
                    topupIxs.push(topupIxs[0]);
                    expect(() => InstructionParsing.getCompiledVariableIxsFromRawStoreIxs(topupIxs)).to.throw();
                });
            });
        }))))))));
    });

    describe('CPI parsing tests', () => {
        const DUMMY_CPI: ParsedInstruction = {
            program: 'DUMMY_PROG',
            programId: SystemProgram.programId,
            parsed: '',
        };
        const from = new PublicKey(new Uint8Array(32).fill(5));
        const to = new PublicKey(new Uint8Array(32).fill(6));
        const amount = BigInt(10_000);
        let lamportsCPIs: ParsedInnerInstruction[];
        let splCPIs: ParsedInnerInstruction[];

        before(() => {
            const lamportsTransfer: ParsedLamportTransfer = {
                info: {
                    destination: to.toBase58(),
                    source: from.toBase58(),
                    lamports: Number(amount),
                },
                type: 'transfer',
            };
            lamportsCPIs = [{
                index: 2,
                instructions: [
                    {
                        program: SystemProgram.name,
                        programId: SystemProgram.programId,
                        parsed: lamportsTransfer,
                    },
                    DUMMY_CPI,
                    DUMMY_CPI,
                    DUMMY_CPI,
                    DUMMY_CPI,
                ],
            }];

            // Token transfer
            splCPIs = [{
                index: 2,
                instructions: [
                    {
                        program: SystemProgram.name,
                        programId: SystemProgram.programId,
                        parsed: {
                            info: {
                                amount: amount.toString(10),
                                destination: new PublicKey(new Uint8Array(32).fill(4)).toBase58(),
                                multisigAuthority: new PublicKey(new Uint8Array(32).fill(5)).toBase58(),
                                signers: [],
                                source: new PublicKey(new Uint8Array(32).fill(3)).toBase58(),
                            },
                            type: 'transfer',
                        },
                    },
                    DUMMY_CPI,
                    DUMMY_CPI,
                    DUMMY_CPI,
                    DUMMY_CPI,
                    DUMMY_CPI,
                ],
            }];
        });

        it('Correctly parses lamport fee', () => {
            const lamportFee = InstructionParsing.tryParseFeeFromStoreCPIs(lamportsCPIs, 'LAMPORTS');
            expect(lamportFee).to.equal(amount);
        });

        it('Correctly parses SPL fee', () => {
            const splFee = InstructionParsing.tryParseFeeFromStoreCPIs(splCPIs, 'USDC');
            expect(splFee).to.equal(amount);
        });

        it('Throws for trying to parse lamport fee from wrong length CPIs', () => {
            const wrongLamportsCPIS = splCPIs.slice();
            wrongLamportsCPIS[0].instructions = wrongLamportsCPIS[0].instructions.slice(0, 4);
            expect(() => InstructionParsing.tryParseFeeFromStoreCPIs(wrongLamportsCPIS, 'LAMPORTS')).to.throw();
        });

        it('Throws for trying to parse SPL fee from wrong length CPIs', () => {
            const wrongSPLCPIS = splCPIs.slice();
            wrongSPLCPIS[0].instructions = wrongSPLCPIS[0].instructions.slice(0, 5);
            expect(() => InstructionParsing.tryParseFeeFromStoreCPIs(wrongSPLCPIS, 'USDC')).to.throw();
        });

        it('Throws for trying to parse lamport fee from wrong CPI', () => {
            const lamportCPIsWrong = lamportsCPIs.slice();
            lamportCPIsWrong[0].instructions[0] = DUMMY_CPI;
            expect(() => InstructionParsing.tryParseFeeFromStoreCPIs(lamportCPIsWrong, 'LAMPORTS')).to.throw();
        });

        it('Throws for trying to parse SPL fee from wrong CPI', () => {
            const splCPIsWrong = splCPIs.slice();
            splCPIsWrong[0].instructions[0] = DUMMY_CPI;
            expect(() => InstructionParsing.tryParseFeeFromStoreCPIs(splCPIsWrong, 'USDC')).to.throw();
        });
    });

    describe('Send instruction parsing tests', async () => {
        const nonce = 99;
        const commitmentCounts = [
            1,
            2,
            SEND_ARITY - 1,
        ];
        const feeVersions = [
            0,
            MAX_UINT32,
        ];
        const tokenTypes: TokenType[] = [
            'LAMPORTS',
            'USDC',
        ];
        const amounts = [
            BigInt(0),
            BigInt(MAX_UINT64),
        ];
        const fees = [
            BigInt(0),
            BigInt(MAX_UINT64),
        ];

        const roots: ReprScalar[] = [
            new Uint8Array(32).fill(1),
            new Uint8Array(32).fill(2),
            new Uint8Array(32).fill(3),
            new Uint8Array(32).fill(4),
            new Uint8Array(32).fill(5),
        ] as ReprScalar[];
        const nullifierHashes: ReprScalar[] = [
            new Uint8Array(32).fill(6),
            new Uint8Array(32).fill(7),
            new Uint8Array(32).fill(8),
            new Uint8Array(32).fill(9),
            new Uint8Array(32).fill(10),
        ] as ReprScalar[];

        const commitment: ReprScalar = new Uint8Array(32).fill(11) as ReprScalar;
        const owner = new PublicKey(new Uint8Array(32).fill(12));
        const seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5]));
        const encryptedOwner = await seedWrapper.getRootViewingKeyWrapper().encryptSeededSaltedAES256(owner.toBytes(), nonce);

        const fillerInstruction: PartiallyDecodedInstruction = {
            programId: SystemProgram.programId,
            accounts: [],
            data: bytesToBs58(new Uint8Array(0)),
        };

        commitmentCounts.forEach((commitmentCount) => fees.forEach((fee) => amounts.forEach((amount) => feeVersions.forEach((feeVersion) => tokenTypes.forEach(async (tokenType) => {
            const verAccIndex = 1;
            const vkeyIndex = 2;
            const treeIndices = new Array(MAX_MT_COUNT).fill(3);
            const mtIndex = 4;
            const commIndex = 5;

            const metadata = new CommitmentMetadata(nonce, tokenType, commIndex, amount);
            const serializedMeta = await metadata.serializeAndEncrypt(seedWrapper.getRootViewingKeyWrapper(), commitment);

            const initVerificationIx = new InitVerificationInstruction(
                verAccIndex,
                vkeyIndex,
                treeIndices,
                commitmentCount,
                roots.slice(0, commitmentCount),
                nullifierHashes.slice(0, commitmentCount),
                commitment,
                metadata,
                serializedMeta.cipherText,
                feeVersion,
                amount,
                fee,
                { collector: SystemProgram.programId, amount: BigInt(0) },
                false,
                new Uint8Array(32).fill(12) as ReprScalar,
                true,
                false,
            );

            const finalizeVerificationInstruction = new FinalizeVerificationInstruction(
                amount,
                tokenType,
                mtIndex,
                encryptedOwner,
                vkeyIndex,
                owner,
            );

            const serializedInit: PartiallyDecodedInstruction = {
                programId: SystemProgram.programId,
                accounts: [],
                data: bytesToBs58(initVerificationIx.compile()),
            };

            const serializedFinalize: PartiallyDecodedInstruction = {
                programId: SystemProgram.programId,
                accounts: [],
                data: bytesToBs58(finalizeVerificationInstruction.compile(false, commIndex)),
            };

            it('Correctly parses init with init as the only instruction', async () => {
                const parsed = await InstructionParsing.tryParseVariableInstructionsInitVerification([serializedInit], seedWrapper.getRootViewingKeyWrapper());
                expect(parsed.initIx).to.be.instanceOf(InitVerificationInstruction);
                expect(parsed.initIx).to.deep.equal(initVerificationIx);
            });

            it('Correctly parses init with init as the first instruction', async () => {
                const parsed = await InstructionParsing.tryParseVariableInstructionsInitVerification([serializedInit, fillerInstruction], seedWrapper.getRootViewingKeyWrapper());
                expect(parsed.initIx).to.be.instanceOf(InitVerificationInstruction);
                expect(parsed.initIx).to.deep.equal(initVerificationIx);
            });

            it('Correctly parses init with init as the last instruction', async () => {
                const parsed = await InstructionParsing.tryParseVariableInstructionsInitVerification([fillerInstruction, serializedInit], seedWrapper.getRootViewingKeyWrapper());
                expect(parsed.initIx).to.be.instanceOf(InitVerificationInstruction);
                expect(parsed.initIx).to.deep.equal(initVerificationIx);
            });

            it('Correctly parses init with init as the middle instruction', async () => {
                const parsed = await InstructionParsing.tryParseVariableInstructionsInitVerification([fillerInstruction, serializedInit, fillerInstruction], seedWrapper.getRootViewingKeyWrapper());
                expect(parsed.initIx).to.be.instanceOf(InitVerificationInstruction);
                expect(parsed.initIx).to.deep.equal(initVerificationIx);
            });

            it('Correctly parses finalize with finalize as the only instruction', async () => {
                const key = seedWrapper.getRootViewingKeyWrapper().generateDecryptionKey(nonce);

                // Borsh-ts mutates the parsed bytes, so we need to make a copy
                const parsedNonce = await InstructionParsing.tryParseVariableInstructionsFinalizeVerification([serializedFinalize], nonce, seedWrapper.getRootViewingKeyWrapper());
                const parsedKey = await InstructionParsing.tryParseVariableInstructionsFinalizeVerificationFromDecryptionKey([serializedFinalize], key);
                expect(parsedNonce.finalizeIx).to.be.instanceOf(FinalizeVerificationInstruction);
                expect(parsedNonce.finalizeIx).to.deep.equal(finalizeVerificationInstruction);
                expect(parsedKey.finalizeIx).to.be.instanceOf(FinalizeVerificationInstruction);
                expect(parsedKey.finalizeIx).to.deep.equal(finalizeVerificationInstruction);
            });

            it('Correctly parses finalize with finalize as the first instruction', async () => {
                const key = seedWrapper.getRootViewingKeyWrapper().generateDecryptionKey(nonce);

                const parsedNonce = await InstructionParsing.tryParseVariableInstructionsFinalizeVerification([serializedFinalize, fillerInstruction], nonce, seedWrapper.getRootViewingKeyWrapper());
                const parsedKey = await InstructionParsing.tryParseVariableInstructionsFinalizeVerificationFromDecryptionKey([serializedFinalize, fillerInstruction], key);
                expect(parsedNonce.finalizeIx).to.be.instanceOf(FinalizeVerificationInstruction);
                expect(parsedNonce.finalizeIx).to.deep.equal(finalizeVerificationInstruction);
                expect(parsedKey.finalizeIx).to.be.instanceOf(FinalizeVerificationInstruction);
                expect(parsedKey.finalizeIx).to.deep.equal(finalizeVerificationInstruction);
            });

            it('Correctly parses finalize with finalize as the last instruction', async () => {
                const key = seedWrapper.getRootViewingKeyWrapper().generateDecryptionKey(nonce);

                const parsedNonce = await InstructionParsing.tryParseVariableInstructionsFinalizeVerification([fillerInstruction, serializedFinalize], nonce, seedWrapper.getRootViewingKeyWrapper());
                const parsedKey = await InstructionParsing.tryParseVariableInstructionsFinalizeVerificationFromDecryptionKey([fillerInstruction, serializedFinalize], key);
                expect(parsedNonce.finalizeIx).to.be.instanceOf(FinalizeVerificationInstruction);
                expect(parsedNonce.finalizeIx).to.deep.equal(finalizeVerificationInstruction);
                expect(parsedKey.finalizeIx).to.be.instanceOf(FinalizeVerificationInstruction);
                expect(parsedKey.finalizeIx).to.deep.equal(finalizeVerificationInstruction);
            });

            it('Correctly parses finalize with finalize as the middle instruction', async () => {
                const key = seedWrapper.getRootViewingKeyWrapper().generateDecryptionKey(nonce);

                const parsedNonce = await InstructionParsing.tryParseVariableInstructionsFinalizeVerification([fillerInstruction, serializedFinalize, fillerInstruction], nonce, seedWrapper.getRootViewingKeyWrapper());
                const parsedKey = await InstructionParsing.tryParseVariableInstructionsFinalizeVerificationFromDecryptionKey([fillerInstruction, serializedFinalize, fillerInstruction], key);
                expect(parsedNonce.finalizeIx).to.be.instanceOf(FinalizeVerificationInstruction);
                expect(parsedNonce.finalizeIx).to.deep.equal(finalizeVerificationInstruction);
                expect(parsedKey.finalizeIx).to.be.instanceOf(FinalizeVerificationInstruction);
                expect(parsedKey.finalizeIx).to.deep.equal(finalizeVerificationInstruction);
            });
        })))));

        it('Throws if no init instruction is found', async () => {
            expect(InstructionParsing.tryParseVariableInstructionsInitVerification([fillerInstruction])).to.be.rejected;
        });

        it('Throws if no finalize instruction is found', async () => {
            expect(InstructionParsing.tryParseVariableInstructionsFinalizeVerification([fillerInstruction], nonce, seedWrapper.getRootViewingKeyWrapper())).to.be.rejectedWith(FAILED_TO_PARSE('finalize verification instruction'));
        });
    });
});

function msgCompiledIxToPartiallyDecodedIx(ix: MessageCompiledInstruction, keys: PublicKey[]): PartiallyDecodedInstruction {
    return {
        programId: keys[ix.programIdIndex],
        accounts: ix.accountKeyIndexes.map((i) => keys[i]),
        data: bytesToBs58(ix.data),
    };
}
