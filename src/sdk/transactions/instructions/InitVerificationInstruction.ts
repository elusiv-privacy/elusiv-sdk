// Accounts:
// #[acc(fee_payer, { writable, signer })]
// #[pda(verification_account, VerificationAccount, pda_offset = Some(verification_account_index), { writable, account_info, find_pda })]
// #[pda(vkey_account, VKeyAccount, pda_offset = Some(vkey_id))]
// #[acc(nullifier_duplicate_account, { writable })]
// #[sys(system_program, key = system_program::ID, { ignore })]
// #[acc(identifier_account)]
// #[pda(storage_account, StorageAccount)]
// #[pda(nullifier_account0, NullifierAccount, pda_offset = Some(tree_indices[0]), { include_child_accounts })]
// #[pda(nullifier_account1, NullifierAccount, pda_offset = Some(tree_indices[1]), { include_child_accounts })]

import { deserialize, serialize } from '@dao-xyz/borsh';
import { PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import { ReprScalar } from 'elusiv-cryptojs';
import { deserializeUint256LE, serializeUint256LE } from 'elusiv-serialization';
import { INIT_VERIFICATION_IX_CODE, MAX_MT_COUNT, SEND_PUBLIC_INPUT_IX_CODE } from '../../../constants.js';
import { OptionalFee } from '../../../public/Fee.js';
import { getNumberFromTokenType, getTokenType } from '../../../public/tokenTypes/TokenTypeFuncs.js';
import { CommitmentMetadata } from '../../clientCrypto/CommitmentMetadata.js';
import { RVKWrapper } from '../../clientCrypto/RVKWrapper.js';
import { InitVerificationInstructionBorsh } from '../txBuilding/serializedTypes/borshTypes/InitVerificationInstructionBorsh.js';
import { JoinSplitBorsh } from '../txBuilding/serializedTypes/borshTypes/JoinSplitBorsh.js';
import { OptionalFeeBorsh } from '../txBuilding/serializedTypes/borshTypes/OptionalFeeBorsh.js';
import { SendPublicInputsBorsh } from '../txBuilding/serializedTypes/borshTypes/SendPublicInputsBorsh.js';
import { InitVerificationInstructionBase } from './InitVerificationInstructionBase.js';
import { bs58ToBytes } from '../../utils/base58Utils.js';
import { TokenType } from '../../../public/tokenTypes/TokenType.js';

export class InitVerificationInstruction extends InitVerificationInstructionBase {
    public readonly optFee: OptionalFee;

    // We don't always have an rvk to decrypt serialized metadata
    public readonly metadata: CommitmentMetadata | { tokenType: TokenType, assocCommIndex: number };

    public readonly serializedMetadata: Uint8Array;

    public constructor(
        verAccIndex: number,
        vKeyId: number,
        treeIndices: number[],
        commitmentCount: number,
        roots: ReprScalar[],
        nullifierHashes: ReprScalar[],
        commitment: ReprScalar,
        metadata: CommitmentMetadata | { tokenType: TokenType, assocCommIndex: number },
        serializedMetadata: Uint8Array,
        feeVersion: number,
        sendAmount: bigint,
        fee: bigint,
        optFee: OptionalFee,
        recipientIsAssociatedTokenAccount: boolean,
        hashedInputs: ReprScalar,
        skipNullifierPDA: boolean,
        isSolanaPayTransfer: boolean,
    ) {
        super(
            verAccIndex,
            vKeyId,
            treeIndices,
            commitmentCount,
            roots,
            nullifierHashes,
            commitment,
            feeVersion,
            sendAmount,
            fee,
            recipientIsAssociatedTokenAccount,
            hashedInputs,
            skipNullifierPDA,
            isSolanaPayTransfer,
        );

        this.optFee = optFee;
        this.metadata = metadata;
        this.serializedMetadata = serializedMetadata;
    }

    private static parseRawInstruction(data: Uint8Array): InitVerificationInstructionBorsh {
        return deserialize(new Uint8Array(data), InitVerificationInstructionBorsh);
    }

    public static async parseInstruction(
        ix: PartiallyDecodedInstruction,
        rvk?: RVKWrapper,
    ): Promise<InitVerificationInstruction | null> {
        let parsed: InitVerificationInstructionBorsh;

        try {
            parsed = this.parseRawInstruction(bs58ToBytes(ix.data));
        }
        catch (e) {
            return null;
        }
        const publicInputs = parsed.request as SendPublicInputsBorsh;
        const commHash = serializeUint256LE(publicInputs.join_split.output_commitment);
        // We don't always have an rvk (e.g. when dealing with viewing key)
        const parsedMetadata = rvk ? await CommitmentMetadata.deserializeAndDecrypt(
            publicInputs.join_split.metadata,
            rvk,
            commHash,
        ) : { tokenType: getTokenType(publicInputs.join_split.token_id), assocCommIndex: publicInputs.join_split.recent_commitment_index };

        return new InitVerificationInstruction(
            parsed.verification_account_index,
            parsed.vkey_id,
            parsed.tree_indices,
            publicInputs.join_split.input_commitments.length,
            this.parseRoots(publicInputs.join_split.input_commitments.map((i) => i.root)),
            publicInputs.join_split.input_commitments.map((i) => serializeUint256LE(i.nullifier_hash) as ReprScalar),
            commHash as ReprScalar,
            parsedMetadata,
            publicInputs.join_split.metadata,
            publicInputs.join_split.fee_version,
            publicInputs.join_split.amount,
            publicInputs.join_split.fee,
            {
                collector: new PublicKey(publicInputs.join_split.optional_fee.collector),
                amount: publicInputs.join_split.optional_fee.amount,
            },
            publicInputs.recipient_is_associated_token_account,
            serializeUint256LE(publicInputs.hashed_inputs) as ReprScalar,
            parsed.skip_nullifier_pda,
            parsed.request.solana_pay_transfer,
        );
    }

    private encodeJoinSplit(): JoinSplitBorsh {
        return new JoinSplitBorsh(
            this.encodeInputCommitments(),
            deserializeUint256LE(this.commitmentHash),
            this.metadata.assocCommIndex,
            this.feeVersion,
            this.sendAmount,
            this.fee,
            new OptionalFeeBorsh(this.optFee.collector.toBytes(), this.optFee.amount),
            getNumberFromTokenType(this.metadata.tokenType),
            this.serializedMetadata,
        );
    }

    private encodeSendPublicInputs(): SendPublicInputsBorsh {
        return new SendPublicInputsBorsh(
            SEND_PUBLIC_INPUT_IX_CODE,
            this.encodeJoinSplit(),
            this.recipientIsAssociatedTokenAccount,
            this.isSolanaPayTransfer,
            deserializeUint256LE(this.hashedInputs),
        );
    }

    public compile(): Uint8Array {
        if (this.treeIndices.length !== MAX_MT_COUNT) throw new Error(`Tree indices must have length ${MAX_MT_COUNT}`);
        const encoded = new InitVerificationInstructionBorsh(
            INIT_VERIFICATION_IX_CODE,
            this.verAccIndex,
            this.vKeyId,
            this.treeIndices,
            this.encodeSendPublicInputs(),
            this.skipNullifierPDA,
        );

        return serialize(encoded);
    }

    public getTokenType(): TokenType {
        return this.metadata.tokenType;
    }

    public getAssocCommIndex(): number {
        return this.metadata.assocCommIndex;
    }
}
