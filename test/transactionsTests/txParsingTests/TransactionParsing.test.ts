/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    ComputeBudgetProgram, ConfirmedSignatureInfo, Keypair, MessageCompiledInstruction, ParsedInnerInstruction, ParsedInstruction, ParsedMessage, ParsedMessageAccount, PartiallyDecodedInstruction, PublicKey, SystemProgram, Transaction,
} from '@solana/web3.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { IncompleteCommitment, Poseidon, ReprScalar } from '@elusiv/cryptojs';
import { FeeVersionData } from '../../../src/sdk/paramManagers/fee/FeeManager.js';
import { getNumberFromTokenType } from '../../../src/public/tokenTypes/TokenTypeFuncs.js';
import { StoreTx } from '../../../src/sdk/transactions/StoreTx.js';
import { TransactionBuilding } from '../../../src/sdk/transactions/txBuilding/TransactionBuilding.js';
import { TransactionParsing } from '../../../src/sdk/transactions/txParsing/TransactionParsing.js';
import { MAX_MT_COUNT, MAX_UINT20, SEND_ARITY } from '../../../src/constants.js';
import { InitVerificationInstruction } from '../../../src/sdk/transactions/instructions/InitVerificationInstruction.js';
import { FinalizeVerificationInstruction } from '../../../src/sdk/transactions/instructions/FinalizeVerificationInstruction.js';
import { bytesToBs58 } from '../../../src/sdk/utils/base58Utils.js';
import { PartialSendTx } from '../../../src/sdk/transactions/SendTx.js';
import { SeedWrapper } from '../../../src/sdk/clientCrypto/SeedWrapper.js';
import { getElusivProgramId } from '../../../src/public/WardenInfo.js';
import { CommitmentMetadata } from '../../../src/sdk/clientCrypto/CommitmentMetadata.js';
import { TokenType } from '../../../src/public/tokenTypes/TokenType.js';

chai.use(chaiAsPromised);
const expect = chai.expect;

const MAX_UINT64 = BigInt('18446744073709551615');
const MAX_UINT32 = 4294967295;
const DUMMY_CPI: ParsedInstruction = {
    program: 'DUMMY_PROG',
    programId: SystemProgram.programId,
    parsed: '',
};

describe('Topup Transaction parsing tests', () => {
    let topupTx: StoreTx;
    let topupTxMessage: ParsedMessage;
    let cpis: ParsedInnerInstruction[];
    const sig: ConfirmedSignatureInfo = {
        signature: '45sQP55ozawq6o39Kz2bWqrYjBuD4P3AsM8uic7qkp5SSGZNjt8ZbR915JuRew4vuGfqof9tfXtNNGaXqpbDQTzS',
        slot: 1,
        err: null,
        memo: null,
    };

    const tokenTypes: TokenType[] = [
        'LAMPORTS',
        'USDC',
    ];
    const senders = [
        Keypair.fromSeed(new Uint8Array(32).fill(3)).publicKey,
    ];
    const isRecipients = [
        false,
        true,
    ];

    const feeVersionDatas: FeeVersionData[] = [
        { feeVersion: 0, minBatchingRate: 0 },
        { feeVersion: 100, minBatchingRate: 200 },
    ];
    const nonces = [
        0,
        4,
        MAX_UINT32,
    ];
    const fees = [
        BigInt(0),
        MAX_UINT64,
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
    const warden = new PublicKey(new Uint8Array(32).fill(11));

    before(async () => {
        await Poseidon.setupPoseidon();
    });

    fees.forEach((fee) => nonces.forEach((nonce) => tokenTypes.forEach((tokenType) => senders.forEach((sender) => isRecipients.forEach((isRecipient) => feeVersionDatas.forEach((feeVersionData) => balances.forEach((balance) => merkleStartIndexs.forEach((merkleStartIndex) => hashAccIndexs.forEach((hashAccIndex) => {
        describe(`Tests with nonce ${nonce} and tokentype ${tokenType}, isRecipient ${isRecipient} and balance ${balance} and merkleStartIndex ${merkleStartIndex} and hashAccIndex ${hashAccIndex} and sender ${sender.toBase58()}`, () => {
            let seedWrapper: SeedWrapper;
            beforeEach(async () => {
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
                    fee,
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

                const compiled = rawTopup.compileMessage();
                topupTxMessage = generateSendMessage(compiled.compiledInstructions, compiled.accountKeys);

                if (tokenType === 'LAMPORTS') {
                    cpis = [{
                        index: 2,
                        instructions: [
                            {
                                program: SystemProgram.name,
                                programId: SystemProgram.programId,
                                parsed: {
                                    info: {
                                        destination: new PublicKey(new Uint8Array(32).fill(4)).toBase58(),
                                        source: new PublicKey(new Uint8Array(32).fill(3)).toBase58(),
                                        lamports: Number(fee),
                                    },
                                    type: 'transfer',
                                },
                            },
                            DUMMY_CPI,
                            DUMMY_CPI,
                            DUMMY_CPI,
                            DUMMY_CPI,
                        ],
                    }];
                }
                else {
                    // Token transfer
                    cpis = [{
                        index: 2,
                        instructions: [
                            {
                                program: SystemProgram.name,
                                programId: SystemProgram.programId,
                                parsed: {
                                    info: {
                                        amount: fee.toString(10),
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
                }
            });

            it('Correctly identifies a valid topup', () => {
                expect(TransactionParsing.isStoreTx('devnet', topupTxMessage, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce))).to.be.true;
            });

            it('Correctly identifies an invalid topup due to instruction type', () => {
                const fillerInstruction = {
                    programIdIndex: 0,
                    accountKeyIndexes: [],
                    data: new Uint8Array(0),
                };

                const invalidMessage = generateSendMessage([fillerInstruction], topupTxMessage.accountKeys.map((acc) => acc.pubkey));
                expect(TransactionParsing.isStoreTx('devnet', invalidMessage, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce))).to.be.false;
            });

            it('Correctly parses a topup transaction', async () => {
                const parsedTx = await TransactionParsing.tryParseRawStore(topupTxMessage, cpis, sig, nonce, topupTx.identifier, seedWrapper.getRootViewingKeyWrapper());
                expect(parsedTx.fee).to.equal(tokenType === 'LAMPORTS' ? BigInt(Number(fee)) : fee);
                expect(parsedTx.nonce).to.equal(topupTx.nonce);
                expect(parsedTx.txType).to.equal(topupTx.txType);
                expect(parsedTx.tokenType).to.equal(topupTx.tokenType);
                expect(parsedTx.identifier).to.deep.equal(topupTx.identifier);
                expect(parsedTx.warden).to.deep.equal(topupTx.warden);
                expect(parsedTx.sender).to.deep.equal(topupTx.sender);
                expect(parsedTx.parsedPrivateBalance).to.equal(topupTx.parsedPrivateBalance);
                expect(parsedTx.merkleStartIndex).to.equal(topupTx.merkleStartIndex);
                expect(parsedTx.isRecipient).to.equal(topupTx.isRecipient);
                expect(parsedTx.hashAccIndex).to.equal(topupTx.hashAccIndex);
            });
        });
    })))))))));

    it('Should throw for invalid topup', () => {
        // Random filler instructions to get it to the correct length
        const fakeTopup = new Transaction(
            {
                blockhash: '11111111111111111111111111111111',
                lastValidBlockHeight: 0,
                feePayer: new PublicKey('11111111111111111111111111111111'),
            },
        )
            .add(ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 0,
            }))
            .add(ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 0,
            }))
            .add(ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 0,
            }))
            .add(ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 0,
            }));
        const lamportsCPIs = [{
            index: 2,
            instructions: [
                {
                    program: SystemProgram.name,
                    programId: SystemProgram.programId,
                    parsed: {
                        info: {
                            destination: new PublicKey(new Uint8Array(32).fill(4)).toBase58(),
                            source: new PublicKey(new Uint8Array(32).fill(3)).toBase58(),
                            lamports: 10_000,
                        },
                        type: 'transfer',
                    },
                },
                DUMMY_CPI,
                DUMMY_CPI,
                DUMMY_CPI,
                DUMMY_CPI,
            ],
        }];

        const seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5]));
        const rvk = seedWrapper.getRootViewingKeyWrapper();
        const nonce = 0;
        const fakeTopupMsg = generateSendMessage(fakeTopup.compileMessage().compiledInstructions, fakeTopup.compileMessage().accountKeys);

        expect(TransactionParsing.tryParseRawStore(fakeTopupMsg, lamportsCPIs, sig, nonce, rvk.getIdentifierKey(nonce), rvk)).to.be.rejected;
    });
});

describe('Send Transaction parsing tests', async () => {
    const nonce = 99;
    const identifierIndex = 0;
    const recipientIndex = 1;
    const programIndex = 2;
    const verificationAccIndex = 3;
    const seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5]));
    const identifier = seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce);
    const recipient = new PublicKey(new Uint8Array(32).fill(1));
    const verificationAcc = new PublicKey(new Uint8Array(32).fill(2));
    const program = getElusivProgramId('devnet');
    const keys = [identifier, recipient, program, verificationAcc];
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
    const encryptedOwner = await seedWrapper.getRootViewingKeyWrapper().encryptSeededSaltedAES256(owner.toBytes(), nonce);

    const fillerInstruction: MessageCompiledInstruction = {
        programIdIndex: 0,
        accountKeyIndexes: [],
        data: new Uint8Array(0),
    };

    commitmentCounts.forEach((commitmentCount) => fees.forEach((fee) => amounts.forEach((amount) => feeVersions.forEach((feeVersion) => tokenTypes.forEach((tokenType) => {
        describe(`Tests with nonce ${nonce} and tokentype ${tokenType} and fee ${fee} and feeVersion ${feeVersion} and amount ${amount} and tokenType ${tokenType}`, async () => {
            const verAccIndex = 1;
            const vkeyIndex = 2;
            const treeIndices = new Array(MAX_MT_COUNT).fill(3);
            const mtIndex = 4;
            const commIndex = 5;
            const metadata = new CommitmentMetadata(nonce, tokenType, mtIndex, amount);
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
                { amount: BigInt(0), collector: SystemProgram.programId },
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

            const serializedInit: MessageCompiledInstruction = {
                programIdIndex: programIndex,
                accountKeyIndexes: [0, verificationAccIndex, 0, 0, 0, identifierIndex],
                data: initVerificationIx.compile(),
            };

            const serializedFinalize: MessageCompiledInstruction = {
                programIdIndex: programIndex,
                accountKeyIndexes: [recipientIndex, identifierIndex, 0, 0, 0, verificationAccIndex],
                data: finalizeVerificationInstruction.compile(false, commIndex),
            };

            const verifyProcessedSendTx = (parsedTx: PartialSendTx) => {
                verifySendTx(parsedTx);
                expect(parsedTx.encryptedOwner).to.deep.equal(encryptedOwner);
                expect(parsedTx.recipient?.equals(recipient)).to.be.true;
                expect(parsedTx.transactionStatus).to.equal('PROCESSED');
            };

            const verifyPendingSendTx = (parsedTx: PartialSendTx) => {
                verifySendTx(parsedTx);
                expect(parsedTx.transactionStatus).to.equal('PENDING');
            };

            const verifySendTx = (parsedTx: PartialSendTx) => {
                expect(parsedTx.nonce).to.equal(nonce);
                expect(parsedTx.txType).to.equal('SEND');
                expect(parsedTx.tokenType).to.deep.equal(tokenType);
                expect(parsedTx.identifier.equals(identifier)).to.be.true;
                expect(parsedTx.amount).to.equal(amount);
                expect(parsedTx.fee).to.equal(fee);
                expect(parsedTx.isAssociatedTokenAcc).to.deep.equal(false);
                expect(parsedTx.memo).to.be.undefined;
                expect(parsedTx.inputCommitments).to.be.undefined;
                expect(parsedTx.proof).to.be.undefined;
            };

            it('Correctly parses valid send transactions with no padded transaction', async () => {
                const initTx = generateSendMessage([
                    serializedInit,
                ], keys);

                const initSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 0,
                    err: null,
                    memo: null,
                };

                const finalizeTx = generateSendMessage([
                    serializedFinalize,
                ], keys);

                const finalizeSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 1,
                    err: null,
                    memo: null,
                };

                const parsedProcessedTx = await TransactionParsing.tryParseRawSend('devnet', [initTx, finalizeTx], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedProcessedTx!);
                const parsedPendingTx = await TransactionParsing.tryParseRawSend('devnet', [initTx], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyPendingSendTx(parsedPendingTx!);
            });

            it('Correctly parses valid send transactions with padded init transaction', async () => {
                const initTxFrontPadded = generateSendMessage([
                    serializedInit,
                    fillerInstruction,
                ], keys);

                const initTxBackPadded = generateSendMessage([
                    fillerInstruction,
                    serializedInit,
                ], keys);

                const initTxBothPadded = generateSendMessage([
                    fillerInstruction,
                    serializedInit,
                    fillerInstruction,
                ], keys);

                const initSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 0,
                    err: null,
                    memo: null,
                };

                const finalizeTx = generateSendMessage([
                    serializedFinalize,
                ], keys);

                const finalizeSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 1,
                    err: null,
                    memo: null,
                };

                const parsedTxFront = await TransactionParsing.tryParseRawSend('devnet', [initTxFrontPadded, finalizeTx], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxFront!);

                const parsedPendingTxFront = await TransactionParsing.tryParseRawSend('devnet', [initTxFrontPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyPendingSendTx(parsedPendingTxFront!);

                const parsedTxBack = await TransactionParsing.tryParseRawSend('devnet', [initTxBackPadded, finalizeTx], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxBack!);

                const parsedPendingTxBack = await TransactionParsing.tryParseRawSend('devnet', [initTxBackPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyPendingSendTx(parsedPendingTxBack!);

                const parsedTxBoth = await TransactionParsing.tryParseRawSend('devnet', [initTxBothPadded, finalizeTx], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxBoth!);

                const parsedPendingTxBoth = await TransactionParsing.tryParseRawSend('devnet', [initTxBothPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyPendingSendTx(parsedPendingTxBoth!);
            });

            it('Correctly parses valid confirmed send transactions with padded finalize transaction', async () => {
                const initTx = generateSendMessage([
                    serializedInit,
                ], keys);

                const initSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 0,
                    err: null,
                    memo: null,
                };

                const finalizeTxFrontPadded = generateSendMessage([
                    serializedFinalize,
                    fillerInstruction,
                ], keys);

                const finalizeTxBackPadded = generateSendMessage([
                    fillerInstruction,
                    serializedFinalize,
                ], keys);

                const finalizeTxBothPadded = generateSendMessage([
                    fillerInstruction,
                    serializedFinalize,
                    fillerInstruction,
                ], keys);

                const finalizeSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 1,
                    err: null,
                    memo: null,
                };

                const parsedTxFront = await TransactionParsing.tryParseRawSend('devnet', [initTx, finalizeTxFrontPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxFront!);

                const parsedTxBack = await TransactionParsing.tryParseRawSend('devnet', [initTx, finalizeTxBackPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxBack!);

                const parsedTxBoth = await TransactionParsing.tryParseRawSend('devnet', [initTx, finalizeTxBothPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxBoth!);
            });

            it('Correctly parses valid confirmed send transactions with padded init and finalize transactions', async () => {
                const initTxFrontPadded = generateSendMessage([
                    serializedInit,
                    fillerInstruction,
                ], keys);

                const initTxBackPadded = generateSendMessage([
                    fillerInstruction,
                    serializedInit,
                ], keys);

                const initTxBothPadded = generateSendMessage([
                    fillerInstruction,
                    serializedInit,
                    fillerInstruction,
                ], keys);

                const initSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 0,
                    err: null,
                    memo: null,
                };

                const finalizeTxFrontPadded = generateSendMessage([
                    serializedFinalize,
                    fillerInstruction,
                ], keys);

                const finalizeTxBackPadded = generateSendMessage([
                    fillerInstruction,
                    serializedFinalize,
                ], keys);

                const finalizeTxBothPadded = generateSendMessage([
                    fillerInstruction,
                    serializedFinalize,
                    fillerInstruction,
                ], keys);

                const finalizeSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 1,
                    err: null,
                    memo: null,
                };

                const parsedTxFront = await TransactionParsing.tryParseRawSend('devnet', [initTxFrontPadded, finalizeTxFrontPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxFront!);

                const parsedTxBack = await TransactionParsing.tryParseRawSend('devnet', [initTxBackPadded, finalizeTxBackPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxBack!);

                const parsedTxBoth = await TransactionParsing.tryParseRawSend('devnet', [initTxBothPadded, finalizeTxBothPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxBoth!);

                const parsedTxInitFrontFinalizeBack = await TransactionParsing.tryParseRawSend('devnet', [initTxFrontPadded, finalizeTxBackPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxInitFrontFinalizeBack!);

                const parsedTxInitBackFinalizeFront = await TransactionParsing.tryParseRawSend('devnet', [initTxBackPadded, finalizeTxFrontPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxInitBackFinalizeFront!);

                const parsedTxInitBothFinalizeBack = await TransactionParsing.tryParseRawSend('devnet', [initTxBothPadded, finalizeTxBackPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxInitBothFinalizeBack!);

                const parsedTxInitBackFinalizeBoth = await TransactionParsing.tryParseRawSend('devnet', [initTxBackPadded, finalizeTxBothPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxInitBackFinalizeBoth!);

                const parsedTxInitFrontFinalizeBoth = await TransactionParsing.tryParseRawSend('devnet', [initTxFrontPadded, finalizeTxBothPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxInitFrontFinalizeBoth!);

                const parsedTxInitBothFinalizeFront = await TransactionParsing.tryParseRawSend('devnet', [initTxBothPadded, finalizeTxFrontPadded], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTxInitBothFinalizeFront!);
            });

            it('Throws for parsing send transactions with not enough transaction messages', () => {
                expect(() => TransactionParsing.tryParseRawSend('devnet', [], [], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper()));
            });

            it('Throws for parsing send transactions with duplicate transaction messages', () => {
                const initTx = generateSendMessage([
                    serializedInit,
                ], keys);

                const initSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 0,
                    err: null,
                    memo: null,
                };

                expect(TransactionParsing.tryParseRawSend('devnet', [initTx, initTx], [initSig, initSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper())).to.be.rejected;
            });

            it('Correctly identifies valid send transaction', () => {
                const initTx = generateSendMessage([
                    serializedInit,
                ], keys);

                const finalizeTx = generateSendMessage([
                    serializedFinalize,
                ], keys);

                expect(TransactionParsing.isSendTx('devnet', finalizeTx, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce))).to.be.true;
                expect(TransactionParsing.isSendTx('devnet', initTx, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce))).to.be.true;
            });

            it('Correctly identifies invalid send transaction with wrong instruction', () => {
                const finalizeTx = generateSendMessage([
                    fillerInstruction,
                ], keys);

                expect(TransactionParsing.isSendTx('devnet', finalizeTx, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce))).to.be.false;
                const initTx = generateSendMessage([
                    fillerInstruction,
                ], keys);

                expect(TransactionParsing.isSendTx('devnet', initTx, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce))).to.be.false;
            });

            it('Correctly parses for wrongly ordered init and finalize tx', async () => {
                const initTx = generateSendMessage([
                    serializedInit,
                ], keys);

                const initSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 0,
                    err: null,
                    memo: null,
                };

                const finalizeTx = generateSendMessage([
                    serializedFinalize,
                ], keys);

                const finalizeSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 1,
                    err: null,
                    memo: null,
                };

                const parsedTx = await TransactionParsing.tryParseRawSend('devnet', [initTx, finalizeTx], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper());
                verifyProcessedSendTx(parsedTx!);
            });

            it('Throws for invalid init tx', () => {
                const invalidInitTx = generateSendMessage([
                    fillerInstruction,
                ], keys);

                const initSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 0,
                    err: null,
                    memo: null,
                };

                const finalizeTx = generateSendMessage([
                    serializedFinalize,
                ], keys);

                const finalizeSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 1,
                    err: null,
                    memo: null,
                };

                expect(TransactionParsing.tryParseRawSend('devnet', [invalidInitTx, finalizeTx], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper())).to.be.rejected;
            });

            it('Throws for invalid finalize tx', () => {
                const initTx = generateSendMessage([
                    serializedInit,
                ], keys);

                const initSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 0,
                    err: null,
                    memo: null,
                };

                const invalidFinalizeTx = generateSendMessage([
                    fillerInstruction,
                ], keys);

                const finalizeSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 1,
                    err: null,
                    memo: null,
                };

                expect(TransactionParsing.tryParseRawSend('devnet', [initTx, invalidFinalizeTx], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper())).to.be.rejected;
            });

            it('Throws for invalid init and finalize tx', () => {
                const invalidInitTx = generateSendMessage([
                    fillerInstruction,
                ], keys);

                const initSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 0,
                    err: null,
                    memo: null,
                };

                const invalidFinalizeTx = generateSendMessage([
                    fillerInstruction,
                ], keys);

                const finalizeSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 1,
                    err: null,
                    memo: null,
                };

                expect(TransactionParsing.tryParseRawSend('devnet', [invalidInitTx, invalidFinalizeTx], [initSig, finalizeSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper())).to.be.rejected;
            });

            it('Throws for missing init and finalize tx', () => {
                expect(TransactionParsing.tryParseRawSend('devnet', [], [], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper())).to.be.rejected;
            });

            it('Throws for too many txs', () => {
                const initTx = generateSendMessage([
                    serializedInit,
                ], keys);

                const initSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 0,
                    err: null,
                    memo: null,
                };

                const finalizeTx = generateSendMessage([
                    serializedFinalize,
                ], keys);

                const finalizeSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 1,
                    err: null,
                    memo: null,
                };

                const extraTx = generateSendMessage([
                    fillerInstruction,
                ], keys);

                const extraSig: ConfirmedSignatureInfo = {
                    signature: 'sig',
                    slot: 2,
                    err: null,
                    memo: null,
                };

                expect(TransactionParsing.tryParseRawSend('devnet', [initTx, finalizeTx, extraTx], [initSig, finalizeSig, extraSig], nonce, seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce), seedWrapper.getRootViewingKeyWrapper())).to.be.rejected;
            });
        });
    })))));
});

function generateSendMessage(instructions: MessageCompiledInstruction[], keys: PublicKey[]): ParsedMessage {
    return {
        accountKeys: keys.map(pubKeyToParsedMessageAcc),
        instructions: instructions.map((ix) => msgCompiledIxToPartiallyDecodedInstruction(ix, keys)),
        recentBlockhash: 'blockhash',
    };
}

function msgCompiledIxToPartiallyDecodedInstruction(ix: MessageCompiledInstruction, keys: PublicKey[]): PartiallyDecodedInstruction {
    return {
        programId: keys[ix.programIdIndex],
        accounts: ix.accountKeyIndexes.map((i) => keys[i]),
        data: bytesToBs58(ix.data),
    };
}

function pubKeyToParsedMessageAcc(key: PublicKey): ParsedMessageAccount {
    return {
        pubkey: key,
        writable: false,
        signer: false,
    };
}
