import {
    Commitment, IncompleteCommitment, MerkleTree, Poseidon,
} from 'elusiv-cryptojs';
import {
    Message,
    MessageCompiledInstruction, ParsedInnerInstruction, ParsedMessage, ParsedMessageAccount, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey, TransactionError,
} from '@solana/web3.js';
import { GeneralSet } from '../src/sdk/utils/GeneralSet.js';
import { bytesToBs58 } from '../src/sdk/utils/base58Utils.js';

export function activateCommitmentsSIMULATED(commitments: IncompleteCommitment[], height: number): GeneralSet<Commitment> {
    const merkleTree = new MerkleTree(height, Poseidon.getPoseidon());
    const set = new GeneralSet<Commitment>((c) => c.getCommitmentHashBigInt().toString());
    merkleTree.batchInsert(commitments.map((c) => c.getCommitmentHashBigInt()));
    const root = merkleTree.getRoot();
    for (let i = 0; i < commitments.length; i++) {
        const opening = merkleTree.getOpening(i);
        set.add(Commitment.fromIncompleteCommitment(commitments[i], opening, root, i, Poseidon.getPoseidon()));
    }
    return set;
}

export function trimFrontOfArray<T>(arr: readonly T[]): T[] {
    const arrCopy = [...arr];
    const firstNotUndefinedIndex = arrCopy.findIndex((e) => e !== undefined);
    return arrCopy.slice(firstNotUndefinedIndex);
}

export function messageToParsedTx(message: Message, cpis?: ParsedInnerInstruction[], err: TransactionError | null = null): ParsedTransactionWithMeta {
    return {
        slot: -1,
        transaction: {
            signatures: [],
            message: messageToParseMessage(message.compiledInstructions, message.staticAccountKeys),
        },
        meta: {
            fee: -1,
            err,
            innerInstructions: cpis,
            preBalances: [],
            postBalances: [],
        },
    };
}

export function messageToParseMessage(instructions: MessageCompiledInstruction[], keys: PublicKey[]): ParsedMessage {
    return {
        accountKeys: keys.map(pubKeyToParsedMessageAcc),
        instructions: instructions.map((ix) => msgCompiledIxToPartiallyDecodedInstruction(ix, keys)),
        recentBlockhash: 'blockhash',
    };
}

export function pubKeyToParsedMessageAcc(key: PublicKey): ParsedMessageAccount {
    return {
        pubkey: key,
        writable: false,
        signer: false,
    };
}

export function msgCompiledIxToPartiallyDecodedInstruction(ix: MessageCompiledInstruction, keys: PublicKey[]): PartiallyDecodedInstruction {
    return {
        programId: keys[ix.programIdIndex],
        accounts: ix.accountKeyIndexes.map((i) => keys[i]),
        data: bytesToBs58(ix.data),
    };
}
