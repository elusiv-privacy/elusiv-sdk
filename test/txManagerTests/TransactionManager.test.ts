import {
    ConfirmedSignatureInfo,
    Connection, Keypair, LAMPORTS_PER_SOL, ParsedTransactionWithMeta, PublicKey, SystemProgram,
} from '@solana/web3.js';
import { expect } from 'chai';
import { Poseidon, ReprScalar } from 'elusiv-cryptojs';
import { TxTypes } from '../../src/public/TxTypes';
import { EncryptedValue } from '../../src/sdk/clientCrypto/encryption.js';
import { SeedWrapper } from '../../src/sdk/clientCrypto/SeedWrapper.js';
import { TokenType } from '../../src/public/tokenTypes/TokenType.js';
import { ElusivTransaction } from '../../src/sdk/transactions/ElusivTransaction.js';
import { PartialSendTx } from '../../src/sdk/transactions/SendTx.js';
import { PartialStoreTx } from '../../src/sdk/transactions/StoreTx.js';
import { TransactionManager } from '../../src/sdk/txManagers/TransactionManager.js';
import { Pair } from '../../src/sdk/utils/Pair.js';
import { TxHistoryConnectionDriver } from '../helpers/drivers/TxHistoryConnectionDriver.js';
import { generateTxHistory } from '../helpers/txSimulatorHelpers.js';
import { Fee } from '../../src/public/Fee';
import { isTruthy } from '../../src/sdk/utils/utils';

describe('TransactionManager tests', () => {
    let seedWrapper: SeedWrapper;
    before(async () => {
        await Poseidon.setupPoseidon();
        seedWrapper = new SeedWrapper(new Uint8Array([1, 2, 3, 4, 5]));
    });

    describe('Dynamic method tests', () => {
        const storeFee: Fee = {
            txFee: 500_000, privacyFee: 100_000, tokenType: 'LAMPORTS', lamportsPerToken: 1, tokenAccRent: 0, extraFee: 0,
        };
        const sender = Keypair.fromSeed(new Uint8Array(32).fill(1)).publicKey;
        const warden = Keypair.fromSeed(new Uint8Array(32).fill(2)).publicKey;
        const historyLengths = [
            1,
            100,
            279,
            // 1000,
        ];
        const startNonces = [
            0,
            5,
        ];

        const tokenPrices: Pair<TokenType, number>[][] = [
            [
                { fst: 'LAMPORTS', snd: 1 / LAMPORTS_PER_SOL },
            ],
            [
                { fst: 'LAMPORTS', snd: 1 / LAMPORTS_PER_SOL },
                // Down bad
                { fst: 'USDC', snd: 1 / 10 },
            ],
        ];

        describe('Fetch most recent tx tests', () => {
            it('Correctly fetches most recent tx for empty history', async () => {
                const connection = new TxHistoryConnectionDriver();
                const txManager = TransactionManager.createTxManager(connection as unknown as Connection, 'devnet', seedWrapper.getRootViewingKeyWrapper());
                const tx = await txManager.getMostRecentTx();
                expect(tx).to.equal(undefined);
            });
            it('Correctly fetches most recent tx for non-empty history', async () => {
                const connection = new TxHistoryConnectionDriver();
                const txs = await generateParsedTxHistory(0, 5, storeFee, tokenPrices[0], sender, warden, seedWrapper, undefined, undefined, BigInt(LAMPORTS_PER_SOL));
                for (const tx of txs) {
                    connection.addNewTxs(tx.id, tx.tx);
                }
                const txManager = TransactionManager.createTxManager(connection as unknown as Connection, 'devnet', seedWrapper.getRootViewingKeyWrapper());
                const tx = await txManager.getMostRecentTx();
                expect(tx).to.not.equal(undefined);
                expect(tx?.nonce).to.equal(4);
            });
        });

        describe('Empty history tests', () => {
            let txManager: TransactionManager;

            before(async function () {
                this.timeout(10000);
                const res = await generateTxHistoryTxManager(0, 0, storeFee, tokenPrices[0], sender, warden, seedWrapper);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                txManager = TransactionManager.createTxManager(res.connection as unknown as Connection, 'devnet', seedWrapper.getRootViewingKeyWrapper());
            });

            it('Correctly fetches private balance', async () => {
                expect(await txManager.getPrivateBalanceFromTxHistory('LAMPORTS')).to.equal(BigInt(0));
                expect(await txManager.getPrivateBalanceFromMetadata('LAMPORTS')).to.equal(BigInt(0));
            });

            it('Correctly fetches txs', async () => {
                expect(await txManager.fetchTxs(10)).to.deep.equal([]);
            });
        });

        tokenPrices.forEach((tokenPrice) => {
            startNonces.forEach((START_NONCE) => {
                historyLengths.forEach((HISTORY_LENGTH) => {
                    const endNonce = START_NONCE + HISTORY_LENGTH - 1;
                    let txManager: TransactionManager;
                    let connection: Connection;
                    const counts = [
                        HISTORY_LENGTH - 5,
                        HISTORY_LENGTH,
                        HISTORY_LENGTH + 5,
                    ];
                    const tokenTypes: (TokenType | undefined)[] = [
                        undefined,
                        'LAMPORTS',
                        'USDC',
                    ];
                    const befores = [
                        undefined,
                        endNonce - 1,
                        endNonce,
                        endNonce + 1,
                    ];

                    describe(`Topup transaction history of length = ${HISTORY_LENGTH} and start nonce ${START_NONCE}`, () => {
                        let txs: PartialStoreTx[];

                        // eslint-disable-next-line prefer-arrow-callback
                        before(async function () {
                            this.timeout(4000);
                            const res = await generateTxHistoryTxManager(START_NONCE, HISTORY_LENGTH, storeFee, tokenPrice, sender, warden, seedWrapper, undefined, ['TOPUP'], BigInt(LAMPORTS_PER_SOL));

                            txs = res.txs as PartialStoreTx[];
                            connection = res.connection as unknown as Connection;
                        });

                        beforeEach(() => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            txManager = TransactionManager.createTxManager(connection, 'devnet', seedWrapper.getRootViewingKeyWrapper());
                        });

                        tokenTypes.forEach((tokenType) => {
                            if (tokenType !== undefined) {
                                it(`Correctly fetches latest private balance for tokenType ${tokenType}`, async () => {
                                    const realBalanceSlow = await txManager.getPrivateBalanceFromTxHistory(tokenType);
                                    const realBalanceFast = await txManager.getPrivateBalanceFromMetadata(tokenType);
                                    const expectedBalance = txs.filter((tx) => tx.tokenType === tokenType).reduce((amount, tx) => amount + tx.amount, BigInt(0));
                                    const latestNonce = HISTORY_LENGTH === 0 ? -1 : endNonce;
                                    const realBalanceSlow2 = await txManager.getPrivateBalanceFromTxHistory(tokenType, latestNonce + 1);
                                    const realBalanceFast2 = await txManager.getPrivateBalanceFromMetadata(tokenType, latestNonce + 1);

                                    expect(realBalanceSlow).to.equal(expectedBalance);
                                    expect(realBalanceFast).to.equal(expectedBalance);
                                    expect(realBalanceSlow2).to.equal(expectedBalance);
                                    expect(realBalanceFast2).to.equal(expectedBalance);
                                });

                                it(`Correctly fetches latest private balance for tokenType ${tokenType} at latestNonce - 1`, async () => {
                                    const latestNonce = HISTORY_LENGTH === 0 ? -1 : endNonce;
                                    const before = latestNonce - 1;
                                    const realBalanceSlow = await txManager.getPrivateBalanceFromTxHistory(tokenType, before);
                                    const realBalanceFast = await txManager.getPrivateBalanceFromMetadata(tokenType, before);
                                    const expectedBalance = txs.filter((tx) => tx.tokenType === tokenType && tx.nonce < before).reduce((amount, tx) => amount + tx.amount, BigInt(0));

                                    expect(realBalanceSlow).to.equal(expectedBalance);
                                    expect(realBalanceFast).to.equal(expectedBalance);
                                });

                                it(`Correctly fetches latest private balance for tokenType ${tokenType} at latestNonce /2 `, async () => {
                                    const latestNonce = HISTORY_LENGTH === 0 ? -1 : endNonce;
                                    const before = Math.floor(latestNonce / 2);
                                    const realBalanceSlow = await txManager.getPrivateBalanceFromTxHistory(tokenType, before, 100);
                                    const realBalanceFast = await txManager.getPrivateBalanceFromMetadata(tokenType, before, 100);
                                    const expectedBalance = txs.filter((tx) => tx.tokenType === tokenType && tx.nonce < before).reduce((amount, tx) => amount + tx.amount, BigInt(0));

                                    expect(realBalanceSlow).to.equal(expectedBalance);
                                    expect(realBalanceFast).to.equal(expectedBalance);
                                });

                                it(`Correctly fetches latest private balance for tokenType ${tokenType} at minNonce + 1 `, async () => {
                                    const before = START_NONCE + 1;
                                    const realBalanceSlow = await txManager.getPrivateBalanceFromTxHistory(tokenType, before);
                                    const realBalanceFast = await txManager.getPrivateBalanceFromMetadata(tokenType, before);
                                    const expectedBalance = txs.filter((tx) => tx.tokenType === tokenType && tx.nonce < before).reduce((amount, tx) => amount + tx.amount, BigInt(0));

                                    expect(realBalanceSlow).to.equal(expectedBalance);
                                    expect(realBalanceFast).to.equal(expectedBalance);
                                });
                            }

                            befores.forEach((before) => {
                                it(`Correctly fetches part of the transactions first and then fetches the rest with tokentype ${tokenType} and before ${before}`, async () => {
                                    const firstFetchCount = Math.floor(HISTORY_LENGTH / 2);
                                    const realRes = await txManager.fetchTxs(firstFetchCount, tokenType, before);
                                    if (before !== undefined && before < 0) {
                                        expect(realRes.length).to.equal(0);
                                        return;
                                    }

                                    // Remove potential leading undefined values at the front of the array and then pad to the correct length
                                    // after filtering out the txs that don't match the tokenType and before
                                    const expected = txs.filter(isTruthy).filter((tx) => (before === undefined || tx.nonce < before) && (tokenType === undefined || tx.tokenType === tokenType)).slice(0, realRes.length);

                                    for (let i = 0; i < realRes.length; i++) {
                                        equalsStoreTx(realRes[i] as PartialStoreTx, expected[i]);
                                    }

                                    const secondFetchCount = HISTORY_LENGTH;

                                    const realRes2 = await txManager.fetchTxs(secondFetchCount, tokenType, before);
                                    // Remove potential leading undefined values at the front of the array and then pad to the correct length
                                    // after filtering out the txs that don't match the tokenType and before
                                    const expected2 = txs.filter(isTruthy).filter((tx) => (before === undefined || tx.nonce < before) && (tokenType === undefined || tx.tokenType === tokenType)).slice(0, realRes2.length);

                                    for (let i = 0; i < realRes.length; i++) {
                                        equalsStoreTx(realRes2[i] as PartialStoreTx, expected2[i]);
                                    }
                                });
                                counts.forEach((count) => {
                                    it(`Correctly fetches transactions with count = ${count} and tokentype = ${tokenType} and before ${before}`, async () => {
                                        const realRes = await txManager.fetchTxs(count, tokenType, before);
                                        if (count < 0 || (before !== undefined && before < 0)) {
                                            expect(realRes.length).to.equal(0);
                                            return;
                                        }

                                        // Remove potential leading undefined values at the front of the array and then pad to the correct length
                                        // after filtering out the txs that don't match the tokenType and before
                                        const expected = txs.filter(isTruthy).filter((tx) => (before === undefined || tx.nonce < before) && (tokenType === undefined || tx.tokenType === tokenType)).slice(0, count);

                                        expect(realRes.length).to.equal(expected.length);

                                        for (let i = 0; i < realRes.length; i++) {
                                            equalsStoreTx(realRes[i] as PartialStoreTx, expected[i]);
                                        }
                                    });
                                });
                            });
                        });
                    });

                    describe(`Send & Topup transaction history of length = ${HISTORY_LENGTH} and start nonce ${START_NONCE}`, () => {
                        let txs: ElusivTransaction[];
                        const STARTING_PRIVATE_BALANCE = BigInt(50 * LAMPORTS_PER_SOL);

                        before(async function () {
                            this.timeout(10000);
                            const res = await generateTxHistoryTxManager(
                                START_NONCE,
                                HISTORY_LENGTH,
                                storeFee,
                                tokenPrice,
                                sender,
                                warden,
                                seedWrapper,
                                undefined,
                                ['TOPUP', 'SEND'],
                                STARTING_PRIVATE_BALANCE,
                            );

                            txs = res.txs;
                            connection = res.connection as unknown as Connection;
                        });

                        beforeEach(() => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            txManager = TransactionManager.createTxManager(connection, 'devnet', seedWrapper.getRootViewingKeyWrapper());
                        });

                        tokenTypes.forEach((tokenType) => {
                            if (tokenType !== undefined) {
                                it(`Correctly fetches latest private balance for tokenType ${tokenType}`, async () => {
                                    const realBalanceSlow = await txManager.getPrivateBalanceFromTxHistory(tokenType);
                                    const realBalanceFast = await txManager.getPrivateBalanceFromMetadata(tokenType);
                                    const filteredTx = txs.filter((tx) => tx.tokenType === tokenType);
                                    const expectedBalance = filteredTx.length === 0 ? BigInt(0) : filteredTx.reduce((amount, tx) => {
                                        if (tx.txType === 'TOPUP') {
                                            return amount + (tx as PartialStoreTx).amount;
                                        }
                                        return amount - (tx as PartialSendTx).amount - (tx as PartialSendTx).fee;
                                    }, BigInt(0));
                                    const latestNonce = HISTORY_LENGTH === 0 ? -1 : endNonce;
                                    const realBalanceSlow2 = await txManager.getPrivateBalanceFromTxHistory(tokenType, latestNonce + 1);
                                    const realBalanceFast2 = await txManager.getPrivateBalanceFromMetadata(tokenType, latestNonce + 1);

                                    expect(realBalanceSlow).to.equal(expectedBalance);
                                    expect(realBalanceFast).to.equal(expectedBalance);
                                    expect(realBalanceSlow2).to.equal(expectedBalance);
                                    expect(realBalanceFast2).to.equal(expectedBalance);
                                });

                                it(`Correctly fetches latest private balance for tokenType ${tokenType} at latestNonce - 1`, async () => {
                                    const latestNonce = HISTORY_LENGTH === 0 ? -1 : endNonce;
                                    const before = latestNonce - 1;
                                    const realBalanceSlow = await txManager.getPrivateBalanceFromTxHistory(tokenType, before, 100);
                                    const realBalanceFast = await txManager.getPrivateBalanceFromMetadata(tokenType, before, 100);
                                    const filteredTx = txs.filter((tx) => tx.tokenType === tokenType && tx.nonce < before);
                                    const expectedBalance = filteredTx.length === 0 ? BigInt(0) : filteredTx.reduce((amount, tx) => {
                                        if (tx.txType === 'TOPUP') {
                                            return amount + (tx as PartialStoreTx).amount;
                                        }
                                        return amount - (tx as PartialSendTx).amount - (tx as PartialSendTx).fee;
                                    }, BigInt(0));

                                    expect(realBalanceSlow).to.equal(expectedBalance);
                                    expect(realBalanceFast).to.equal(expectedBalance);
                                });

                                it(`Correctly fetches latest private balance for tokenType ${tokenType} at latestNonce /2 `, async () => {
                                    const latestNonce = HISTORY_LENGTH === 0 ? -1 : endNonce;
                                    const before = Math.floor(latestNonce / 2);
                                    const realBalanceSlow = await txManager.getPrivateBalanceFromTxHistory(tokenType, before, 100);
                                    const realBalanceFast = await txManager.getPrivateBalanceFromMetadata(tokenType, before, 100);
                                    const filteredTx = txs.filter((tx) => tx.tokenType === tokenType && tx.nonce < before);
                                    const expectedBalance = filteredTx.length === 0 ? BigInt(0) : filteredTx.reduce((amount, tx) => {
                                        if (tx.txType === 'TOPUP') {
                                            return amount + (tx as PartialStoreTx).amount;
                                        }
                                        return amount - (tx as PartialSendTx).amount - (tx as PartialSendTx).fee;
                                    }, BigInt(0));

                                    expect(realBalanceSlow).to.equal(expectedBalance);
                                    expect(realBalanceFast).to.equal(expectedBalance);
                                });

                                it(`Correctly fetches latest private balance for tokenType ${tokenType} at minNonce + 1 (i.e. before ${START_NONCE + 1}) `, async () => {
                                    const before = START_NONCE + 1;
                                    const realBalanceSlow = await txManager.getPrivateBalanceFromTxHistory(tokenType, before, 100);
                                    const realBalanceFast = await txManager.getPrivateBalanceFromMetadata(tokenType, before, 100);
                                    const filteredTx = txs.filter((tx) => tx.tokenType === tokenType && tx.nonce < before);
                                    const expectedBalance = filteredTx.length === 0 ? BigInt(0) : filteredTx.reduce((amount, tx) => {
                                        if (tx.txType === 'TOPUP') {
                                            return amount + (tx as PartialStoreTx).amount;
                                        }
                                        return amount - (tx as PartialSendTx).amount - (tx as PartialSendTx).fee;
                                    }, BigInt(0));

                                    expect(realBalanceSlow).to.equal(expectedBalance);
                                    expect(realBalanceFast).to.equal(expectedBalance);
                                });
                            }

                            befores.forEach((before) => {
                                it(`Correctly fetches part of the transactions first and then fetches the rest with tokentype ${tokenType} and before ${before}`, async () => {
                                    const firstFetchCount = Math.floor(HISTORY_LENGTH / 2);
                                    const realRes = await txManager.fetchTxs(firstFetchCount, tokenType, before);
                                    if (before !== undefined && before < 0) {
                                        expect(realRes.length).to.equal(0);
                                        return;
                                    }

                                    // Remove potential leading undefined values at the front of the array and then pad to the correct length
                                    // after filtering out the txs that don't match the tokenType and before
                                    const expected = txs.filter(isTruthy).filter((tx) => (before === undefined || tx.nonce < before) && (tokenType === undefined || tx.tokenType === tokenType)).slice(0, realRes.length);

                                    expect(realRes.length).to.equal(expected.length);

                                    for (let i = 0; i < realRes.length; i++) {
                                        if (realRes[i]?.txType === 'TOPUP') {
                                            equalsStoreTx(realRes[i] as PartialStoreTx, expected[i] as PartialStoreTx);
                                        }
                                        else {
                                            equalsSendTx(realRes[i] as PartialSendTx, expected[i] as PartialSendTx);
                                        }
                                    }

                                    const secondFetchCount = HISTORY_LENGTH;

                                    const realRes2 = await txManager.fetchTxs(secondFetchCount, tokenType, before);
                                    // Remove potential leading undefined values at the front of the array and then pad to the correct length
                                    // after filtering out the txs that don't match the tokenType and before
                                    const expected2 = txs.filter(isTruthy).filter((tx) => (before === undefined || tx.nonce < before) && (tokenType === undefined || tx.tokenType === tokenType)).slice(0, realRes2.length);
                                    expect(realRes2.length).to.equal(expected2.length);

                                    for (let i = 0; i < realRes2.length; i++) {
                                        if (realRes2[i]?.txType === 'TOPUP') {
                                            equalsStoreTx(realRes2[i] as PartialStoreTx, expected2[i] as PartialStoreTx);
                                        }
                                        else {
                                            equalsSendTx(realRes2[i] as PartialSendTx, expected2[i] as PartialSendTx);
                                        }
                                    }
                                });
                                counts.forEach((count) => {
                                    it(`Correctly fetches transactions with count = ${count} and tokentype = ${tokenType} and before ${before}`, async () => {
                                        const realRes = await txManager.fetchTxs(count, tokenType, before);
                                        if (count < 0 || (before !== undefined && before < 0)) {
                                            expect(realRes.length).to.equal(0);
                                            return;
                                        }

                                        // Remove potential leading undefined values at the front of the array and then pad to the correct length
                                        // after filtering out the txs that don't match the tokenType and before
                                        const expected = txs.filter(isTruthy).filter((tx) => (before === undefined || tx.nonce < before) && (tokenType === undefined || tx.tokenType === tokenType)).slice(0, count);

                                        expect(realRes.length).to.equal(expected.length);

                                        for (let i = 0; i < realRes.length; i++) {
                                            if (realRes[i]?.txType === 'TOPUP') {
                                                equalsStoreTx(realRes[i] as PartialStoreTx, expected[i] as PartialStoreTx);
                                            }
                                            else {
                                                equalsSendTx(realRes[i] as PartialSendTx, expected[i] as PartialSendTx);
                                            }
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('Static helper method tests', () => {
        it('Correctly gets the lowest fetched nonce from an empty batch', () => {
            expect(TransactionManager['getLowestFetchedNonceFromBatch']([])).to.equal(-1);
        });

        it('Correctly gets the lowest fetched nonce from a non-empty batch without undefined values', () => {
            const batch: (PartialSendTx | undefined)[] = [{
                encryptedOwner: undefined as unknown as EncryptedValue,
                amount: BigInt(1),
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: 1,
                fee: BigInt(1),
                isAssociatedTokenAcc: false,
                nonce: 3,
                txType: 'SEND',
                tokenType: 'LAMPORTS',
                identifier: undefined as unknown as PublicKey,
                warden: undefined as unknown as PublicKey,
                isSolanaPayTransfer: false,
                extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
            },
            {
                encryptedOwner: undefined as unknown as EncryptedValue,
                amount: BigInt(2),
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: 2,
                fee: BigInt(2),
                isAssociatedTokenAcc: false,
                nonce: 3,
                txType: 'SEND',
                tokenType: 'LAMPORTS',
                identifier: undefined as unknown as PublicKey,
                warden: undefined as unknown as PublicKey,
                isSolanaPayTransfer: false,
                extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
            },
            {
                encryptedOwner: undefined as unknown as EncryptedValue,
                amount: BigInt(3),
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: 3,
                fee: BigInt(3),
                isAssociatedTokenAcc: false,
                nonce: 1,
                txType: 'SEND',
                tokenType: 'LAMPORTS',
                identifier: undefined as unknown as PublicKey,
                warden: undefined as unknown as PublicKey,
                isSolanaPayTransfer: false,
                extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
            }];

            expect(TransactionManager['getLowestFetchedNonceFromBatch'](batch)).to.equal(1);
        });

        it('Correctly gets the lowest fetched nonce from a non-empty batch with undefined values at the beginning', () => {
            const batch: (PartialSendTx | undefined)[] = [undefined,
                undefined,
                {
                    encryptedOwner: undefined as unknown as EncryptedValue,
                    amount: BigInt(3),
                    commitmentHash: new Uint8Array([0]) as ReprScalar,
                    merkleStartIndex: 3,
                    fee: BigInt(3),
                    isAssociatedTokenAcc: false,
                    nonce: 9,
                    txType: 'SEND',
                    tokenType: 'LAMPORTS',
                    identifier: undefined as unknown as PublicKey,
                    warden: undefined as unknown as PublicKey,
                    isSolanaPayTransfer: false,
                    extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
                },
                {
                    encryptedOwner: undefined as unknown as EncryptedValue,
                    amount: BigInt(2),
                    commitmentHash: new Uint8Array([0]) as ReprScalar,
                    merkleStartIndex: 2,
                    fee: BigInt(2),
                    isAssociatedTokenAcc: false,
                    nonce: 8,
                    txType: 'SEND',
                    tokenType: 'LAMPORTS',
                    identifier: undefined as unknown as PublicKey,
                    warden: undefined as unknown as PublicKey,
                    isSolanaPayTransfer: false,
                    extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
                },
                {
                    encryptedOwner: undefined as unknown as EncryptedValue,
                    amount: BigInt(1),
                    commitmentHash: new Uint8Array([0]) as ReprScalar,
                    merkleStartIndex: 1,
                    fee: BigInt(1),
                    isAssociatedTokenAcc: false,
                    nonce: 7,
                    txType: 'SEND',
                    tokenType: 'LAMPORTS',
                    identifier: undefined as unknown as PublicKey,
                    warden: undefined as unknown as PublicKey,
                    isSolanaPayTransfer: false,
                    extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
                }];

            expect(TransactionManager['getLowestFetchedNonceFromBatch'](batch)).to.equal(7);
        });

        it('Correctly gets the lowest fetched nonce from a non-empty batch with undefined values in the middle', () => {
            const batch: (PartialSendTx | undefined)[] = [{
                encryptedOwner: undefined as unknown as EncryptedValue,
                amount: BigInt(1),
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: 1,
                fee: BigInt(1),
                isAssociatedTokenAcc: false,
                nonce: 10,
                txType: 'SEND',
                tokenType: 'LAMPORTS',
                identifier: undefined as unknown as PublicKey,
                warden: undefined as unknown as PublicKey,
                isSolanaPayTransfer: false,
                extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
            },
            {
                encryptedOwner: undefined as unknown as EncryptedValue,
                amount: BigInt(2),
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: 2,
                fee: BigInt(2),
                isAssociatedTokenAcc: false,
                nonce: 9,
                txType: 'SEND',
                tokenType: 'LAMPORTS',
                identifier: undefined as unknown as PublicKey,
                warden: undefined as unknown as PublicKey,
                isSolanaPayTransfer: false,
                extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
            },
            {
                encryptedOwner: undefined as unknown as EncryptedValue,
                amount: BigInt(3),
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: 3,
                fee: BigInt(3),
                isAssociatedTokenAcc: false,
                nonce: 8,
                txType: 'SEND',
                tokenType: 'LAMPORTS',
                identifier: undefined as unknown as PublicKey,
                warden: undefined as unknown as PublicKey,
                isSolanaPayTransfer: false,
                extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
            },
            undefined,
            {
                encryptedOwner: undefined as unknown as EncryptedValue,
                amount: BigInt(3),
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: 3,
                fee: BigInt(3),
                isAssociatedTokenAcc: false,
                nonce: 6,
                txType: 'SEND',
                tokenType: 'LAMPORTS',
                identifier: undefined as unknown as PublicKey,
                warden: undefined as unknown as PublicKey,
                isSolanaPayTransfer: false,
                extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
            }];

            expect(TransactionManager['getLowestFetchedNonceFromBatch'](batch)).to.equal(6);
        });

        it('Correctly gets the lowest fetched nonce from a non-empty batch with undefined values at the end', () => {
            const batch: (PartialSendTx | undefined)[] = [{
                encryptedOwner: undefined as unknown as EncryptedValue,
                amount: BigInt(1),
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: 1,
                fee: BigInt(1),
                isAssociatedTokenAcc: false,
                nonce: 10,
                txType: 'SEND',
                tokenType: 'LAMPORTS',
                identifier: undefined as unknown as PublicKey,
                warden: undefined as unknown as PublicKey,
                isSolanaPayTransfer: false,
                extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
            },
            {
                encryptedOwner: undefined as unknown as EncryptedValue,
                amount: BigInt(2),
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: 2,
                fee: BigInt(2),
                isAssociatedTokenAcc: false,
                nonce: 9,
                txType: 'SEND',
                tokenType: 'LAMPORTS',
                identifier: undefined as unknown as PublicKey,
                warden: undefined as unknown as PublicKey,
                isSolanaPayTransfer: false,
                extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
            },
            {
                encryptedOwner: undefined as unknown as EncryptedValue,
                amount: BigInt(3),
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: 3,
                fee: BigInt(3),
                isAssociatedTokenAcc: false,
                nonce: 8,
                txType: 'SEND',
                tokenType: 'LAMPORTS',
                identifier: undefined as unknown as PublicKey,
                warden: undefined as unknown as PublicKey,
                isSolanaPayTransfer: false,
                extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
            },
            undefined,
            undefined];

            expect(TransactionManager['getLowestFetchedNonceFromBatch'](batch)).to.equal(8);
        });

        it('Correctly gets the lowest fetched nonce from a non-empty batch with undefined values at the beginning, middle, and end', () => {
            const batch: (PartialSendTx | undefined)[] = [undefined,
                undefined,
                {
                    encryptedOwner: undefined as unknown as EncryptedValue,
                    amount: BigInt(3),
                    commitmentHash: new Uint8Array([0]) as ReprScalar,
                    merkleStartIndex: 3,
                    fee: BigInt(3),
                    isAssociatedTokenAcc: false,
                    nonce: 9,
                    txType: 'SEND',
                    tokenType: 'LAMPORTS',
                    identifier: undefined as unknown as PublicKey,
                    warden: undefined as unknown as PublicKey,
                    isSolanaPayTransfer: false,
                    extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
                },
                {
                    encryptedOwner: undefined as unknown as EncryptedValue,
                    amount: BigInt(2),
                    commitmentHash: new Uint8Array([0]) as ReprScalar,
                    merkleStartIndex: 2,
                    fee: BigInt(2),
                    isAssociatedTokenAcc: false,
                    nonce: 8,
                    txType: 'SEND',
                    tokenType: 'LAMPORTS',
                    identifier: undefined as unknown as PublicKey,
                    warden: undefined as unknown as PublicKey,
                    isSolanaPayTransfer: false,
                    extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
                },
                undefined,
                {
                    encryptedOwner: undefined as unknown as EncryptedValue,
                    amount: BigInt(1),
                    commitmentHash: new Uint8Array([0]) as ReprScalar,
                    merkleStartIndex: 1,
                    fee: BigInt(1),
                    isAssociatedTokenAcc: false,
                    nonce: 6,
                    txType: 'SEND',
                    tokenType: 'LAMPORTS',
                    identifier: undefined as unknown as PublicKey,
                    warden: undefined as unknown as PublicKey,
                    isSolanaPayTransfer: false,
                    extraFee: { amount: BigInt(0), collector: SystemProgram.programId },
                },
                undefined,
                undefined];

            expect(TransactionManager['getLowestFetchedNonceFromBatch'](batch)).to.equal(6);
        });
    });
});

async function generateTxHistoryTxManager(
    startNonce: number,
    count: number,
    storeFee: Fee,
    tokenTypes: Pair<TokenType, number>[],
    sender: PublicKey,
    warden: PublicKey,
    seedWrapper: SeedWrapper,
    sendFee?: bigint,
    txTypes: TxTypes[] = ['TOPUP'],
    startingPrivateBalance = BigInt(0),
): Promise<{
        connection: TxHistoryConnectionDriver,
        txs: ElusivTransaction[],
    }> {
    const history = await generateParsedTxHistory(startNonce, count, storeFee, tokenTypes, sender, warden, seedWrapper, sendFee, txTypes, startingPrivateBalance);

    const connection: TxHistoryConnectionDriver = new TxHistoryConnectionDriver();

    for (const tx of history) {
        connection.addNewTxs(tx.id, tx.tx);
    }

    return { connection, txs: history.map((p) => p.unserialized) };
}

async function generateParsedTxHistory(
    startNonce: number,
    count: number,
    storeFee: Fee,
    tokenTypes: Pair<TokenType, number>[],
    sender: PublicKey,
    warden: PublicKey,
    seedWrapper: SeedWrapper,
    sendFee?: bigint,
    txTypes: TxTypes[] = ['TOPUP'],
    startingPrivateBalance = BigInt(0),
): Promise<{
        id: PublicKey;
        unserialized: ElusivTransaction;
        tx: {
            fst: ParsedTransactionWithMeta;
            snd: ConfirmedSignatureInfo;
        }[];
    }[]> {
    const history = await generateTxHistory(count, sender, warden, tokenTypes, seedWrapper, txTypes, startNonce, startingPrivateBalance, 1, storeFee, sendFee);
    return history.map((tx) => ({ id: tx.unserialized.identifier, unserialized: tx.unserialized, tx: tx.serialized.map((p) => ({ fst: TxHistoryConnectionDriver.txToParsedTx(p.fst.tx, p.fst.cpi), snd: p.snd })) }));
}

function equalsStoreTx(a: PartialStoreTx | undefined, b: PartialStoreTx | undefined): void {
    if (a === undefined || b === undefined) {
        expect(a).to.be.undefined;
        expect(b).to.be.undefined;
    }
    else {
        expect(a.nonce).to.equal(b.nonce);
        expect(a.tokenType).to.equal(b.tokenType);
        expect(a.txType).to.equal(b.txType);
        expect(a.amount).to.equal(b.amount);
        expect(a.identifier).to.deep.equal(b.identifier);
        expect(a.sender).to.deep.equal(b.sender);
        expect(a.parsedPrivateBalance).to.deep.equal(b.parsedPrivateBalance);
        expect(a.merkleStartIndex).to.deep.equal(b.merkleStartIndex);
        expect(a.isRecipient).to.deep.equal(b.isRecipient);
    }
}

function equalsSendTx(a: PartialSendTx | undefined, b: PartialSendTx | undefined): void {
    if (a === undefined || b === undefined) {
        expect(a).to.be.undefined;
        expect(b).to.be.undefined;
    }
    else {
        expect(a.nonce).to.equal(b.nonce);
        expect(a.txType).to.equal(b.txType);
        expect(a.tokenType).to.equal(b.tokenType);
        expect(a.encryptedOwner).to.deep.equal(b.encryptedOwner);
        expect(a.amount).to.deep.equal(b.amount);
        expect(a.fee).to.deep.equal(b.fee);
        expect(a.isAssociatedTokenAcc).to.deep.equal(b.isAssociatedTokenAcc);
    }
}
