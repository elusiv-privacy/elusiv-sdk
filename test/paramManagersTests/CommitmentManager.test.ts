// import { PublicKey } from '@solana/web3.js';
// import { expect } from 'chai';
// import {
//     IncompleteCommitment, MerkleTree, Poseidon, seededRandomUNSAFE,
// } from 'elusiv-cryptojs';
// import { CommitmentManager } from '../../src/paramManagers/CommitmentManager.js';
// import { TreeManager } from '../../src/paramManagers/TreeManager.js';
// import { getNumberFromTokenType, TokenType } from '../../src/public/tokenTypes/TokenTypeFuncs.js';
// import { TxTypes } from '../../src/public/TxTypes.js';
// import { ElusivTransaction } from '../../src/transactions/ElusivTransaction.js';
// import { TransactionManager } from '../../src/txManagers/TransactionManager.js';
// import { TreeManagerDriver } from '../helpers/drivers/TreeManagerDriver.js';
// import { TxManagerDriver } from '../helpers/drivers/TxManagerDriver.js';

// const randomUNSAFE = seededRandomUNSAFE(42);

// describe('CommitmentManager tests', () => {
//     let commManager : CommitmentManager;

//     const tokenTypes : TokenType[] = [
//         'LAMPORTS',
//         'USDC',
//     ];

//     const counts = [
//         0,
//         1,
//         4,
//         10,
//     ];

//     before(async () => {
//         await Poseidon.setupPoseidon();
//     });

//     counts.forEach((count) => {
//         tokenTypes.forEach((tokenType) => {
//             describe(`Testing with mixed token txs for tokentype ${tokenType} and ${count} total commitments`, () => {
//                 let txs : ElusivTransaction[];
//                 let actveTxs : Map<TokenType, ElusivTransaction[]>;
//                 let tree : MerkleTree;

//                 before(async () => {
//                     const res = generateActiveTransactions(count, tokenTypes, ['SEND', 'TOPUP']);
//                     txs = res.txs;
//                     actveTxs = res.activeTxs;
//                     tree = new MerkleTree(20, Poseidon.getPoseidon());
//                     for (let i = txs.length - 1; i >= 0; i--) {
//                         const tx = txs[i];
//                         // eslint-disable-next-line no-await-in-loop
//                         await tree.insert(tx. commitment.getCommitmentHashBigInt());
//                     }
//                     const treeManager = new TreeManagerDriver(tree) as unknown as TreeManager;
//                     const txManager = new TxManagerDriver(txs) as unknown as TransactionManager;
//                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                     commManager = new (CommitmentManager as any)(txManager, treeManager) as CommitmentManager;
//                 });

//                 it('Fetches the correct active incomplete commitments', async () => {
//                     const commitments = await commManager.getActiveIncompleteCommitments(tokenType);
//                     // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//                     const expectedTxs = actveTxs.get(tokenType)!;

//                     expect(commitments.commitments.toArray().length).to.equal(expectedTxs.length);

//                     for (let i = 0; i < expectedTxs.length; i++) {
//                         const expectedTx = expectedTxs[i];
//                         const commitment = commitments.commitments.toArray()[i];
//                         expect(commitment.equals(expectedTx.commitment)).to.be.true;
//                     }
//                 });

//                 it('Fetches the correct active commitments', async () => {
//                     const commitments = await commManager.getActiveCommitments(tokenType);
//                     // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//                     const expectedTxs = actveTxs.get(tokenType)!;

//                     expect(commitments.toArray().length).to.equal(expectedTxs.length);

//                     for (let i = 0; i < expectedTxs.length; i++) {
//                         const expectedTx = expectedTxs[i];
//                         const commitment = commitments.toArray()[i];
//                         expect(expectedTx.commitment.equals(commitment)).to.be.true;
//                         expect(commitment.getRoot()).to.equal(tree.getRoot());
//                         expect(commitment.getIndex()).to.equal(tree.getLeafIndex(0, commitment.getCommitmentHashBigInt()));
//                         expect(commitment.getOpening()).to.deep.equal(tree.getOpening(commitment.getIndex()));
//                     }
//                 });
//             });
//         });
//     });
// });

// function generateActiveTransactions(count : number, tokenTypes: TokenType[], txTypes : TxTypes[]) : {txs : ElusivTransaction[], activeTxs : Map<TokenType, ElusivTransaction[]>} {
//     const txs : ElusivTransaction[] = [];
//     const activeTxsEndIndices : Map<TokenType, number> = new Map();
//     for (let i = count - 1; i >= 0; i--) {
//         const txType = txTypes[Math.floor(randomUNSAFE() * txTypes.length)];
//         const tokenType = tokenTypes[Math.floor(randomUNSAFE() * tokenTypes.length)];
//         if (txType === 'SEND' && activeTxsEndIndices.get(tokenType) === undefined) {
//             activeTxsEndIndices.set(tokenType, count - i);
//         }
//         const commitment = new IncompleteCommitment(BigInt(i), BigInt(i * 10), BigInt(i * 100), BigInt(getNumberFromTokenType(tokenType)), Poseidon.getPoseidon());
//         const identifier = new PublicKey(new Uint8Array(32).fill(i));
//         txs.push({
//             nonce: i,
//             txType,
//             tokenType,
//             commitment,
//             identifier,
//         });
//     }

//     const activeTxs : Map<TokenType, ElusivTransaction[]> = new Map();
//     for (const tokenType of tokenTypes) {
//         const endIndex = activeTxsEndIndices.get(tokenType) ? activeTxsEndIndices.get(tokenType) : txs.length;
//         activeTxs.set(tokenType, txs.slice(0, endIndex).filter((tx) => tx.tokenType === tokenType).slice(0, 4));
//     }

//     return { txs, activeTxs };
// }
