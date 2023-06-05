import { IncompleteCommitment, Poseidon, ReprScalar } from 'elusiv-cryptojs';
import {
    ConfirmedSignatureInfo, Keypair, Message, ParsedTransactionWithMeta, VersionedMessage, VersionedTransactionResponse,
} from '@solana/web3.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ResponseConverter } from '../../src/sdk/txManagers/ResponseConverter.js';
import { PartialStoreTx, StoreTx } from '../../src/sdk/transactions/StoreTx.js';
import { getNumberFromTokenType } from '../../src/public/tokenTypes/TokenTypeFuncs.js';
import { TransactionBuilding } from '../../src/sdk/transactions/txBuilding/TransactionBuilding.js';
import { FeeVersionData } from '../../src/sdk/paramManagers/fee/FeeManager.js';
import { SEND_ARITY } from '../../src/constants.js';
import { generateCPIsStore, generateSendTransaction } from '../helpers/txSimulatorHelpers.js';
import { PartialSendTx } from '../../src/sdk/transactions/SendTx.js';
import { SeedWrapper } from '../../src/sdk/clientCrypto/SeedWrapper.js';
import { NoncedTxResponse } from '../../src/sdk/txManagers/IdentifierTxFetcher.js';
import { EncryptedValue } from '../../src/sdk/clientCrypto/encryption.js';
import { Pair } from '../../src/sdk/utils/Pair.js';
import { messageToParsedTx } from '../utils.js';
import { TokenType } from '../../src/public/tokenTypes/TokenType.js';

// Need to import like this to get chai-as-promised to work
chai.use(chaiAsPromised);
const expect = chai.expect;

const MAX_UINT64 = BigInt('18446744073709551615');
const MAX_UINT32 = 4294967295;
const MAX_UINT20 = 1048575;

export const DUMMY_MESSAGE: VersionedMessage = new Message(
    {
        header: {
            numRequiredSignatures: -1,
            numReadonlySignedAccounts: -1,
            numReadonlyUnsignedAccounts: -1,
        },
        accountKeys: [],
        recentBlockhash: '',
        instructions: [],
    },
);

describe('ResponserConverter tests', () => {
    let response: NoncedTxResponse;

    const sig: ConfirmedSignatureInfo = {
        signature: '45sQP55ozawq6o39Kz2bWqrYjBuD4P3AsM8uic7qkp5SSGZNjt8ZbR915JuRew4vuGfqof9tfXtNNGaXqpbDQTzS',
        slot: -1,
        err: null,
        memo: null,
    };
    const tokenTypes: TokenType[] = [
        'LAMPORTS',
        'USDC',
    ];
    const sender = Keypair.fromSeed(new Uint8Array(32).fill(3)).publicKey;
    const warden = Keypair.fromSeed(new Uint8Array(32).fill(4)).publicKey;

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
    const commCounts = [
        1,
        SEND_ARITY,
    ];
    const sendFees = [
        BigInt(0),
        MAX_UINT64,
    ];

    const storeFees = [
        BigInt(0),
        MAX_UINT64,
    ];
    const commIndices = [
        0,
        MAX_UINT20,
    ];

    const roots = [
        new Uint8Array(32).fill(1),
        new Uint8Array(32).fill(2),
        new Uint8Array(32).fill(3),
        new Uint8Array(32).fill(4),
    ] as ReprScalar[];

    const nHashes = [
        new Uint8Array(32).fill(5),
        new Uint8Array(32).fill(6),
        new Uint8Array(32).fill(7),
        new Uint8Array(32).fill(8),
    ] as ReprScalar[];

    const commitmentHash = new Uint8Array(32).fill(9) as ReprScalar;

    const DUMMY_RESPONSE = messageToParsedTx(DUMMY_MESSAGE as Message);

    const DUMMY_SIG: ConfirmedSignatureInfo = {
        signature: 'DUMMY SIG',
        slot: -1,
        err: null,
        memo: null,
    };

    let seedWrapper: SeedWrapper;

    before(async () => {
        await Poseidon.setupPoseidon();
        seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5, 6]));
    });

    nonces.forEach((nonce) => {
        tokenTypes.forEach((tokenType) => {
            feeVersionDatas.forEach((feeVersionData) => {
                merkleStartIndexs.forEach((merkleStartIndex) => {
                    balances.forEach((balance) => {
                        commCounts.forEach((commitmentCount) => {
                            sendFees.forEach((fee) => {
                                commIndices.forEach((commIndex) => {
                                    describe(`Send tx with nonce ${nonce} and tokentype ${tokenType}, sender ${sender.toBase58()} and feeVersionData ${feeVersionData} and merkleStartIndex ${merkleStartIndex} and balance ${balance} and commitmentCount ${commitmentCount} and fee ${fee} and commIndex ${commIndex}`, () => {
                                        let expectedUnserializedSend: PartialSendTx;

                                        before(async () => {
                                            const encryptedOwner = await seedWrapper.getRootViewingKeyWrapper().encryptSeededSaltedAES256(sender.toBytes(), nonce);

                                            const sendTx = await generateSendTransaction(
                                                nonce,
                                                commitmentCount,
                                                roots,
                                                nHashes,
                                                commitmentHash,
                                                feeVersionData.feeVersion,
                                                balance,
                                                balance,
                                                fee,
                                                tokenType,
                                                merkleStartIndex,
                                                commIndex,
                                                encryptedOwner,
                                                sender,
                                                sender,
                                                warden,
                                                seedWrapper,
                                            );

                                            expectedUnserializedSend = sendTx.nonSerialized as PartialSendTx;
                                            expectedUnserializedSend.transactionStatus = 'PROCESSED';

                                            const initResponse: VersionedTransactionResponse = {
                                                slot: 0,
                                                transaction: {
                                                    signatures: [],
                                                    message: sendTx.serializedInit.compileMessage(),
                                                },
                                                meta: null,
                                            };

                                            const finalizeResponse: VersionedTransactionResponse = {
                                                slot: 1,
                                                transaction: {
                                                    signatures: [],
                                                    message: sendTx.serializedFinalize.compileMessage(),
                                                },
                                                meta: null,
                                            };

                                            const initSig: ConfirmedSignatureInfo = {
                                                ...sig,
                                                slot: 0,
                                            };

                                            const finalizeSig: ConfirmedSignatureInfo = {
                                                ...sig,
                                                slot: 1,
                                            };

                                            response = {
                                                txResponse: [
                                                    { fst: messageToParsedTx(finalizeResponse.transaction.message as Message), snd: finalizeSig },
                                                    { fst: messageToParsedTx(initResponse.transaction.message as Message), snd: initSig },
                                                ],
                                                nonce,
                                                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
                                            };
                                        });

                                        it('Correctly parses sendtx with dedicated func', async () => {
                                            const sendTx = await ResponseConverter['txResponseToSendTx'](seedWrapper.getRootViewingKeyWrapper(), 'devnet', response.nonce, response.idPubKey, response.txResponse);
                                            equalsSendTx(sendTx, expectedUnserializedSend);
                                        });

                                        it('Correctly parses sendtx with general func', async () => {
                                            const sendTx = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
                                            expect(sendTx.length).to.equal(1);
                                            equalsSendTx(sendTx[0] as PartialSendTx, expectedUnserializedSend);
                                            const sendTxConfirmed = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
                                            expectedUnserializedSend.transactionStatus = 'PROCESSED';
                                            expect(sendTxConfirmed.length).to.equal(1);
                                            equalsSendTx(sendTxConfirmed[0] as PartialSendTx, expectedUnserializedSend);
                                            expectedUnserializedSend.transactionStatus = undefined;
                                        });
                                    });
                                });
                            });
                        });
                        isRecipients.forEach((isRecipient) => {
                            storeFees.forEach((storeFee) => {
                                hashAccIndexs.forEach((hashAccIndex) => {
                                    describe(`Topup tx tests with nonce ${nonce} and tokentype ${tokenType}, isRecipient ${isRecipient} and balance ${balance} and merkleStartIndex ${merkleStartIndex} and hashAccIndex ${hashAccIndex} and sender ${sender.toBase58()}`, () => {
                                        let storeTx: StoreTx;
                                        before(async () => {
                                            const nullifier = seedWrapper.generateNullifier(nonce);
                                            const commitment = new IncompleteCommitment(
                                                nullifier,
                                                balance,
                                                BigInt(getNumberFromTokenType(tokenType)),
                                                BigInt(merkleStartIndex),
                                                Poseidon.getPoseidon(),
                                            );

                                            storeTx = {
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
                                                fee: storeFee,
                                                transactionStatus: 'PENDING',
                                            };

                                            const rawTopup = await TransactionBuilding['buildRawTopupTransaction'](
                                                storeTx,
                                                seedWrapper.getRootViewingKeyWrapper(),
                                                'devnet',
                                                feeVersionData,
                                                {
                                                    blockhash: '42xqHqEiZKNSozcXCN7YR8xW3TL6wwbbZbaMQMp93icH',
                                                    lastValidBlockHeight: 10,
                                                },
                                            );

                                            const topupTxMessage = rawTopup.compileMessage();

                                            const cpis = generateCPIsStore(storeFee, tokenType);

                                            const txResponseBe: ParsedTransactionWithMeta = messageToParsedTx(topupTxMessage, cpis);
                                            response = {
                                                txResponse: [{ fst: txResponseBe, snd: sig }],
                                                nonce,
                                                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
                                            };
                                        });

                                        describe('Correctly converts a store tx Reponse to a StoreTx', () => {
                                            it('Correctly parses with general conversion func', async () => {
                                                const real = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
                                                expect(real.length).to.equal(1);
                                                equalsStoreTx(real[0] as PartialStoreTx, storeTx);
                                            });

                                            it('Correctly parses the commitment', () => {
                                                const expectedCommitment = new IncompleteCommitment(
                                                    seedWrapper.generateNullifier(nonce),
                                                    balance,
                                                    BigInt(getNumberFromTokenType(tokenType)),
                                                    BigInt(merkleStartIndex),
                                                    Poseidon.getPoseidon(),
                                                );

                                                const realCommitment = new IncompleteCommitment(
                                                    seedWrapper.generateNullifier(storeTx.nonce),
                                                    storeTx.amount,
                                                    BigInt(getNumberFromTokenType(storeTx.tokenType)),
                                                    BigInt(merkleStartIndex),
                                                    Poseidon.getPoseidon(),
                                                );

                                                expect(realCommitment.equals(expectedCommitment)).to.true;
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('Extra tx responses mixed into send tests', async () => {
        const nonce = 1;
        let encryptedOwner: EncryptedValue;
        let initRes: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo>;
        let finalizeRes: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo>;
        const DUMMY_RES: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo> = { fst: DUMMY_RESPONSE, snd: DUMMY_SIG };
        let expectedUnserializedSend: PartialSendTx;

        before(async () => {
            encryptedOwner = await seedWrapper.getRootViewingKeyWrapper().encryptSeededSaltedAES256(sender.toBytes(), nonce);
            const sendTx = await generateSendTransaction(
                nonce,
                4,
                roots,
                nHashes,
                commitmentHash,
                5,
                BigInt(600_000),
                BigInt(700_000),
                BigInt(100_000),
                'LAMPORTS',
                10,
                11,
                encryptedOwner,
                sender,
                sender,
                warden,
                seedWrapper,
            );

            expectedUnserializedSend = sendTx.nonSerialized as PartialSendTx;
            expectedUnserializedSend.transactionStatus = 'PROCESSED';

            const initResponse = messageToParsedTx(sendTx.serializedInit.compileMessage());
            const finalizeResponse = messageToParsedTx(sendTx.serializedFinalize.compileMessage());
            const initSig: ConfirmedSignatureInfo = {
                ...sig,
                slot: 0,
            };
            const finalizeSig: ConfirmedSignatureInfo = {
                ...sig,
                slot: 1,
            };

            finalizeRes = { fst: finalizeResponse, snd: finalizeSig };
            initRes = { fst: initResponse, snd: initSig };
        });

        it('Correctly parses sendtx with extra non-elusiv responses mixed-in', async () => {
            response = {
                txResponse: [
                    finalizeRes,
                    DUMMY_RES,
                    initRes,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };

            const sendTx = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(sendTx.length).to.equal(1);
            equalsSendTx(sendTx[0] as PartialSendTx, expectedUnserializedSend);
        });

        it('Correctly parses sendtx with multiple non-elusiv responses mixed-in', async () => {
            response = {
                txResponse: [
                    DUMMY_RES,
                    DUMMY_RES,
                    finalizeRes,
                    DUMMY_RES,
                    initRes,
                    DUMMY_RES,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };

            const sendTx = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(sendTx.length).to.equal(1);
            equalsSendTx(sendTx[0] as PartialSendTx, expectedUnserializedSend);
        });

        it('Correctly parses sendtx with multiple non-elusiv responses and only initTx mixed-in', async () => {
            response = {
                txResponse: [
                    DUMMY_RES,
                    initRes,
                    DUMMY_RES,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };

            const sendTx = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(sendTx.length).to.equal(1);
            equalsSendTx(sendTx[0] as PartialSendTx, { ...expectedUnserializedSend, transactionStatus: 'PENDING' }, true);
        });

        it('Throws error if no initTx is found', async () => {
            response = {
                txResponse: [
                    DUMMY_RES,
                    DUMMY_RES,
                    finalizeRes,
                    DUMMY_RES,
                    DUMMY_RES,
                    DUMMY_RES,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };

            await expect(ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response)).to.be.rejectedWith('Failed to find init tx for identifier 3sUn86kqU78WrTJSZjbHXiHmq5UDWGtZBBTDg2TuJ48P');
        });

        it('Throws error if no send ixs are found', async () => {
            response = {
                txResponse: [
                    DUMMY_RES,
                    DUMMY_RES,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };

            await expect(ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response)).to.be.rejectedWith('Invalid transaction type');
        });
    });

    describe('Extra tx responses mixed into store tests', async () => {
        const nonce = 1;
        let storeRes: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo>;
        const DUMMY_RES: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo> = { fst: DUMMY_RESPONSE, snd: DUMMY_SIG };
        let expectedUnserializedStore: StoreTx;

        before(async () => {
            const nullifier = seedWrapper.generateNullifier(nonce);
            const commitment = new IncompleteCommitment(
                nullifier,
                BigInt(1),
                BigInt(getNumberFromTokenType('LAMPORTS')),
                BigInt(3),
                Poseidon.getPoseidon(),
            );

            expectedUnserializedStore = {
                nonce,
                txType: 'TOPUP',
                tokenType: 'LAMPORTS',
                amount: commitment.getBalance(),
                commitment,
                commitmentHash: commitment.getCommitmentHash(),
                isRecipient: false,
                sender,
                parsedPrivateBalance: commitment.getBalance(),
                merkleStartIndex: 3,
                hashAccIndex: 4,
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
                warden,
                fee: storeFees[0],
                transactionStatus: 'PENDING',
            };

            const rawTopup = await TransactionBuilding['buildRawTopupTransaction'](
                expectedUnserializedStore,
                seedWrapper.getRootViewingKeyWrapper(),
                'devnet',
                feeVersionDatas[0],
                {
                    blockhash: '42xqHqEiZKNSozcXCN7YR8xW3TL6wwbbZbaMQMp93icH',
                    lastValidBlockHeight: 10,
                },
            );

            const topupTxMessage = rawTopup.compileMessage();

            const cpis = generateCPIsStore(storeFees[0], 'LAMPORTS');

            const txResponseBe = messageToParsedTx(topupTxMessage, cpis);
            storeRes = { fst: txResponseBe, snd: sig };
        });

        it('Correctly parses storeTx with extra non-elusiv responses mixed-in', async () => {
            response = {
                txResponse: [
                    storeRes,
                    DUMMY_RES,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };

            const storeTx = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(storeTx.length).to.equal(1);
            equalsStoreTx(storeTx[0] as PartialStoreTx, expectedUnserializedStore);
        });

        it('Correctly parses sendtx with multiple non-elusiv responses mixed-in', async () => {
            response = {
                txResponse: [
                    DUMMY_RES,
                    storeRes,
                    DUMMY_RES,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };

            const storeTx = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(storeTx.length).to.equal(1);
            equalsStoreTx(storeTx[0] as PartialStoreTx, expectedUnserializedStore);
        });

        it('Throws error if no store ixs are found', async () => {
            response = {
                txResponse: [
                    DUMMY_RES,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };

            await expect(ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response)).to.be.rejectedWith('Invalid transaction type');
        });
    });

    describe('Multiple elusiv tx responses tests', async () => {
        const nonce = 1;
        const sendAmount = BigInt(1_000_000);
        const storeAmount = BigInt(2_000_000);
        let encryptedOwner: EncryptedValue;
        let initRes: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo>;
        let finalizeRes: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo>;
        const DUMMY_RES: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo> = { fst: DUMMY_RESPONSE, snd: DUMMY_SIG };
        let expectedUnserializedSend: PartialSendTx;
        let storeRes: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo>;
        let expectedUnserializedStore: StoreTx;

        before(async () => {
            // Build store tx
            const nullifier = seedWrapper.generateNullifier(nonce);
            const commitment = new IncompleteCommitment(
                nullifier,
                storeAmount,
                BigInt(getNumberFromTokenType('LAMPORTS')),
                BigInt(3),
                Poseidon.getPoseidon(),
            );

            expectedUnserializedStore = {
                nonce,
                txType: 'TOPUP',
                tokenType: 'LAMPORTS',
                amount: commitment.getBalance(),
                commitment,
                commitmentHash: commitment.getCommitmentHash(),
                isRecipient: false,
                sender,
                parsedPrivateBalance: commitment.getBalance(),
                merkleStartIndex: 3,
                hashAccIndex: 4,
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
                warden,
                fee: storeFees[0],
                transactionStatus: 'PENDING',
            };
            const rawTopup = await TransactionBuilding['buildRawTopupTransaction'](
                expectedUnserializedStore,
                seedWrapper.getRootViewingKeyWrapper(),
                'devnet',
                feeVersionDatas[0],
                {
                    blockhash: '42xqHqEiZKNSozcXCN7YR8xW3TL6wwbbZbaMQMp93icH',
                    lastValidBlockHeight: 10,
                },
            );

            const topupTxMessage = rawTopup.compileMessage();
            const cpis = generateCPIsStore(storeFees[0], 'LAMPORTS');
            const txResponseBe = messageToParsedTx(topupTxMessage, cpis);
            storeRes = { fst: txResponseBe, snd: sig };

            // Build send tx
            encryptedOwner = await seedWrapper.getRootViewingKeyWrapper().encryptSeededSaltedAES256(sender.toBytes(), nonce);
            const sendTx = await generateSendTransaction(
                nonce,
                4,
                roots,
                nHashes,
                commitmentHash,
                5,
                sendAmount,
                BigInt(700_000),
                BigInt(100_000),
                'LAMPORTS',
                10,
                11,
                encryptedOwner,
                sender,
                sender,
                warden,
                seedWrapper,
            );
            expectedUnserializedSend = sendTx.nonSerialized as PartialSendTx;
            expectedUnserializedSend.transactionStatus = 'PROCESSED';
            const initResponse = messageToParsedTx(sendTx.serializedInit.compileMessage() as Message);
            const finalizeResponse = messageToParsedTx(sendTx.serializedFinalize.compileMessage() as Message);
            const initSig: ConfirmedSignatureInfo = {
                ...sig,
                slot: 0,
            };
            const finalizeSig: ConfirmedSignatureInfo = {
                ...sig,
                slot: 1,
            };
            finalizeRes = { fst: finalizeResponse, snd: finalizeSig };
            initRes = { fst: initResponse, snd: initSig };
        });

        it('Correctly parses one sendtx followed by one store tx', async () => {
            response = {
                txResponse: [
                    storeRes,
                    finalizeRes,
                    initRes,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };
            const res = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(res.length).to.equal(2);
            equalsStoreTx(res[0] as StoreTx, expectedUnserializedStore);
            equalsSendTx(res[1] as PartialSendTx, expectedUnserializedSend);
        });

        it('Correctly parses one store tx followed by one send tx', async () => {
            response = {
                txResponse: [
                    finalizeRes,
                    initRes,
                    storeRes,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };
            const res = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(res.length).to.equal(2);
            equalsSendTx(res[0] as PartialSendTx, expectedUnserializedSend);
            equalsStoreTx(res[1] as StoreTx, expectedUnserializedStore);
        });

        it('Correctly parses one store tx followed by another store tx', async () => {
            response = {
                txResponse: [
                    storeRes,
                    storeRes,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };
            const res = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(res.length).to.equal(2);
            equalsStoreTx(res[0] as StoreTx, expectedUnserializedStore);
            equalsStoreTx(res[1] as StoreTx, expectedUnserializedStore);
        });

        it('Correctly parses one store tx followed by another store tx', async () => {
            response = {
                txResponse: [
                    finalizeRes,
                    initRes,
                    finalizeRes,
                    initRes,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };
            const res = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(res.length).to.equal(2);
            equalsSendTx(res[0] as PartialSendTx, expectedUnserializedSend);
            equalsSendTx(res[1] as PartialSendTx, expectedUnserializedSend);
        });

        it('Correctly parses store txs alternating with send txs', async () => {
            response = {
                txResponse: [
                    storeRes,
                    finalizeRes,
                    initRes,
                    storeRes,
                    finalizeRes,
                    storeRes,
                    initRes,
                    storeRes,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };
            const res = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(res.length).to.equal(6);
            equalsStoreTx(res[0] as StoreTx, expectedUnserializedStore);
            equalsSendTx(res[1] as PartialSendTx, expectedUnserializedSend);
            equalsStoreTx(res[2] as StoreTx, expectedUnserializedStore);
            equalsSendTx(res[3] as PartialSendTx, expectedUnserializedSend);
            equalsStoreTx(res[4] as StoreTx, expectedUnserializedStore);
            equalsStoreTx(res[5] as StoreTx, expectedUnserializedStore);
        });

        it('Correctly parses store txs alternating with send txs 2', async () => {
            response = {
                txResponse: [
                    finalizeRes,
                    initRes,
                    storeRes,
                    finalizeRes,
                    storeRes,
                    initRes,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };
            const res = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(res.length).to.equal(4);
            equalsSendTx(res[0] as PartialSendTx, expectedUnserializedSend);
            equalsStoreTx(res[1] as StoreTx, expectedUnserializedStore);
            equalsSendTx(res[2] as PartialSendTx, expectedUnserializedSend);
            equalsStoreTx(res[3] as StoreTx, expectedUnserializedStore);
        });

        it('Correctly parses store txs alternating with send txs and mixed in with other txs', async () => {
            response = {
                txResponse: [
                    DUMMY_RES,
                    storeRes,
                    DUMMY_RES,
                    finalizeRes,
                    DUMMY_RES,
                    initRes,
                    DUMMY_RES,
                    DUMMY_RES,
                    storeRes,
                    DUMMY_RES,
                    finalizeRes,
                    DUMMY_RES,
                    storeRes,
                    DUMMY_RES,
                    initRes,
                    DUMMY_RES,
                    storeRes,
                    DUMMY_RES,
                    DUMMY_RES,
                ],
                nonce,
                idPubKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
            };
            const res = await ResponseConverter.txResponseToElusivTxs(seedWrapper.getRootViewingKeyWrapper(), 'devnet', response);
            expect(res.length).to.equal(6);
            equalsStoreTx(res[0] as StoreTx, expectedUnserializedStore);
            equalsSendTx(res[1] as PartialSendTx, expectedUnserializedSend);
            equalsStoreTx(res[2] as StoreTx, expectedUnserializedStore);
            equalsSendTx(res[3] as PartialSendTx, expectedUnserializedSend);
            equalsStoreTx(res[4] as StoreTx, expectedUnserializedStore);
            equalsStoreTx(res[5] as StoreTx, expectedUnserializedStore);
        });
    });
});

function equalsSendTx(a: PartialSendTx | undefined, b: PartialSendTx | undefined, justInit = false): void {
    if (a === undefined || b === undefined) {
        expect(a).to.be.undefined;
        expect(b).to.be.undefined;
    }
    else {
        // If the finalize is only initialized but not finalized these fields don't exist yet
        if (!justInit) {
            expect(a.encryptedOwner).to.deep.equal(b.encryptedOwner);
        }
        expect(a.nonce).to.equal(b.nonce);
        expect(a.txType).to.equal(b.txType);
        expect(a.tokenType).to.equal(b.tokenType);
        expect(a.amount).to.deep.equal(b.amount);
        expect(a.fee).to.deep.equal(b.fee);
        expect(a.isAssociatedTokenAcc).to.deep.equal(b.isAssociatedTokenAcc);
        expect(a.transactionStatus).equal(b.transactionStatus);
    }
}

function equalsStoreTx(a: PartialStoreTx | undefined, b: PartialStoreTx | undefined): void {
    if (a === undefined || b === undefined) {
        expect(a).to.be.undefined;
        expect(b).to.be.undefined;
    }
    else {
        // If the finalize is only initialized but not finalized these fields don't exist yet
        expect(a.nonce).to.equal(b.nonce);
        expect(a.txType).to.equal(b.txType);
        expect(a.tokenType).to.equal(b.tokenType);
        expect(a.amount).to.deep.equal(b.amount);
        expect(a.fee).to.deep.equal(b.tokenType === 'LAMPORTS' ? BigInt(Number(b.fee)) : b.fee);
        expect(a.transactionStatus).equal(b.transactionStatus);
        expect(a.sender).deep.equals(b.sender);
        expect(a.parsedPrivateBalance).deep.equals(b.parsedPrivateBalance);
        expect(a.merkleStartIndex).deep.equals(b.merkleStartIndex);
        expect(a.hashAccIndex).deep.equals(b.hashAccIndex);
        expect(a.isRecipient).deep.equals(b.isRecipient);
    }
}
