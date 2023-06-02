// /* eslint-disable @typescript-eslint/no-non-null-assertion */
// import { ReprScalar } from 'elusiv-cryptojs';
// import { expect } from 'chai';
// import { padLE } from 'elusiv-serialization';
// import { SystemProgram } from '@solana/web3.js';
// import { InitVerificationInstruction } from '../../../src/sdk/transactions/instructions/InitVerificationInstruction.js';
// import { MAX_MT_COUNT, SEND_ARITY } from '../../../src/constants.js';
// import { bytesToBs58 } from '../../../src/sdk/utils/base58Utils.js';

// describe('InitVerificationInstruction tests', () => {
//     const verAccIndex = 0;
//     const vKeyId = 1;
//     const treeIndices = [2, 3];
//     // Commitment count can be anything from 1 to SEND_ARITY
//     const commitmentCounts = new Array(SEND_ARITY).fill(0).map((_, i) => i + 1);
//     const roots = [new Uint8Array(32).fill(1), new Uint8Array(32).fill(2), new Uint8Array(32).fill(3), new Uint8Array(32).fill(4)] as ReprScalar[];
//     const nullifierHashes = [new Uint8Array(32).fill(5), new Uint8Array(32).fill(6), new Uint8Array(32).fill(7), new Uint8Array(32).fill(8)] as ReprScalar[];
//     const commitment = new Uint8Array(32).fill(9) as ReprScalar;
//     const commIndex = 11;
//     const feeVersion = 4;
//     const amount = BigInt(5);
//     const fee = BigInt(6);
//     const tokenId = 'LAMPORTS';
//     const recipientIsAssociatedTokenAccount = true;
//     const hashedInputs = new Uint8Array(32).fill(10) as ReprScalar;
//     const skipNullifierPDA = true;

//     commitmentCounts.forEach((commitmentCount) => {
//         describe(`testing with commitmentCount = ${commitmentCount}`, () => {
//             let instructionBytes: Uint8Array;
//             before(() => {
//                 const initVerificationInstruction = new InitVerificationInstruction(
//                     verAccIndex,
//                     vKeyId,
//                     treeIndices,
//                     commitmentCount,
//                     [roots[0], roots[0], roots[0], roots[0]],
//                     nullifierHashes.slice(0, commitmentCount),
//                     commitment,
//                     commIndex,
//                     feeVersion,
//                     amount,
//                     fee,
//                     tokenId,
//                     recipientIsAssociatedTokenAccount,
//                     hashedInputs,
//                     skipNullifierPDA,
//                     false,
//                 );

//                 //                 instructionBytes = initVerificationInstruction.compile();
//                 //             });

//                 it('should create and parse the initVerification instruction', async () => {
//                     const parsed = InitVerificationInstruction.parseInstruction(
//                         {
//                             programId: SystemProgram.programId,
//                             accounts: [],
//                             data: bytesToBs58(instructionBytes),
//                         },
//                     );

//                     expect(parsed).to.not.be.null;
//                     if (parsed !== null) {
//                         expect(parsed!.verAccIndex).to.deep.equal(verAccIndex);
//                         expect(parsed!.vKeyId).to.deep.equal(vKeyId);
//                         expect(parsed!.treeIndices).to.deep.equal(treeIndices);
//                         expect(parsed!.commitmentCount).to.deep.equal(commitmentCount);
//                         expect(parsed!.roots).to.deep.equal([roots[0], roots[0], roots[0], roots[0]].slice(0, parsed?.roots.length));
//                         expect(parsed!.nullifierHashes).to.deep.equal(nullifierHashes.slice(0, commitmentCount));
//                         expect(parsed!.commitmentHash).to.deep.equal(commitment);
//                         expect(parsed!.feeVersion).to.deep.equal(feeVersion);
//                         expect(parsed!.amount).to.deep.equal(amount);
//                         expect(parsed!.fee).to.deep.equal(fee);
//                         expect(parsed!.tokenId).to.deep.equal(tokenId);
//                         expect(parsed!.recipientIsAssociatedTokenAccount).to.deep.equal(recipientIsAssociatedTokenAccount);
//                         expect(parsed!.hashedInputs).to.deep.equal(hashedInputs);
//                         expect(parsed!.skipNullifierPDA).to.deep.equal(skipNullifierPDA);
//                     }
//                 });

//                 it("Should return null if length doesn't fit commitmentcount", async () => {
//                     const parsed = InitVerificationInstruction.parseInstruction({
//                         programId: SystemProgram.programId,
//                         accounts: [],
//                         data: bytesToBs58(instructionBytes.slice(0, instructionBytes.length - 32)),
//                     });

//                     expect(parsed).to.be.null;

//                     const parsed2 = InitVerificationInstruction.parseInstruction({
//                         programId: SystemProgram.programId,
//                         accounts: [],
//                         data: bytesToBs58(padLE(instructionBytes, instructionBytes.length + 32)),
//                     });

//                     expect(parsed2).to.be.null;
//                 });

//                 it('Should return null if length is invalid', async () => {
//                     const parsed = InitVerificationInstruction.parseInstruction({
//                         programId: SystemProgram.programId,
//                         accounts: [],
//                         data: bytesToBs58(instructionBytes.slice(0, instructionBytes.length - 1)),
//                     });

//                     expect(parsed).to.be.null;
//                 });
//             });
//         });

//         it('Throws for too short tree indices', () => {
//             const initVerificationInstruction = new InitVerificationInstruction(
//                 verAccIndex,
//                 vKeyId,
//                 treeIndices.slice(0, MAX_MT_COUNT - 1),
//                 1,
//                 roots.slice(0, 1),
//                 nullifierHashes.slice(0, 1),
//                 commitment,
//                 commIndex,
//                 feeVersion,
//                 amount,
//                 fee,
//                 tokenId,
//                 recipientIsAssociatedTokenAccount,
//                 hashedInputs,
//                 skipNullifierPDA,
//                 false,
//             );

//             expect(() => initVerificationInstruction.compile()).to.throw();
//         });

//         it('Throws for too long tree indices', () => {
//             const initVerificationInstruction = new InitVerificationInstruction(
//                 verAccIndex,
//                 vKeyId,
//                 treeIndices.concat(1),
//                 1,
//                 roots.slice(0, 1),
//                 nullifierHashes.slice(0, 1),
//                 commitment,
//                 commIndex,
//                 feeVersion,
//                 amount,
//                 fee,
//                 tokenId,
//                 recipientIsAssociatedTokenAccount,
//                 hashedInputs,
//                 skipNullifierPDA,
//                 false,
//             );

//             expect(() => initVerificationInstruction.compile()).to.throw();
//         });
//     });
