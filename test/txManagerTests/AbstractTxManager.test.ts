import { ConfirmedSignatureInfo, PublicKey } from '@solana/web3.js';
import { expect } from 'chai';
import { Poseidon, ReprScalar } from 'elusiv-cryptojs';
import { DEFAULT_FETCH_BATCH_SIZE } from '../../src/constants.js';
import { RVKWrapper } from '../../src/sdk/clientCrypto/RVKWrapper.js';
import { ElusivTransaction } from '../../src/sdk/transactions/ElusivTransaction.js';
import { AbstractTxManager, TxFetchingInputs } from '../../src/sdk/txManagers/AbstractTxManager.js';
import { reverseArr } from '../../src/sdk/utils/utils.js';
import { AbstractTxManagerInstance } from '../helpers/instances/AbstractTxManagerInstance.js';

describe('Abstract tx manager tests', () => {
    let manager: AbstractTxManagerInstance;
    const rvk: RVKWrapper = undefined as unknown as RVKWrapper;

    before(async () => {
        await Poseidon.setupPoseidon();
    });

    describe('Empty tx history tests', () => {
        const counts: (number | undefined)[] = [
            undefined,
            1,
            2,
            100,
            1000,
        ];
        const batchSizes: (number | undefined)[] = [
            undefined,
            1,
            2,
            DEFAULT_FETCH_BATCH_SIZE,
            1000,
        ];
        const beforeNonces: (number | undefined)[] = [
            undefined,
            0,
            1,
            2,
            100,
            1000,
        ];
        counts.forEach((count) => {
            batchSizes.forEach((batchSize) => {
                beforeNonces.forEach((beforeNonce) => {
                    describe(`Tests with parameter combination count: ${count}, batchSize: ${batchSize}, beforeNonce ${beforeNonce}`, () => {
                        before(() => {
                            const history: ElusivTransaction[] = [];
                            manager = new AbstractTxManagerInstance(rvk, history);
                        });

                        it('Returns correct transactions', async () => {
                            const res = await manager.getTxsWrapper(
                                count,
                                beforeNonce !== undefined ? beforeNonce : undefined,
                                batchSize,
                            );
                            expect(res).to.deep.equal([]);
                        });
                    });
                });
            });
        });
    });

    describe('Default value tests', () => {
        it('Correctly gets default value for after', async () => {
            expect(await AbstractTxManager['getDefaultAfter']()).to.deep.equal(-1);
        });

        it('Correctly gets default value for before', async () => {
            expect(await AbstractTxManager['getDefaultBefore']({ before: 2, after: 0 })).to.deep.equal(2);
        });
    });

    describe('Transaction cache tests', () => {
        it('Correctly gets latest cached transaction and nonce with no transactions', () => {
            const history: ElusivTransaction[] = [];
            manager = new AbstractTxManagerInstance(rvk, history);
            manager.cacheTransactions(history);
            expect(manager['getLatestCachedTx']()).to.deep.equal(undefined);
            expect(manager['getLatestCachedNonce']()).to.deep.equal(-1);
        });

        it('Correctly gets latest cached transaction and nonce with one transaction', () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 100, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const history: ElusivTransaction[] = [tx];
            manager = new AbstractTxManagerInstance(rvk, history);
            manager.cacheTransactions(history);
            expect(manager['getLatestCachedTx']()).to.deep.equal(tx);
            expect(manager['getLatestCachedNonce']()).to.deep.equal(tx.nonce);
        });

        it('Correctly gets latest cached transaction and nonce with multiple transactions', () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 100, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 101, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const history: ElusivTransaction[] = [tx, tx2];
            manager = new AbstractTxManagerInstance(rvk, history);
            manager.cacheTransactions(history);
            expect(manager['getLatestCachedTx']()).to.deep.equal(tx2);
            expect(manager['getLatestCachedNonce']()).to.deep.equal(tx2.nonce);
        });

        it('Correctly returns if a transaction is cached with no transactions', () => {
            manager = new AbstractTxManagerInstance(rvk, []);
            expect(manager['isCachedNonce'](0)).to.equal(false);
            expect(manager['isCachedNonce'](1)).to.equal(false);
            expect(manager['isCachedNonce'](10)).to.equal(false);
        });

        it('Correctly returns if a transaction is cached with one transactions', () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 100, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            manager = new AbstractTxManagerInstance(rvk, [tx]);
            manager.cacheTransactions([tx]);
            expect(manager['isCachedNonce'](0)).to.equal(false);
            expect(manager['isCachedNonce'](1)).to.equal(false);
            expect(manager['isCachedNonce'](10)).to.equal(false);
            expect(manager['isCachedNonce'](100)).to.equal(true);
        });

        it('Correctly returns if a transaction is cached with multiple transactions', () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 100, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 101, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 102, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx4: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 103, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            manager = new AbstractTxManagerInstance(rvk, [tx, tx2, tx3, tx4]);
            manager.cacheTransactions([tx, tx2, tx3, tx4]);
            expect(manager['isCachedNonce'](0)).to.equal(false);
            expect(manager['isCachedNonce'](1)).to.equal(false);
            expect(manager['isCachedNonce'](10)).to.equal(false);
            expect(manager['isCachedNonce'](100)).to.equal(true);
            expect(manager['isCachedNonce'](101)).to.equal(true);
            expect(manager['isCachedNonce'](102)).to.equal(true);
            expect(manager['isCachedNonce'](104)).to.equal(false);
        });

        it('Correctly returns cached transactions for empty transactions', () => {
            manager = new AbstractTxManagerInstance(rvk, []);
            expect(manager['getCachedTxsWrapper']()).to.deep.equal([]);
        });

        it('Correctly returns cached transactions for one transaction', () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 100, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            manager = new AbstractTxManagerInstance(rvk, [tx]);
            manager.cacheTransactions([tx]);
            expect(manager['getCachedTxsWrapper']()).to.deep.equal([tx]);
        });

        it('Correctly returns cached transactions for multiple transactions', () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 100, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 101, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 102, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx4: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 103, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            manager = new AbstractTxManagerInstance(rvk, [tx, tx2, tx3, tx4]);
            manager.cacheTransactions([tx, tx2, tx3, tx4]);
            expect(manager['getCachedTxsWrapper']()).to.deep.equal(([tx4, tx3, tx2, tx]));
        });

        it('Correctly returns cached transactions for multiple transactions with gaps between transactions', () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 30, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 172, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx4: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 503, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            manager = new AbstractTxManagerInstance(rvk, [tx, tx2, tx3, tx4]);
            manager.cacheTransactions([tx, tx2, tx3, tx4]);
            expect(manager['getCachedTxsWrapper']()).to.deep.equal(([tx4].concat([tx3]).concat([tx2]).concat([tx])));
        });

        it('Correctly returns cached transactions for multiple transactions with specified after nonce', () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 30, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 172, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx4: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 503, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            manager = new AbstractTxManagerInstance(rvk, [tx, tx2, tx3, tx4]);
            manager.cacheTransactions([tx, tx2, tx3, tx4]);
            expect(manager['getCachedTxsWrapper'](undefined, 100)).to.deep.equal(([tx4].concat([tx3])));
        });

        it('Correctly returns cached transactions for multiple transactions with specified before nonce', () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 30, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 172, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx4: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 503, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            manager = new AbstractTxManagerInstance(rvk, [tx, tx2, tx3, tx4]);
            manager.cacheTransactions([tx, tx2, tx3, tx4]);
            expect(manager['getCachedTxsWrapper'](100)).to.deep.equal([tx2].concat([tx]));
        });

        it('Correctly returns cached transactions for multiple transactions with specified before and after nonce', () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 30, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 172, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx4: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 503, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            manager = new AbstractTxManagerInstance(rvk, [tx, tx2, tx3, tx4]);
            manager.cacheTransactions([tx, tx2, tx3, tx4]);
            expect(manager['getCachedTxsWrapper'](200, 100)).to.deep.equal([tx3]);
        });
    });

    describe('Get latest transactions tests', () => {
        it('Correctly gets latest transactions with no transactions and no parameters', async () => {
            const history: ElusivTransaction[] = [];
            manager = new AbstractTxManagerInstance(rvk, history);
            const latestTransactions = await manager['getLatestTransactionsIntoCache'](-1);
            expect(latestTransactions).to.deep.equal({ after: -1, before: 0 });
        });

        describe('Get latest transactions tests with transactions', () => {
            let history: ElusivTransaction[];
            beforeEach(() => {
                history = [
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig20'), nonce: 119, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig19'), nonce: 118, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig18'), nonce: 117, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig17'), nonce: 116, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig15'), nonce: 114, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig14'), nonce: 113, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig13'), nonce: 112, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig12'), nonce: 111, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig11'), nonce: 110, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig10'), nonce: 109, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig9'), nonce: 108, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig8'), nonce: 107, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig7'), nonce: 106, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig5'), nonce: 104, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 103, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 102, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 101, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 100, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                ];
                manager = new AbstractTxManagerInstance(rvk, history);
            });

            it('Correctly gets latest transactions with transactions and no parameters', async () => {
                const latestTransactions = await manager['getLatestTransactionsIntoCache'](99);
                expect(latestTransactions).to.deep.equal({ after: 99, before: 120 });
            });
        });
        describe('Get latest transactions tests with transactions and existing cache', () => {
            let history: ElusivTransaction[];
            beforeEach(() => {
                history = [
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig20'), nonce: 119, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig19'), nonce: 118, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig18'), nonce: 117, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig17'), nonce: 116, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig15'), nonce: 114, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig14'), nonce: 113, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig13'), nonce: 112, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig12'), nonce: 111, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig11'), nonce: 110, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig10'), nonce: 109, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig9'), nonce: 108, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig8'), nonce: 107, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig7'), nonce: 106, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig5'), nonce: 104, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 103, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 102, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 101, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 100, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                ];

                manager = new AbstractTxManagerInstance(rvk, history);
                manager.cacheTransactions(history.slice(3, 10));
            });

            it('Correctly gets latest transactions with transactions and no parameters', async () => {
                const latestTransactions = await manager['getLatestTransactionsIntoCache'](99);
                expect(latestTransactions).to.deep.equal({ after: 99, before: 120 });
            });
        });
        describe('Get and cache latest transactions tests', () => {
            it('Gets and caches no latest transactions correctly', async () => {
                manager = new AbstractTxManagerInstance(rvk, []);
                const latestTransactions = await manager['getLatestTransactionsIntoCache'](-1);
                expect(latestTransactions).to.deep.equal({ after: -1, before: 0 });
            });

            it('Gets and caches latest transactions correctly', async () => {
                const history: ElusivTransaction[] = [
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig20'), nonce: 79, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig19'), nonce: 78, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig18'), nonce: 77, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig17'), nonce: 76, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig15'), nonce: 74, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig14'), nonce: 73, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig13'), nonce: 72, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig12'), nonce: 71, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig11'), nonce: 70, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig10'), nonce: 69, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig9'), nonce: 68, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig8'), nonce: 67, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig7'), nonce: 66, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig5'), nonce: 64, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 63, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 62, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 61, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                    {
                        commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 60, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                    },
                ];
                manager = new AbstractTxManagerInstance(rvk, history);
                const latestTransactions = await manager['getLatestTransactionsIntoCache'](50);
                expect(latestTransactions).to.deep.equal({ after: 50, before: 80 });
                expect(manager['getCachedTxs']().filter((tx) => tx !== undefined)).to.deep.equal(reverseArr(history));
            });
        });
    });

    describe('Prepare tx fetching params tests', () => {
        it('Correctly prepares params with only range param', async () => {
            manager = new AbstractTxManagerInstance(rvk, []);
            const range = { before: 100, after: 50 };
            const params = await AbstractTxManager['prepareTxFetchingParams'](range);
            const expected: TxFetchingInputs = {
                batchSize: DEFAULT_FETCH_BATCH_SIZE,
                before: AbstractTxManager['getDefaultBefore'](range),
                after: AbstractTxManager['getDefaultAfter'](),
            };
            expect(params).to.deep.equal(expected);
        });

        it('Correctly prepares params with specified count and batchsize', async () => {
            manager = new AbstractTxManagerInstance(rvk, []);
            const range = { before: 100, after: 50 };
            const params = await AbstractTxManager['prepareTxFetchingParams'](range, 10, 20, undefined);
            const expected: TxFetchingInputs = {
                batchSize: 20,
                before: AbstractTxManager['getDefaultBefore'](range),
                after: 89,
            };
            expect(params).to.deep.equal(expected);
        });

        it('Correctly prepares params with specified before and latest tx', async () => {
            manager = new AbstractTxManagerInstance(rvk, []);
            const range = { before: 100, after: 50 };
            const before = 1;

            const params = await AbstractTxManager['prepareTxFetchingParams'](range, undefined, undefined, before);
            const expected: TxFetchingInputs = {
                batchSize: DEFAULT_FETCH_BATCH_SIZE,
                before,
                after: -1,
            };
            expect(params).to.deep.equal(expected);
        });
    });

    describe('Fetch txs tests', () => {
        it('Returns empty transactions for before < after', async () => {
            const history: ElusivTransaction[] = [
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig10'), nonce: 109, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig9'), nonce: 108, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig8'), nonce: 107, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
            ];
            manager = new AbstractTxManagerInstance(rvk, history);
            const txInputs: TxFetchingInputs = {
                batchSize: 10,
                before: 5,
                after: 10,
            };

            const txs = await manager['fetchTxsIntoCache'](txInputs);
            expect(txs).to.deep.equal([]);
        });

        it('Returns empty transactions for before = after', async () => {
            const history: ElusivTransaction[] = [
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig10'), nonce: 109, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig9'), nonce: 108, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig8'), nonce: 107, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
            ];
            manager = new AbstractTxManagerInstance(rvk, history);
            const txInputs: TxFetchingInputs = {
                batchSize: 10,
                before: 5,
                after: 5,
            };

            const txs = await manager['fetchTxsIntoCache'](txInputs);
            expect(txs).to.deep.equal([]);
        });

        it('Returns empty transactions for empty history', async () => {
            const history: ElusivTransaction[] = [];
            manager = new AbstractTxManagerInstance(rvk, history);
            const txInputs: TxFetchingInputs = {
                batchSize: 10,
                before: 10,
                after: 5,
            };

            const txs = await manager['fetchTxsIntoCache'](txInputs);
            expect(txs).to.deep.equal([]);
        });

        const sizeRelation = (n: number, m: number): string => {
            if (n < m) {
                return 'less than';
            } if (n > m) {
                return 'greater than';
            }
            return 'equal to';
        };

        describe('Continuous history tests', () => {
            const history: ElusivTransaction[] = [
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig20'), nonce: 19, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig19'), nonce: 18, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig18'), nonce: 17, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig17'), nonce: 16, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig16'), nonce: 15, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig15'), nonce: 14, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig14'), nonce: 13, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig13'), nonce: 12, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig12'), nonce: 11, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig11'), nonce: 10, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig10'), nonce: 9, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig9'), nonce: 8, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig8'), nonce: 7, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig7'), nonce: 6, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig6'), nonce: 5, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig5'), nonce: 4, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 3, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 2, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 1, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
            ];

            // We try with <, > and = to length of history (or nonce in the case of before and after) for each of these
            const maxNonce = history[0].nonce;
            const minNonce = history[history.length - 1].nonce;
            const befores = [maxNonce - 1, maxNonce, maxNonce + 1, maxNonce + 5];
            const afters = [minNonce - 1, minNonce, minNonce + 1, minNonce + 5];
            const batchSizes = [1, history.length - 1, history.length, history.length + 1];
            const caching = [true, false];
            // Furthermore test with part of the txs already in cache
            const cachedUntils = [0, Math.floor(history.length / 2), history.length];
            beforeEach(() => {
                manager = new AbstractTxManagerInstance(rvk, history);
            });

            befores.forEach((before) => {
                afters.forEach((after) => {
                    caching.forEach((isCaching) => {
                        it(`Fetch txs in range: Returns correct history for continuous history before ${sizeRelation(before, minNonce)}, after ${sizeRelation(before, maxNonce)}`, async () => {
                            let txs: (ElusivTransaction | undefined)[];
                            if (isCaching) {
                                txs = await manager['fetchAndCacheTxsInRange'](before, after);
                            }
                            else {
                                txs = await manager['fetchTxsInRange'](before, after);
                            }

                            const expected = reverseArr(history.filter((tx) => tx !== undefined && (tx.nonce > after && tx.nonce < before)));

                            expect(txs).to.deep.equal(expected);

                            if (isCaching) {
                                const expectedCached = history.filter((tx) => tx !== undefined && tx.nonce > after && tx.nonce < before);
                                expect(manager['getCachedTxsWrapper']()).to.deep.equal(expectedCached);
                            }
                        });
                    });

                    cachedUntils.forEach((cachedUntil) => {
                        batchSizes.forEach((batchSize) => {
                            it(`Tx fetching loop: Returns correct history for continuous history before ${sizeRelation(before, minNonce)}, after ${sizeRelation(before, maxNonce)}, batchSize ${sizeRelation(batchSize, history.length)} and cached length ${cachedUntil}`, async () => {
                                manager.cacheTransactions(history.slice(0, cachedUntil));
                                const txInputs: TxFetchingInputs = {
                                    batchSize,
                                    before,
                                    after,
                                };

                                const txs = await manager['fetchTxsIntoCache'](txInputs);
                                const expected = history.filter((tx) => tx.nonce > after && tx.nonce < before);

                                expect(txs).to.deep.equal(expected);
                            });

                            it(`Get txs: Returns correct history for continuous history before ${sizeRelation(before, minNonce)}, after ${sizeRelation(before, maxNonce)}, batchSize ${sizeRelation(batchSize, history.length)} and cached length ${cachedUntil}`, async () => {
                                manager.cacheTransactions(history.slice(0, cachedUntil));

                                const count = before - after - 1;

                                const txs = await manager.getTxsWrapper(count, before, batchSize);
                                const expected = history.filter((tx) => tx.nonce < before).slice(0, count);
                                expect(txs).to.deep.equal(expected);
                            });
                        });
                    });
                });
            });
        });

        describe('Fetch tx loop tests with non-continuous history', () => {
            const history: ElusivTransaction[] = [
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig20'), nonce: 19, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig19'), nonce: 18, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig18'), nonce: 17, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig17'), nonce: 16, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig15'), nonce: 14, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig14'), nonce: 13, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig13'), nonce: 12, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig12'), nonce: 11, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig11'), nonce: 10, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig10'), nonce: 9, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig9'), nonce: 8, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig8'), nonce: 7, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig7'), nonce: 6, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig5'), nonce: 4, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 3, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 2, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 1, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
            ];
            const expectedHistory: (ElusivTransaction | undefined)[] = [
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig20'), nonce: 19, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig19'), nonce: 18, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig18'), nonce: 17, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig17'), nonce: 16, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                undefined,
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig15'), nonce: 14, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig14'), nonce: 13, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig13'), nonce: 12, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig12'), nonce: 11, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig11'), nonce: 10, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig10'), nonce: 9, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig9'), nonce: 8, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig8'), nonce: 7, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig7'), nonce: 6, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                undefined,
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig5'), nonce: 4, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 3, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 2, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 1, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
            ];

            // We try with <, > and = to length of history (or nonce in the case of before and after) for each of these
            const maxNonce = history[0].nonce;
            const minNonce = history[history.length - 1].nonce;
            const befores = [
                maxNonce - 1,
                maxNonce,
                maxNonce + 1,
                maxNonce + 6,
            ];
            const afters = [
                minNonce - 1,
                minNonce,
                minNonce + 1,
                minNonce + 3,
            ];
            const batchSizes = [
                1,
                history.length - 1,
                history.length,
                history.length + 1,
            ];
            const caching = [true, false];
            // Furthermore test with part of the txs already in cache
            const cachedUntils = [
                0,
                Math.floor(history.length / 2),
                history.length,
            ];
            beforeEach(() => {
                manager = new AbstractTxManagerInstance(rvk, history);
            });

            befores.forEach((before) => {
                afters.forEach((after) => {
                    caching.forEach((isCaching) => {
                        it(`Fetch txs in range: Returns correct history for non-continuous history before ${sizeRelation(before, minNonce)}, after ${sizeRelation(before, maxNonce)}`, async () => {
                            let txs: (ElusivTransaction | undefined)[];
                            if (isCaching) {
                                txs = await manager['fetchAndCacheTxsInRange'](before, after);
                            }
                            else {
                                txs = await manager['fetchTxsInRange'](before, after);
                            }

                            const expected = reverseArr(expectedHistory.filter((tx) => tx !== undefined && (tx.nonce > after && tx.nonce < before)));

                            expect(txs).to.deep.equal(expected);

                            if (isCaching) {
                                const expectedCached = expectedHistory.filter((tx) => tx !== undefined && tx.nonce < before && tx.nonce > after);
                                expect(manager['getCachedTxsWrapper']()).to.deep.equal(expectedCached);
                            }
                        });
                    });
                    cachedUntils.forEach((cachedUntil) => {
                        batchSizes.forEach((batchSize) => {
                            it(`Fetch txs: Returns correct history for non-continuous history before ${sizeRelation(before, minNonce)}, after ${sizeRelation(before, maxNonce)}, batchSize ${sizeRelation(batchSize, history.length)} and cached length ${cachedUntil}`, async () => {
                                manager.cacheTransactions(history.slice(0, cachedUntil));
                                const txInputs: TxFetchingInputs = {
                                    batchSize,
                                    before,
                                    after,
                                };

                                const txs = await manager['fetchTxsIntoCache'](txInputs);
                                const expected = expectedHistory.filter((tx) => tx !== undefined && (tx.nonce > after && tx.nonce < before));

                                expect(txs).to.deep.equal(expected);
                            });

                            it(`Get txs: Returns correct history for non-continuous history before ${sizeRelation(before, minNonce)}, after ${sizeRelation(before, maxNonce)}, batchSize ${sizeRelation(batchSize, history.length)} and cached length ${cachedUntil}`, async () => {
                                manager.cacheTransactions(history.slice(0, cachedUntil));

                                const count = before - after - 1;

                                const txs = await manager.getTxsWrapper(count, before, batchSize);
                                const expected = expectedHistory.filter((tx) => tx === undefined || (tx.nonce < before)).slice(0, count).filter((tx) => tx !== undefined);
                                expect(txs).to.deep.equal(expected);
                            });
                        });
                    });
                });
            });
        });

        describe('Two step tx loop tests with non-continuous history', () => {
            const history: ElusivTransaction[][] = [[
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig20'), nonce: 19, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig19'), nonce: 18, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig18'), nonce: 17, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig17'), nonce: 16, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig15'), nonce: 14, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig14'), nonce: 13, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig13'), nonce: 12, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig12'), nonce: 11, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
            ],
            [
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig11'), nonce: 10, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig10'), nonce: 9, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig9'), nonce: 8, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig8'), nonce: 7, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig7'), nonce: 6, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig5'), nonce: 4, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 3, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 2, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 1, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
            ]];
            const expectedHistory: (ElusivTransaction | undefined)[][] = [[
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig20'), nonce: 19, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig19'), nonce: 18, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig18'), nonce: 17, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig17'), nonce: 16, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig15'), nonce: 14, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig14'), nonce: 13, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig13'), nonce: 12, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig12'), nonce: 11, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
            ],
            [
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig11'), nonce: 10, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig10'), nonce: 9, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig9'), nonce: 8, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig8'), nonce: 7, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig7'), nonce: 6, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig5'), nonce: 4, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig4'), nonce: 3, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig3'), nonce: 2, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig2'), nonce: 1, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
                {
                    commitmentHash: new Uint8Array([0]) as ReprScalar, merkleStartIndex: -1, amount: BigInt(0), fee: BigInt(2), tokenType: 'LAMPORTS', signature: stringToConfirmedSig('someSig'), nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
                },
            ]];

            // We try with <, > and = to length of history (or nonce in the case of before and after) for each of these
            const maxNonce = history[0][0].nonce;
            const minNonce = history[1][history[1].length - 1].nonce;
            const befores = [
                maxNonce - 1,
                maxNonce,
                maxNonce + 1,
            ];
            const afters = [
                minNonce - 1,
                minNonce,
                minNonce + 1,
            ];
            const batchSizes = [
                1,
                history.length - 1,
                history.length,
                history.length + 1,
            ];
            const caching = [true, false];
            beforeEach(() => {
                manager = new AbstractTxManagerInstance(rvk, history[1]);
            });
            befores.forEach((before) => {
                afters.forEach((after) => {
                    caching.forEach((isCaching) => {
                        it(`Fetch txs in range: Returns correct history for continuous history before ${sizeRelation(before, minNonce)}, after ${sizeRelation(before, maxNonce)}`, async () => {
                            let txs: (ElusivTransaction | undefined)[];
                            if (isCaching) {
                                txs = await manager['fetchAndCacheTxsInRange'](before, after);
                            }
                            else {
                                txs = await manager['fetchTxsInRange'](before, after);
                            }

                            let expected = reverseArr(expectedHistory[1].filter((tx) => tx !== undefined && (tx.nonce > after && tx.nonce < before)));

                            expect(txs).to.deep.equal(expected);

                            if (isCaching) {
                                const expectedCached = expectedHistory[1].filter((tx) => tx !== undefined && tx.nonce < before && tx.nonce > after);
                                expect(manager['getCachedTxsWrapper']()).to.deep.equal(expectedCached);
                            }

                            // Add more txs
                            manager.prependTransaction(history[0]);
                            if (isCaching) {
                                txs = await manager['fetchAndCacheTxsInRange'](before, after);
                            }
                            else {
                                txs = await manager['fetchTxsInRange'](before, after);
                            }
                            expected = reverseArr(expectedHistory[0].concat(expectedHistory[1]).filter((tx) => tx !== undefined && (tx.nonce > after && tx.nonce < before)));
                            expect(txs).to.deep.equal(expected);

                            if (isCaching) {
                                if (isCaching) {
                                    const expectedCached = expectedHistory[0].concat(expectedHistory[1]).filter((tx) => tx !== undefined && tx.nonce < before && tx.nonce > after);
                                    expect(manager['getCachedTxsWrapper']()).to.deep.equal(expectedCached);
                                }
                            }
                        });
                    });

                    batchSizes.forEach((batchSize) => {
                        it(`Returns correct history for 2-step history with before ${sizeRelation(before, minNonce)}, after ${sizeRelation(before, maxNonce)}, batchSize ${sizeRelation(batchSize, history.length)}`, async () => {
                            const txInputs: TxFetchingInputs = {
                                batchSize,
                                before,
                                after,
                            };

                            let txs = await manager['fetchTxsIntoCache'](txInputs);
                            let expected = expectedHistory[1].filter((tx) => tx !== undefined && (tx.nonce > after && tx.nonce < before));
                            expect(txs).to.deep.equal(expected);

                            // Add more txs
                            manager.prependTransaction(history[0]);
                            txs = await manager['fetchTxsIntoCache'](txInputs);
                            expected = expectedHistory[0].concat(expectedHistory[1]).filter((tx) => tx !== undefined && (tx.nonce > after && tx.nonce < before));
                            expect(txs).to.deep.equal(expected);
                        });

                        it(`Get txs: Returns correct history for 2-step history before ${sizeRelation(before, minNonce)}, after ${sizeRelation(before, maxNonce)}, batchSize ${sizeRelation(batchSize, history.length)}`, async () => {
                            const count = before - after - 1;

                            let txs = await manager.getTxsWrapper(count, before, batchSize);
                            let expected = expectedHistory[1].filter((tx) => tx !== undefined && tx.nonce < before).slice(0, count);
                            expect(txs).to.deep.equal(expected);

                            manager.prependTransaction(history[0]);

                            txs = await manager.getTxsWrapper(count, before, batchSize);
                            expected = expectedHistory[0].concat(expectedHistory[1]).filter((tx) => tx !== undefined && (tx.nonce > after && tx.nonce < before));
                            expect(txs).to.deep.equal(expected);
                        });
                    });
                });
            });
        });
    });
});

function stringToConfirmedSig(string: string): ConfirmedSignatureInfo {
    return {
        slot: 100,
        signature: string,
        err: null,
        memo: null,
    };
}
