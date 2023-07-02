/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ConfirmedSignatureInfo, PublicKey, TransactionError } from '@solana/web3.js';
import { Poseidon, ReprScalar } from '@elusiv/cryptojs';
import { INVALID_SIZE } from '@elusiv/serialization';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { SeedWrapper } from '../../src/sdk/clientCrypto/SeedWrapper.js';
import { ElusivTransaction } from '../../src/sdk/transactions/ElusivTransaction.js';
import { IdentifierTxFetcherInstance } from '../helpers/instances/IdentifierTxFetcherInstance.js';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Identifier tx fetcher tests', () => {
    let txFetcher: IdentifierTxFetcherInstance;
    let seedWrapper: SeedWrapper;
    before(async () => {
        await Poseidon.setupPoseidon();
        seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5, 6, 7]));
    });

    describe('Sigs to txs tests', () => {
        it('Correctly converts sigs to txs for empty sig array', async () => {
            txFetcher = new IdentifierTxFetcherInstance([], seedWrapper.getRootViewingKeyWrapper());
            const txs = await txFetcher['sigsToElusivTxs']([]);
            expect(txs).to.deep.equal([]);
        });

        it('Correctly converts sigs to txs for one tx', async () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx], seedWrapper.getRootViewingKeyWrapper());
            const txs = await txFetcher['sigsToElusivTxs']([{ sigs: [tx.signature!], nonce: tx.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx.nonce) }]);
            expect(txs).to.deep.equal([tx]);
        });

        it('Correctly converts sigs to txs for multiple txs', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig2'),
                nonce: 1,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(1),
                warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig3'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(2),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx1, tx2, tx3], seedWrapper.getRootViewingKeyWrapper());
            const txs = await txFetcher['sigsToElusivTxs']([
                { sigs: [tx1.signature!], nonce: tx1.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx1.nonce) },
                { sigs: [tx2.signature!], nonce: tx2.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx2.nonce) },
                { sigs: [tx3.signature!], nonce: tx3.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx3.nonce) },
            ]);
            expect(txs).to.deep.equal([tx1, tx2, tx3]);
        });

        it('Correctly converts sigs to txs for multiple txs with gaps', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig3'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(2),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx1, tx3], seedWrapper.getRootViewingKeyWrapper());
            const txs = await txFetcher['sigsToElusivTxs']([
                { sigs: [tx1.signature!], nonce: tx1.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx1.nonce) },
                { sigs: [], nonce: 1, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(1) },
                { sigs: [tx3.signature!], nonce: tx3.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx3.nonce) },
            ]);
            expect(txs).to.deep.equal([tx1, tx3]);
        });

        it('Correctly converts sigs to txs for multiple txs with large gaps', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx10: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig9'),
                nonce: 9,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(9),
                warden: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(10),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx1, tx10], seedWrapper.getRootViewingKeyWrapper());
            const txs = await txFetcher['sigsToElusivTxs']([
                { sigs: [tx1.signature!], nonce: tx1.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx1.nonce) },
                { sigs: [], nonce: 1, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(1) },
                { sigs: [], nonce: 2, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(2) },
                { sigs: [], nonce: 3, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(3) },
                { sigs: [], nonce: 4, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(4) },
                { sigs: [], nonce: 5, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(5) },
                { sigs: [], nonce: 6, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(6) },
                { sigs: [], nonce: 7, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(7) },
                { sigs: [], nonce: 8, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(8) },
                { sigs: [tx10.signature!], nonce: tx10.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx10.nonce) },
            ]);
            expect(txs).to.deep.equal([tx1, tx10]);
        });

        it('Correctly converts sigs to txs for multiple txs with gap at front', async () => {
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig2'),
                nonce: 1,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig3'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx2, tx3], seedWrapper.getRootViewingKeyWrapper());
            const txs = await txFetcher['sigsToElusivTxs']([
                { sigs: [], nonce: 0, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0) },
                { sigs: [tx2.signature!], nonce: tx2.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx2.nonce) },
                { sigs: [tx3.signature!], nonce: tx3.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx3.nonce) },
            ]);
            expect(txs).to.deep.equal([tx2, tx3]);
        });

        it('Correctly converts sigs to txs for multiple txs with gap at end', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig2'),
                nonce: 1,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(2)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx1, tx2], seedWrapper.getRootViewingKeyWrapper());
            const txs = await txFetcher['sigsToElusivTxs']([
                { sigs: [tx1.signature!], nonce: tx1.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx1.nonce) },
                { sigs: [tx2.signature!], nonce: tx2.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx2.nonce) },
                { sigs: [], nonce: 2, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(2) },
            ]);
            expect(txs).to.deep.equal([tx1, tx2]);
        });

        it('Correctly converts sigs to txs for multiple txs with gaps everywhere', async () => {
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig3'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };
            const tx6: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig6'),
                nonce: 5,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(5),
                warden: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(6),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx3, tx6], seedWrapper.getRootViewingKeyWrapper());
            const txs = await txFetcher['sigsToElusivTxs']([
                { sigs: [], nonce: 0, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0) },
                { sigs: [], nonce: 1, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(1) },
                { sigs: [tx3.signature!], nonce: tx3.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx3.nonce) },
                { sigs: [], nonce: 3, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(3) },
                { sigs: [], nonce: 4, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(4) },
                { sigs: [tx6.signature!], nonce: tx6.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx6.nonce) },
                { sigs: [], nonce: 6, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(6) },
                { sigs: [], nonce: 7, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(7) },
            ]);
            expect(txs).to.deep.equal([tx3, tx6]);
        });

        it('Correctly converts sigs to txs for multiple txs with missing txs', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig2'),
                nonce: 1,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(2)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx1], seedWrapper.getRootViewingKeyWrapper());
            const txs = await txFetcher['sigsToElusivTxs']([
                { sigs: [tx1.signature!], nonce: tx1.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx1.nonce) },
                { sigs: [tx2.signature!], nonce: tx2.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx2.nonce) },
            ]);
            expect(txs).to.deep.equal([tx1]);
        });

        it('Correctly converts sigs to txs for multiple txs with gaps and missing txs', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig3'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx1], seedWrapper.getRootViewingKeyWrapper());
            const txs = await txFetcher['sigsToElusivTxs']([
                { sigs: [tx1.signature!], nonce: tx1.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx1.nonce) },
                { sigs: [], nonce: 1, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(1) },
                { sigs: [tx3.signature!], nonce: tx3.nonce, idKey: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(tx3.nonce) },
            ]);
            expect(txs).to.deep.equal([tx1]);
        });
    });

    describe('Gets sig from nonce tests', () => {
        it('Gets sig from nonce for empty sig array', async () => {
            txFetcher = new IdentifierTxFetcherInstance([], seedWrapper.getRootViewingKeyWrapper());
            const idKey = seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0);
            const sig = await txFetcher['getTxSigsForIdKeyFromBlockchain'](idKey);
            expect(sig).to.deep.equal([]);
        });

        it('Gets sig from nonce for one tx', async () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx], seedWrapper.getRootViewingKeyWrapper());
            const idKey = seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0);
            const sig = await txFetcher['getTxSigsForIdKeyFromBlockchain'](idKey);
            expect(sig).to.deep.equal([tx.signature!]);
        });

        it('Gets sig from nonce for multiple txs', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig2'),
                nonce: 1,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(1),
                warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig3'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(2),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx1, tx2, tx3], seedWrapper.getRootViewingKeyWrapper());

            const sig1 = await txFetcher['getTxSigsForIdKeyFromBlockchain'](seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0));
            const sig2 = await txFetcher['getTxSigsForIdKeyFromBlockchain'](seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(1));
            const sig3 = await txFetcher['getTxSigsForIdKeyFromBlockchain'](seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(2));
            expect(sig1).to.deep.equal([tx1.signature!]);
            expect(sig2).to.deep.equal([tx2.signature!]);
            expect(sig3).to.deep.equal([tx3.signature!]);
        });

        it('Gets sig from nonce for non-existent tx', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig2'),
                nonce: 1,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig3'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx1, tx2, tx3], seedWrapper.getRootViewingKeyWrapper());
            const idKey = seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(3);
            const sig = await txFetcher['getTxSigsForIdKeyFromBlockchain'](idKey);
            expect(sig).to.deep.equal([]);
        });

        it('Throws for more than one tx with same identifier', async () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig2'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx, tx2], seedWrapper.getRootViewingKeyWrapper());
            const idKey = seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0);
            expect(txFetcher['getTxSigsForIdKeyFromBlockchain'](idKey)).to.be.rejectedWith(INVALID_SIZE('Sigs for identifier', 2, 1));
        });
    });

    describe('Gets txs from nonces tests', () => {
        it('Gets txs from nonces for empty nonce array', async () => {
            txFetcher = new IdentifierTxFetcherInstance([], seedWrapper.getRootViewingKeyWrapper());
            let sigs = await txFetcher['getTxsFromNonces']([{ fst: 0, snd: true }]);
            expect(sigs).to.deep.equal([]);
            sigs = await txFetcher['getTxsFromNonces']([{ fst: 0, snd: false }]);
            expect(sigs).to.deep.equal([]);
        });

        it('Gets txs from nonces for one non-cached tx', async () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',

                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx], seedWrapper.getRootViewingKeyWrapper());
            const sigs = await txFetcher['getTxsFromNonces']([{ fst: 0, snd: false }]);
            expect(sigs).to.deep.equal([tx]);
        });

        it('Gets txs from nonces for one cached tx', async () => {
            const tx: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',

                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx, tx], seedWrapper.getRootViewingKeyWrapper());
            const sigs = await txFetcher['getTxsFromNonces']([{ fst: 0, snd: true }]);
            expect(sigs).to.deep.equal([]);
        });

        it('Gets txs from nonces for multiple non-cached txs', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',

                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',

                signature: stringToConfirmedSignature('sig2'),
                nonce: 1,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(1),
                warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',

                signature: stringToConfirmedSignature('sig3'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(2),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx1, tx2, tx3], seedWrapper.getRootViewingKeyWrapper());
            const sigs = await txFetcher['getTxsFromNonces']([
                { fst: 0, snd: false },
                { fst: 1, snd: false },
                { fst: 2, snd: false },
            ]);
            expect(sigs).to.deep.equal([tx1, tx2, tx3]);
        });

        it('Gets txs from nonces for multiple cached txs', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',

                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),

            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',

                signature: stringToConfirmedSignature('sig2'),
                nonce: 1,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',

                signature: stringToConfirmedSignature('sig3'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx1, tx2, tx3], seedWrapper.getRootViewingKeyWrapper());
            const sigs = await txFetcher['getTxsFromNonces']([
                { fst: 0, snd: true },
                { fst: 1, snd: true },
                { fst: 2, snd: true },
            ]);
            expect(sigs).to.deep.equal([]);
        });

        it('Gets txs from nonces for multiple mixed txs', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',

                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig2'),
                nonce: 1,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(1),
                warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            const tx3: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),

                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig3'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(2),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };

            txFetcher = new IdentifierTxFetcherInstance([tx1, tx2, tx3], seedWrapper.getRootViewingKeyWrapper());
            const sigs = await txFetcher['getTxsFromNonces']([
                { fst: 0, snd: true },
                { fst: 1, snd: false },
                { fst: 2, snd: true },
            ]);
            expect(sigs).to.deep.equal([tx2]);
        });

        it('Gets txs from nonces for multiple mixed txs with failed txs mixed in', async () => {
            const tx1: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',

                signature: stringToConfirmedSignature('sig1'),
                nonce: 0,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(0),
                warden: new PublicKey(new Uint8Array(32).fill(1)),
            };
            const tx2: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig2'),
                nonce: 1,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(1),
                warden: new PublicKey(new Uint8Array(32).fill(2)),
            };
            // Failed tx with same identifier and nonce
            const tx3Failed: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(10),
                fee: BigInt(12),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig4', 'someError4'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(2),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };
            const tx4: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(0),
                fee: BigInt(2),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig3'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(2),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };
            const tx5Failed: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(110),
                fee: BigInt(112),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig5', 'someError5'),
                nonce: 2,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(2),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };
            // Failed tx with different identifier and nonce
            const tx6Failed: ElusivTransaction = {
                commitmentHash: new Uint8Array([0]) as ReprScalar,
                merkleStartIndex: -1,
                amount: BigInt(1011),
                fee: BigInt(1211),
                tokenType: 'LAMPORTS',
                signature: stringToConfirmedSignature('sig6', 'someError6'),
                nonce: 3,
                txType: 'TOPUP',
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(3),
                warden: new PublicKey(new Uint8Array(32).fill(3)),
            };

            txFetcher = new IdentifierTxFetcherInstance(
                [tx1, tx2, tx3Failed, tx4, tx5Failed, tx6Failed],
                seedWrapper.getRootViewingKeyWrapper(),
            );
            const sigs = await txFetcher['getTxsFromNonces']([
                { fst: 0, snd: false },
                { fst: 1, snd: false },
                { fst: 2, snd: false },
            ]);
            expect(sigs).to.deep.equal([tx1, tx2, tx4]);
        });
    });
});

function stringToConfirmedSignature(string: string, err: TransactionError | null = null): ConfirmedSignatureInfo {
    return {
        slot: -1,
        signature: string,
        err,
        memo: null,
    };
}
