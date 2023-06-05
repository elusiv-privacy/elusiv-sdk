import {
    LAMPORTS_PER_SOL, PublicKey, Transaction,
} from '@solana/web3.js';
import { verifySendQuadraProof } from 'elusiv-circuits/dist/proofVerification';
import {
    IncompleteCommitment, Poseidon,
} from 'elusiv-cryptojs';
import { bigIntToNumber } from 'elusiv-serialization';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { getSendQuadraProofParamsStatic } from 'elusiv-circuits';
import { TopupTxData } from '../../../src/public/txData/TopupTxData';
import { SendTxData } from '../../../src/public/txData/SendTxData';
import { Fee, getTotalFeeAmount } from '../../../src/public/Fee';
import { WardenInfo } from '../../../src/public/WardenInfo';
import { SeedWrapper } from '../../../src/sdk/clientCrypto/SeedWrapper.js';
import {
    MERGE_NEEDED,
    MERKLE_TREE_HEIGHT, SEND_ARITY, TOO_SMALL_SIZE,
} from '../../../src/constants.js';
import { FeeCalculator } from '../../../src/sdk/paramManagers/fee/FeeCalculator.js';
import { FeeVersionData } from '../../../src/sdk/paramManagers/fee/FeeManager.js';
import { FeeUtils } from '../../../src/sdk/paramManagers/fee/FeeUtils.js';
import { getNumberFromTokenType } from '../../../src/public/tokenTypes/TokenTypeFuncs.js';
import { StoreTx } from '../../../src/sdk/transactions/StoreTx.js';
import { InstructionBuilding } from '../../../src/sdk/transactions/txBuilding/InstructionBuilding.js';
import { SendRemoteParams, TopupRemoteParams } from '../../../src/sdk/transactions/txBuilding/RemoteParamFetching.js';
import { TransactionBuilding } from '../../../src/sdk/transactions/txBuilding/TransactionBuilding.js';
import { FeeCalculatorDriver } from '../../helpers/drivers/FeeCalculatorDriver.js';
import { activateCommitmentsSIMULATED } from '../../utils.js';
import { TokenType } from '../../../src/public/tokenTypes/TokenType';

// Need to import like this to get chai-as-promised to work

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Topup transaction fee tests', () => {
    it('Correctly generates topup fee for Lamports', () => {
        const tokenType: TokenType = 'LAMPORTS';
        const lamportsPerToken = 1;
        const amount = BigInt(10_000);
        const storeFee: Fee = {
            tokenType: 'LAMPORTS', txFee: 500000, privacyFee: 100000, tokenAccRent: 0, lamportsPerToken, extraFee: 0,

        };
        const feeCalculator = new FeeCalculatorDriver(storeFee);

        const expected: Fee = {
            tokenType: 'LAMPORTS',
            txFee: 500000,
            privacyFee: 100000,
            tokenAccRent: 0,
            lamportsPerToken,
            extraFee: 0,
        };

        expect(TransactionBuilding['generateTopupFee'](feeCalculator as unknown as FeeCalculator, tokenType, amount, lamportsPerToken)).to.deep.equal(expected);
    });

    it('Correctly generates topup fee for different tokentype', () => {
        const tokenType: TokenType = 'USDC';
        const lamportsPerToken = 20;
        const amount = BigInt(10_000);
        const storeFee: Fee = {
            tokenType: 'LAMPORTS', txFee: 500_000, privacyFee: 100_000, tokenAccRent: 0, lamportsPerToken, extraFee: 0,

        };
        const feeCalculator = new FeeCalculatorDriver(storeFee);

        const expected: Fee = {
            tokenType: 'USDC',
            txFee: 25_500,
            privacyFee: 5_100,
            tokenAccRent: 0,
            lamportsPerToken,
            extraFee: 0,
        };

        expect(TransactionBuilding['generateTopupFee'](feeCalculator as unknown as FeeCalculator, tokenType, amount, lamportsPerToken)).to.deep.equal(expected);
    });
});

for (const t of ['LAMPORTS', 'USDC'] as TokenType[]) {
    describe(`Raw topup transaction building tests with tokentype ${t}`, () => {
        const sender = new PublicKey('42tgKNsBuuXwxPhYNixCp4jRkkh8rvwfLUiAdZArWWR3');
        const amount = BigInt(1000000000);
        const nonce = 1;
        const parsedPrivateBalance = BigInt(2000);
        const hashAccIndex = 2;
        const merkleStartIndex = 3;
        const lamportsPerToken = 1 / LAMPORTS_PER_SOL;
        const storeFee: Fee = {
            tokenType: 'LAMPORTS', txFee: 500000, privacyFee: 100000, tokenAccRent: 0, lamportsPerToken, extraFee: 0,

        };
        const feeCalculator = new FeeCalculatorDriver(storeFee) as unknown as FeeCalculator;
        const feeVersionData: FeeVersionData = { feeVersion: 4, minBatchingRate: 5 };
        const recentBlockhash = '123';
        const lastValidBlockHeight = 100;
        const isRecipient = true;
        const warden = new PublicKey(new Uint8Array(32).fill(11));

        let tx: Transaction;
        let fee: Fee;
        let storeTx: StoreTx;

        let seedWrapper: SeedWrapper;

        before(async function () {
            this.timeout(5000);
            await Poseidon.setupPoseidon();
            seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5]));
            const commitment: IncompleteCommitment = InstructionBuilding.buildTopupCommitment(
                nonce,
                amount,
                t,
                merkleStartIndex,
                seedWrapper,
            );
            fee = TransactionBuilding['generateTopupFee'](
                feeCalculator,
                t,
                amount,
                lamportsPerToken,
            );

            storeTx = {
                txType: 'TOPUP',
                tokenType: t,
                nonce,
                amount: commitment.getBalance(),
                commitment,
                commitmentHash: commitment.getCommitmentHash(),
                sender,
                parsedPrivateBalance,
                merkleStartIndex,
                isRecipient,
                hashAccIndex,
                identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
                warden,
                fee: BigInt(getTotalFeeAmount(fee)),
            };

            tx = await TransactionBuilding['buildRawTopupTransaction'](
                storeTx,
                seedWrapper.getRootViewingKeyWrapper(),
                'devnet',
                feeVersionData,
                {
                    blockhash: recentBlockhash,
                    lastValidBlockHeight,
                },
            );
        });

        it('Correctly builds raw topup transaction general data', () => {
            expect(tx.feePayer).to.deep.equal(warden);
            expect(tx.recentBlockhash).to.deep.equal(recentBlockhash);
            expect(tx.lastValidBlockHeight).to.deep.equal(lastValidBlockHeight);
        });

        it('Correctly builds raw topup transaction instructions', async () => {
            // Verify the instructions our tx should have
            const ixs = await InstructionBuilding.buildTopupInstructions(
                seedWrapper.getRootViewingKeyWrapper(),
                storeTx,
                'devnet',
                feeVersionData,
            );

            expect(tx.instructions.length).to.equal(4);
            expect(tx.instructions[0]).to.deep.equal(ixs[0]);
            expect(tx.instructions[1]).to.deep.equal(ixs[1]);
            expect(tx.instructions[2]).to.deep.equal(ixs[2]);
            expect(tx.instructions[3]).to.deep.equal(ixs[3]);
        });

        it(`Correctly builds raw topup transaction fee (tokentype ${t})`, () => {
            expect(fee).to.deep.equal(FeeUtils.lamportFeeToTokenFee(storeFee, t, lamportsPerToken, 0));
        });
    });

    describe(`Topup transaction data building tests with tokentype ${t}`, () => {
        const sender = new PublicKey('42tgKNsBuuXwxPhYNixCp4jRkkh8rvwfLUiAdZArWWR3');
        const amount = BigInt(2000);
        const lastNonce = 1;
        const merkleStartIndex = 4;
        const lamportsPerToken = 1 / LAMPORTS_PER_SOL;
        const storeFee: Fee = {
            tokenType: 'LAMPORTS', txFee: 500000, privacyFee: 100000, tokenAccRent: 0, lamportsPerToken, extraFee: 0,
        };
        const sendFee: Fee = {
            tokenType: 'LAMPORTS', txFee: 200000, privacyFee: 400000, tokenAccRent: 0, lamportsPerToken, extraFee: 0,
        };
        const feeCalculator = new FeeCalculatorDriver(storeFee, sendFee) as unknown as FeeCalculator as FeeCalculator;
        const feeVersionData: FeeVersionData = { feeVersion: 5, minBatchingRate: 6 };
        const recentBlockhash = '123';
        const lastValidBlockHeight = 100;
        const wardenInfo: WardenInfo = {
            url: 'http://localhost:8080',
            pubKey: new PublicKey('42tgKNsBuuXwxPhYNixCp4jRkkh8rvwfLUiAdZArWWR3'),
        };
        const isRecipient = false;
        let seedWrapper: SeedWrapper;

        before(async () => {
            await Poseidon.setupPoseidon();
            seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5]));
        });

        it('Builds topup transaction with one commitment', async () => {
            const nullifier = BigInt(456);
            const balance = BigInt(1789);
            const commitment: IncompleteCommitment = new IncompleteCommitment(
                nullifier,
                balance,
                BigInt(getNumberFromTokenType(t)),
                BigInt(merkleStartIndex),
                Poseidon.getPoseidon(),
            );

            const activeCommitments = activateCommitmentsSIMULATED([commitment], MERKLE_TREE_HEIGHT);

            const remoteParams: TopupRemoteParams = {
                feeCalculator,
                feeVersionData,
                activeCommitments,
                lastNonce,
                merkleStartIndex,
                lamportsPerToken,
                chainState: {
                    lastValidBlockHeight,
                    blockhash: recentBlockhash,
                },
                sendQuadraProofParams: getSendQuadraProofParamsStatic(),
                tokenAccRent: BigInt(0),
            };

            const topup: TopupTxData = await TransactionBuilding.buildTopUpTxData(
                bigIntToNumber(amount),
                t,
                sender,
                isRecipient,
                remoteParams,
                wardenInfo,
                seedWrapper,
                'devnet',
                undefined,
            );

            expect(topup.lastNonce).to.equal(lastNonce);
            expect(topup.tokenType).to.equal(t);
            expect(topup.wardenInfo).to.deep.equal(wardenInfo);
            expect(topup.txType).to.equal('TOPUP');
        });

        it('Builds topup transaction with two commitments', async () => {
            const nullifiers = [BigInt(789), BigInt(123)];
            const balances = [BigInt(1456), BigInt(1789)];
            const commitments: IncompleteCommitment[] = [
                new IncompleteCommitment(
                    nullifiers[0],
                    balances[0],
                    BigInt(getNumberFromTokenType(t)),
                    BigInt(merkleStartIndex),
                    Poseidon.getPoseidon(),
                ),
                new IncompleteCommitment(
                    nullifiers[1],
                    balances[1],
                    BigInt(getNumberFromTokenType(t)),
                    BigInt(merkleStartIndex),
                    Poseidon.getPoseidon(),
                ),
            ];

            const activeCommitments = activateCommitmentsSIMULATED(commitments, MERKLE_TREE_HEIGHT);

            const remoteParams: TopupRemoteParams = {
                feeCalculator,
                feeVersionData,
                activeCommitments,
                lastNonce,
                merkleStartIndex,
                lamportsPerToken,
                chainState: {
                    lastValidBlockHeight,
                    blockhash: recentBlockhash,
                },
                sendQuadraProofParams: getSendQuadraProofParamsStatic(),
                tokenAccRent: BigInt(0),
            };

            const topup: TopupTxData = await TransactionBuilding.buildTopUpTxData(

                bigIntToNumber(amount),
                t,
                sender,
                isRecipient,
                remoteParams,
                wardenInfo,
                seedWrapper,
                'devnet',
                undefined,
            );

            expect(topup.lastNonce).to.equal(lastNonce);
            expect(topup.tokenType).to.equal(t);
            expect(topup.wardenInfo).to.deep.equal(wardenInfo);
            expect(topup.txType).to.equal('TOPUP');
        });

        it('Builds topup transaction with SEND_ARITY - 1 commitments', async () => {
            const commitments: IncompleteCommitment[] = [];
            for (let i = 0; i < SEND_ARITY - 1; i++) {
                commitments.push(
                    new IncompleteCommitment(
                        BigInt(i + 1),
                        BigInt(i + 1),
                        BigInt(getNumberFromTokenType(t)),
                        BigInt(merkleStartIndex),
                        Poseidon.getPoseidon(),
                    ),
                );
            }

            const activeCommitments = activateCommitmentsSIMULATED(commitments, MERKLE_TREE_HEIGHT);

            const remoteParams: TopupRemoteParams = {
                feeCalculator,
                feeVersionData,
                activeCommitments,
                lastNonce,
                merkleStartIndex,
                lamportsPerToken,
                chainState: {
                    lastValidBlockHeight,
                    blockhash: recentBlockhash,
                },
                sendQuadraProofParams: getSendQuadraProofParamsStatic(),
                tokenAccRent: BigInt(0),
            };

            const topup: TopupTxData = await TransactionBuilding.buildTopUpTxData(

                bigIntToNumber(amount),
                t,
                sender,
                isRecipient,
                remoteParams,
                wardenInfo,
                seedWrapper,
                'devnet',
                undefined,
            );

            expect(topup.lastNonce).to.equal(lastNonce);
            expect(topup.tokenType).to.equal(t);
            expect(topup.wardenInfo).to.deep.equal(wardenInfo);
            expect(topup.txType).to.equal('TOPUP');
        });

        it('Builds topup transaction with SEND_ARITY commitments and provided mergeFee', async () => {
            const commitments: IncompleteCommitment[] = [];
            for (let i = 0; i < SEND_ARITY; i++) {
                commitments.push(
                    new IncompleteCommitment(
                        BigInt((i + 1) * 500000),
                        BigInt((i + 1) * 500000),
                        BigInt(getNumberFromTokenType(t)),
                        BigInt(merkleStartIndex),
                        Poseidon.getPoseidon(),
                    ),
                );
            }

            const activeCommitments = activateCommitmentsSIMULATED(commitments, MERKLE_TREE_HEIGHT);

            const remoteParams: TopupRemoteParams = {
                feeCalculator,
                feeVersionData,
                activeCommitments,
                lastNonce,
                merkleStartIndex,
                lamportsPerToken,
                chainState: {
                    lastValidBlockHeight,
                    blockhash: recentBlockhash,
                },
                sendQuadraProofParams: getSendQuadraProofParamsStatic(),
                tokenAccRent: BigInt(0),
            };

            const mergeFee = 100;

            const topup: TopupTxData = await TransactionBuilding.buildTopUpTxData(
                bigIntToNumber(amount),
                t,
                sender,
                isRecipient,
                remoteParams,
                wardenInfo,
                seedWrapper,
                'devnet',
                mergeFee,
            );

            expect(topup.lastNonce).to.equal(lastNonce);
            expect(topup.tokenType).to.equal(t);
            expect(topup.wardenInfo).to.deep.equal(wardenInfo);
            expect(topup.txType).to.equal('TOPUP');
        }).timeout(50000);

        it('Throws for building topup transaction with SEND_ARITY commitments and no provided mergeFee', async () => {
            const commitments: IncompleteCommitment[] = [];
            for (let i = 0; i < SEND_ARITY; i++) {
                commitments.push(
                    new IncompleteCommitment(
                        BigInt((i + 1) * 500000),
                        BigInt((i + 1) * 500000),
                        BigInt(getNumberFromTokenType(t)),
                        BigInt(merkleStartIndex),
                        Poseidon.getPoseidon(),
                    ),
                );
            }

            const activeCommitments = activateCommitmentsSIMULATED(commitments, MERKLE_TREE_HEIGHT);

            const remoteParams: TopupRemoteParams = {
                feeCalculator,
                feeVersionData,
                activeCommitments,
                lastNonce,
                merkleStartIndex,
                lamportsPerToken,
                chainState: {
                    lastValidBlockHeight,
                    blockhash: recentBlockhash,
                },
                sendQuadraProofParams: getSendQuadraProofParamsStatic(),
                tokenAccRent: BigInt(0),
            };

            await expect(
                TransactionBuilding.buildTopUpTxData(
                    bigIntToNumber(amount),
                    t,
                    sender,
                    isRecipient,
                    remoteParams,
                    wardenInfo,
                    seedWrapper,
                    'devnet',
                    undefined,
                ),
            ).to.be.rejectedWith(MERGE_NEEDED);
        }).timeout(50000);
    });

    for (const refKey of [undefined, new PublicKey('Gaap5ancMSsBC3vkChyebepym5dcTNRYeg2LVG464E96')]) {
        describe(`Send transaction data building tests with tokentype ${t} and refkey ${refKey}`, () => {
            let seedWrapper: SeedWrapper;
            before(async () => {
                await Poseidon.setupPoseidon();
                seedWrapper = new SeedWrapper(Uint8Array.from([1, 2, 3, 4, 5]));
            });

            it('Correctly builds a SendTx for SEND_ARITY commitments', async () => {
                const amount = BigInt(1_000_000);
                const recipient = new PublicKey('2fE2isAcvoG2UKGCJhe9YFjPW1qnt4UkBgHPW4QZnkZu');
                const owner = new PublicKey('Habp5bncMSsBC3vkChyebepym5dcTNRYeg2LVG464E96');
                const lastNonce = 1;
                const merkleIndex = 2;
                const lamportsPerToken = 1;
                const sendFee: Fee = {
                    tokenType: 'LAMPORTS', tokenAccRent: 0, lamportsPerToken, txFee: 200000, privacyFee: 400000, extraFee: 0,
                };
                const feeCalculator = new FeeCalculatorDriver(undefined, sendFee) as unknown as FeeCalculator as FeeCalculator;
                const feeVersionData: FeeVersionData = { feeVersion: 5, minBatchingRate: 6 };
                const tokenSendFee = BigInt(34);

                const commitments: IncompleteCommitment[] = [];
                for (let i = 0; i < SEND_ARITY; i++) {
                    commitments.push(
                        new IncompleteCommitment(
                            BigInt((i + 1) * 5_000_000),
                            BigInt((i + 1) * 5_000_000),
                            BigInt(getNumberFromTokenType(t)),
                            BigInt(merkleIndex),
                            Poseidon.getPoseidon(),
                        ),
                    );
                }

                const activeCommitments = activateCommitmentsSIMULATED(commitments, MERKLE_TREE_HEIGHT);

                const remoteParams: SendRemoteParams = {
                    feeCalculator,
                    feeVersion: feeVersionData.feeVersion,
                    activeCommitments,
                    lastNonce,
                    merkleStartIndex: merkleIndex,
                    lamportsPerToken,
                    tokenAccRent: tokenSendFee,
                    sendQuadraProofParams: getSendQuadraProofParamsStatic(),
                };

                const wardenInfo: WardenInfo = {
                    url: 'http://localhost:8080',
                    pubKey: new PublicKey('42tgKNsBuuXwxPhYNixCp4jRkkh8rvwfLUiAdZArWWR3'),
                };

                const sendTx: SendTxData = await TransactionBuilding.buildSendTxData(

                    bigIntToNumber(amount),
                    t,
                    { owner: recipient, TA: recipient, exists: false },
                    owner,
                    remoteParams,
                    wardenInfo,
                    seedWrapper,
                    refKey,
                );

                const validProof = await verifySendQuadraProof(
                    sendTx.proof.proof,
                    sendTx.proof.publicInputs.toArr(),
                );

                expect(sendTx.lastNonce).to.equal(lastNonce);
                expect(sendTx.tokenType).to.equal(t);
                expect(sendTx.wardenInfo).to.deep.equal(wardenInfo);
                expect(sendTx.txType).to.equal('SEND');
                expect(await validProof).to.be.true;
            }).timeout(15000);

            it('Builds a SendTx with 1 commitment', async () => {
                const amount = BigInt(1_000_000);
                const recipient = new PublicKey('2fE2isAcvoG2UKGCJhe9YFjPW1qnt4UkBgHPW4QZnkZu');
                const owner = new PublicKey('Habp5bncMSsBC3vkChyebepym5dcTNRYeg2LVG464E96');
                const lastNonce = 1;
                const merkleIndex = 2;
                const lamportsPerToken = 1;
                const sendFee: Fee = {
                    tokenAccRent: 0, tokenType: 'LAMPORTS', lamportsPerToken, txFee: 200000, privacyFee: 400000, extraFee: 0,
                };
                const feeCalculator = new FeeCalculatorDriver(undefined, sendFee) as unknown as FeeCalculator as FeeCalculator;
                const feeVersionData: FeeVersionData = { feeVersion: 5, minBatchingRate: 6 };
                const tokenSendFee = BigInt(34);

                const commitments: IncompleteCommitment[] = [];
                for (let i = 0; i < 1; i++) {
                    commitments.push(
                        new IncompleteCommitment(
                            BigInt((i + 1) * 5_000_000),
                            BigInt((i + 1) * 5_000_000),
                            BigInt(getNumberFromTokenType(t)),
                            BigInt(merkleIndex),
                            Poseidon.getPoseidon(),
                        ),
                    );
                }

                const activeCommitments = activateCommitmentsSIMULATED(commitments, MERKLE_TREE_HEIGHT);

                const remoteParams: SendRemoteParams = {
                    feeCalculator,
                    feeVersion: feeVersionData.feeVersion,
                    activeCommitments,
                    lastNonce,
                    merkleStartIndex: merkleIndex,
                    lamportsPerToken,
                    tokenAccRent: tokenSendFee,
                    sendQuadraProofParams: getSendQuadraProofParamsStatic(),
                };

                const wardenInfo: WardenInfo = {
                    url: 'http://localhost:8080',
                    pubKey: new PublicKey('42tgKNsBuuXwxPhYNixCp4jRkkh8rvwfLUiAdZArWWR3'),
                };

                const sendTx: SendTxData = await TransactionBuilding.buildSendTxData(

                    bigIntToNumber(amount),
                    t,
                    { owner: recipient, TA: recipient, exists: false },
                    owner,
                    remoteParams,
                    wardenInfo,
                    seedWrapper,
                    refKey,
                );

                const validProof = await verifySendQuadraProof(
                    sendTx.proof.proof,
                    sendTx.proof.publicInputs.toArr(),
                );

                expect(sendTx.lastNonce).to.equal(lastNonce);
                expect(sendTx.tokenType).to.equal(t);
                expect(sendTx.wardenInfo).to.deep.equal(wardenInfo);
                expect(sendTx.txType).to.equal('SEND');
                expect(await validProof).to.be.true;
            }).timeout(15000);

            it('Throws for building a SendTx with 0 commitments', async () => {
                const amount = BigInt(1_000_000);
                const recipient = new PublicKey('2fE2isAcvoG2UKGCJhe9YFjPW1qnt4UkBgHPW4QZnkZu');
                const owner = new PublicKey('Habp5bncMSsBC3vkChyebepym5dcTNRYeg2LVG464E96');
                const lastNonce = 1;
                const merkleIndex = 2;
                const lamportsPerToken = 1;
                const sendFee: Fee = {
                    lamportsPerToken, tokenAccRent: 0, tokenType: 'LAMPORTS', txFee: 200000, privacyFee: 400000, extraFee: 0,

                };
                const feeCalculator = new FeeCalculatorDriver(undefined, sendFee) as unknown as FeeCalculator as FeeCalculator;
                const feeVersionData: FeeVersionData = { feeVersion: 5, minBatchingRate: 6 };
                const tokenSendFee = BigInt(34);

                const commitments: IncompleteCommitment[] = [];

                const activeCommitments = activateCommitmentsSIMULATED(commitments, MERKLE_TREE_HEIGHT);

                const remoteParams: SendRemoteParams = {
                    feeCalculator,
                    feeVersion: feeVersionData.feeVersion,
                    activeCommitments,
                    lastNonce,
                    merkleStartIndex: merkleIndex,
                    lamportsPerToken,
                    tokenAccRent: tokenSendFee,
                    sendQuadraProofParams: getSendQuadraProofParamsStatic(),
                };

                const wardenInfo: WardenInfo = {
                    url: 'http://localhost:8080',
                    pubKey: new PublicKey('42tgKNsBuuXwxPhYNixCp4jRkkh8rvwfLUiAdZArWWR3'),
                };

                expect(TransactionBuilding.buildSendTxData(

                    bigIntToNumber(amount),
                    (t),
                    { owner: recipient, TA: recipient, exists: false },
                    owner,
                    remoteParams,
                    wardenInfo,
                    seedWrapper,
                    refKey,
                )).to.be.rejectedWith(new Error(TOO_SMALL_SIZE('active commitments', 0, 1)));
            });
        });
    }
}
