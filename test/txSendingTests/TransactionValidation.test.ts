// import { Keypair, PublicKey } from '@solana/web3.js';
// import { expect } from 'chai';
// import { IncompleteCommitment, Poseidon } from 'elusiv-cryptojs';
// import { SeedWrapper } from '../../src/sdk/clientCrypto/SeedWrapper.js';
// import { FeeVersionData } from '../../src/sdk/paramManagers/fee/FeeManager.js';
// import { getNumberFromTokenType } from '../../src/public/tokenTypes/TokenTypeFuncs.js';
// import { StoreTx } from '../../src/sdk/transactions/StoreTx.js';
// import { TransactionBuilding } from '../../src/sdk/transactions/txBuilding/TransactionBuilding.js';
// import { TransactionDataValidation } from '../../src/sdk/txSending/TransactionDataValidation.js';

// describe('Topup transaction validation tests', () => {
//     const senderPrivKey = Uint8Array.from([
//         137, 54, 226, 137, 48, 29, 236, 99, 17, 223, 104,
//         64, 5, 198, 87, 43, 220, 173, 175, 47, 233, 49,
//         204, 93, 185, 178, 132, 86, 208, 65, 12, 65, 56,
//         153, 60, 204, 13, 48, 64, 58, 113, 113, 143, 39,
//         104, 38, 206, 81, 198, 91, 224, 118, 120, 235, 206,
//         115, 63, 189, 34, 31, 27, 99, 87, 186,
//     ]);
//     const senderkeyPair = Keypair.fromSecretKey(senderPrivKey);

//     const amount = BigInt(100);
//     const tokenType = 'LAMPORTS';
//     const nonce = 1;
//     const parsedPrivateBalance = BigInt(20);
//     const merkleStartIndex = 3;
//     const hashAccIndex = 122;
//     const feeVersionData: FeeVersionData = { feeVersion: 20, minBatchingRate: 2 };

//     let commitment: IncompleteCommitment;
//     let storeTx: StoreTx;

//     const recentBlockhash = '46MJVK797tqpitKxLa5finuUX9gRpjjvZgAQRuXeNVY4';
//     const lastValidBlockHeight = 136915021;
//     const isRecipient = false;

//     let seedWrapper: SeedWrapper;

//     before(async () => {
//         await Poseidon.setupPoseidon();
//         seedWrapper = new SeedWrapper(new Uint8Array([1, 2, 3, 4, 5]));
//         commitment = new IncompleteCommitment(BigInt(20), amount, BigInt(getNumberFromTokenType(tokenType)), BigInt(merkleStartIndex), Poseidon.getPoseidon());
//         storeTx = {
//             txType: 'TOPUP',
//             tokenType,
//             amount: commitment.getBalance(),
//             commitment,
//             commitmentHash: commitment.getCommitmentHash(),
//             sender: senderkeyPair.publicKey,
//             parsedPrivateBalance,
//             merkleStartIndex,
//             isRecipient,
//             hashAccIndex,
//             nonce,
//             identifier: seedWrapper.getRootViewingKeyWrapper().getIdentifierKey(nonce),
//             warden: new PublicKey(new Uint8Array(32).fill(10)),
//             fee: BigInt(0),
//         };
//     });

//     it('should validate a valid topup transaction', async () => {
//         const tx = await TransactionBuilding['buildRawTopupTransaction'](
//             storeTx,
//             seedWrapper.getRootViewingKeyWrapper(),
//             'devnet',
//             feeVersionData,
//             {
//                 blockhash: recentBlockhash,
//                 lastValidBlockHeight,
//             },
//         );

//         tx.partialSign(senderkeyPair);

//         expect(await TransactionDataValidation.isValidTopupTransaction(seedWrapper.getRootViewingKeyWrapper(), tx, senderkeyPair.publicKey, nonce)).to.be.true;
//     });

//     // it('should not validate an unsigned topup transaction', async () => {
//     //     const tx = await TransactionBuilding['buildRawTopupTransaction'](
//     //         storeTx,
//     //         seedWrapper.getRootViewingKeyWrapper(),
//     //         'devnet',
//     //         feeVersionData,
//     //         {
//     //             blockhash: recentBlockhash,
//     //             lastValidBlockHeight,
//     //         },
//     //     );

//     //     expect(await TransactionDataValidation.isValidTopupTransaction(seedWrapper.getRootViewingKeyWrapper(), tx, senderkeyPair.publicKey, nonce)).to.not.be.true;
//     // });
//     // it('should not validate an topup transaction with too little instructions', async () => {
//     //     const tx = await TransactionBuilding['buildRawTopupTransaction'](
//     //         storeTx,
//     //         seedWrapper.getRootViewingKeyWrapper(),
//     //         'devnet',
//     //         feeVersionData,
//     //         {
//     //             blockhash: recentBlockhash,
//     //             lastValidBlockHeight,
//     //         },
//     //     );

//     //     tx.instructions = tx.instructions.slice(0, tx.instructions.length - 1);

//     //     expect(await TransactionDataValidation.isValidTopupTransaction(seedWrapper.getRootViewingKeyWrapper(), tx, senderkeyPair.publicKey, nonce)).to.not.be.true;
//     // });

//     // it('should not validate an topup transaction with too many instructions', async () => {
//     //     const tx = await TransactionBuilding['buildRawTopupTransaction'](
//     //         storeTx,
//     //         seedWrapper.getRootViewingKeyWrapper(),
//     //         'devnet',
//     //         feeVersionData,
//     //         {
//     //             blockhash: recentBlockhash,
//     //             lastValidBlockHeight,
//     //         },
//     //     );

//     //     tx.instructions.push(tx.instructions[0]);

//     //     expect(await TransactionDataValidation.isValidTopupTransaction(seedWrapper.getRootViewingKeyWrapper(), tx, senderkeyPair.publicKey, nonce)).to.not.be.true;
//     // });

//     // it('should not validate an topup transaction with wrongly ordered instructions', async () => {
//     //     const tx = await TransactionBuilding['buildRawTopupTransaction'](
//     //         storeTx,
//     //         seedWrapper.getRootViewingKeyWrapper(),
//     //         'devnet',
//     //         feeVersionData,
//     //         {
//     //             blockhash: recentBlockhash,
//     //             lastValidBlockHeight,
//     //         },
//     //     );

//     //     tx.instructions = tx.instructions.reverse();

//     //     expect(await TransactionDataValidation.isValidTopupTransaction(seedWrapper.getRootViewingKeyWrapper(), tx, senderkeyPair.publicKey, nonce)).to.not.be.true;
//     // });

//     // it('should not validate an topup transaction with wrong instructions', async () => {
//     //     const tx = await TransactionBuilding['buildRawTopupTransaction'](
//     //         storeTx,
//     //         seedWrapper.getRootViewingKeyWrapper(),
//     //         'devnet',
//     //         feeVersionData,
//     //         {
//     //             blockhash: recentBlockhash,
//     //             lastValidBlockHeight,
//     //         },
//     //     );

//     //     tx.instructions[0] = tx.instructions[1];

//     //     expect(await TransactionDataValidation.isValidTopupTransaction(seedWrapper.getRootViewingKeyWrapper(), tx, senderkeyPair.publicKey, nonce)).to.not.be.true;
//     // });

//     // it('should not validate an topup transaction signed by the wrong key', async () => {
//     //     // senderkeyPair is the wrong key in this case
//     //     const realSender = new PublicKey('6TkKqq15wXjqEjNg9zqTKADwuVATR9dW3rkNnsYme1ea');

//     //     const tx = await TransactionBuilding['buildRawTopupTransaction'](
//     //         storeTx,
//     //         seedWrapper.getRootViewingKeyWrapper(),
//     //         'devnet',
//     //         feeVersionData,
//     //         {
//     //             blockhash: recentBlockhash,
//     //             lastValidBlockHeight,
//     //         },
//     //     );

//     //     tx.partialSign(senderkeyPair);

//     //     expect(await TransactionDataValidation.isValidTopupTransaction(seedWrapper.getRootViewingKeyWrapper(), tx, realSender, nonce)).to.not.be.true;
//     // });

//     // it('should not validate an topup transaction with an incorrect nonce', async () => {
//     //     const tx = await TransactionBuilding['buildRawTopupTransaction'](
//     //         storeTx,
//     //         seedWrapper.getRootViewingKeyWrapper(),
//     //         'devnet',
//     //         feeVersionData,
//     //         {
//     //             blockhash: recentBlockhash,
//     //             lastValidBlockHeight,
//     //         },
//     //     );

//     //     const wrongNonce = nonce + 1;
//     //     tx.partialSign(senderkeyPair);

//     //     expect(await TransactionDataValidation.isValidTopupTransaction(seedWrapper.getRootViewingKeyWrapper(), tx, senderkeyPair.publicKey, wrongNonce)).to.not.be.true;
//     // });
// });
