// Accounts:
// #[acc(fee_payer, { writable, signer })]
// #[pda(verification_account, VerificationAccount, pda_pubkey = fee_payer.pubkey(), pda_offset = Some(verification_account_index.into()), { writable, account_info, find_pda })]
// #[pda(vkey_account, VKeyAccount, pda_offset = Some(vkey_id))]
// #[acc(nullifier_duplicate_account, { writable })]
// #[sys(system_program, key = system_program::ID, { ignore })]
// #[acc(identifier_account)]
// #[pda(storage_account, StorageAccount)]
// #[pda(buffer, CommitmentBufferAccount, { writable })]
// #[pda(nullifier_account0, NullifierAccount, pda_offset = Some(tree_indices[0]), { include_child_accounts })]
// #[pda(nullifier_account1, NullifierAccount, pda_offset = Some(tree_indices[1]), { include_child_accounts })]

import { PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import { ReprScalar } from '@elusiv/cryptojs';
import { deserializeUint256LE, serializeUint256LE } from '@elusiv/serialization';
import { InputCommitmentBorsh } from '../txBuilding/serializedTypes/borshTypes/legacy/InputCommitmentBorsh.js';
import { TokenType } from '../../../public/tokenTypes/TokenType.js';

// Warden is the fee payer
const WARDEN_ACC_INDEX = 0;
const VERIFICATION_ACC_INDEX = 1;
const IDENTIFIER_ACC_INDEX = 5;

export abstract class InitVerificationInstructionBase {
    public readonly verAccIndex: number;

    public readonly vKeyId: number;

    public readonly treeIndices: number[];

    public readonly commitmentCount: number;

    public readonly roots: ReprScalar[];

    public readonly nullifierHashes: ReprScalar[];

    public readonly commitmentHash: ReprScalar;

    public readonly feeVersion: number;

    public readonly sendAmount: bigint;

    public readonly fee: bigint;

    public readonly recipientIsAssociatedTokenAccount: boolean;

    public readonly hashedInputs: ReprScalar;

    public readonly skipNullifierPDA: boolean;

    public readonly isSolanaPayTransfer: boolean;

    public constructor(
        verAccIndex: number,
        vKeyId: number,
        treeIndices: number[],
        commitmentCount: number,
        roots: ReprScalar[],
        nullifierHashes: ReprScalar[],
        commitment: ReprScalar,
        feeVersion: number,
        sendAmount: bigint,
        fee: bigint,
        recipientIsAssociatedTokenAccount: boolean,
        hashedInputs: ReprScalar,
        skipNullifierPDA: boolean,
        isSolanaPayTransfer: boolean,
    ) {
        this.verAccIndex = verAccIndex;
        this.vKeyId = vKeyId;
        this.treeIndices = treeIndices;
        this.commitmentCount = commitmentCount;
        this.roots = roots;
        this.nullifierHashes = nullifierHashes;
        this.commitmentHash = commitment;
        this.feeVersion = feeVersion;
        this.sendAmount = sendAmount;
        this.fee = fee;
        this.recipientIsAssociatedTokenAccount = recipientIsAssociatedTokenAccount;
        this.hashedInputs = hashedInputs;
        this.skipNullifierPDA = skipNullifierPDA;
        this.isSolanaPayTransfer = isSolanaPayTransfer;
    }

    protected encodeInputCommitments(): InputCommitmentBorsh[] {
        if (this.roots.length === 0) return [];
        const firstRoot = this.roots[0];
        const inputCommitments: InputCommitmentBorsh[] = [
            new InputCommitmentBorsh(deserializeUint256LE(firstRoot), deserializeUint256LE(this.nullifierHashes[0])),
        ];

        for (let i = 1; i < this.commitmentCount; i++) {
            const rootSerialized = this.roots[i] === firstRoot ? undefined : deserializeUint256LE(this.roots[i]);
            inputCommitments[i] = new InputCommitmentBorsh(rootSerialized, deserializeUint256LE(this.nullifierHashes[i]));
        }
        return inputCommitments;
    }

    protected static parseRoots(roots: (bigint | undefined)[]): ReprScalar[] {
        if (!roots[0]) throw new Error('Need at least one root');
        const firstRootSerialized = serializeUint256LE(roots[0]) as ReprScalar;

        return roots.map((root, i) => {
            if (i === 0 || !root) return firstRootSerialized;
            return serializeUint256LE(root) as ReprScalar;
        });
    }

    public abstract getTokenType(): TokenType;

    public abstract getAssocCommIndex(): number;

    public static getIdentifierAcc(ix: PartiallyDecodedInstruction): PublicKey {
        return ix.accounts[IDENTIFIER_ACC_INDEX];
    }

    public static getVerificationAcc(ix: PartiallyDecodedInstruction): PublicKey {
        return ix.accounts[VERIFICATION_ACC_INDEX];
    }

    public static getWardenAcc(ix: PartiallyDecodedInstruction): PublicKey {
        return ix.accounts[WARDEN_ACC_INDEX];
    }
}
