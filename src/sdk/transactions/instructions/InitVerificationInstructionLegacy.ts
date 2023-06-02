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
import { PartiallyDecodedInstruction } from '@solana/web3.js';
import { ReprScalar } from 'elusiv-cryptojs';
import { deserializeUint256LE, serializeUint256LE } from 'elusiv-serialization';
import { INIT_VERIFICATION_IX_CODE, MAX_MT_COUNT, SEND_PUBLIC_INPUT_IX_CODE } from '../../../constants.js';
import { getNumberFromTokenType, getTokenType, TokenType } from '../../../public/tokenTypes/TokenType.js';
import { InitVerificationInstructionBorshLegacy } from '../txBuilding/serializedTypes/borshTypes/legacy/InitVerificationInstructionBorshLegacy.js';
import { JoinSplitBorshLegacy } from '../txBuilding/serializedTypes/borshTypes/legacy/JoinSplitBorshLegacy.js';
import { SendPublicInputsBorshLegacy } from '../txBuilding/serializedTypes/borshTypes/legacy/SendPublicInputsBorshLegacy.js';
import { InitVerificationInstructionBase } from './InitVerificationInstructionBase.js';
import { bs58ToBytes } from '../../utils/base58Utils.js';

export class InitVerificationInstructionLegacy extends InitVerificationInstructionBase {
    public readonly commIndex: number;

    public readonly tokenId: TokenType;

    public constructor(
        verAccIndex: number,
        vKeyId: number,
        treeIndices: number[],
        commitmentCount: number,
        roots: ReprScalar[],
        nullifierHashes: ReprScalar[],
        commitment: ReprScalar,
        commIndex: number,
        feeVersion: number,
        sendAmount: bigint,
        fee: bigint,
        tokenId: TokenType,
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
        this.commIndex = commIndex;
        this.tokenId = tokenId;
    }

    private static parseRawInstruction(data: Uint8Array): InitVerificationInstructionBorshLegacy {
        return deserialize(new Uint8Array(data), InitVerificationInstructionBorshLegacy);
    }

    public static parseInstruction(ix: PartiallyDecodedInstruction): InitVerificationInstructionLegacy | null {
        let parsed: InitVerificationInstructionBorshLegacy;

        try {
            parsed = this.parseRawInstruction(bs58ToBytes(ix.data));
        }
        catch (e) {
            return null;
        }
        const publicInputs = parsed.request;
        const tokenId = getTokenType(publicInputs.join_split.token_id);

        return new InitVerificationInstructionLegacy(
            parsed.verification_account_index,
            parsed.vkey_id,
            parsed.tree_indices,
            publicInputs.join_split.input_commitments.length,
            this.parseRoots(publicInputs.join_split.input_commitments.map((i) => i.root)),
            publicInputs.join_split.input_commitments.map((i) => serializeUint256LE(i.nullifier_hash) as ReprScalar),
            serializeUint256LE(publicInputs.join_split.output_commitment) as ReprScalar,
            publicInputs.join_split.output_commitment_index,
            publicInputs.join_split.fee_version,
            publicInputs.join_split.amount,
            publicInputs.join_split.fee,
            tokenId,
            publicInputs.recipient_is_associated_token_account,
            serializeUint256LE(publicInputs.hashed_inputs) as ReprScalar,
            parsed.skip_nullifier_pda,
            parsed.request.solana_pay_transfer,
        );
    }

    private encodeJoinSplit(): JoinSplitBorshLegacy {
        return new JoinSplitBorshLegacy(
            this.encodeInputCommitments(),
            deserializeUint256LE(this.commitmentHash),
            this.commIndex,
            this.feeVersion,
            this.sendAmount,
            this.fee,
            getNumberFromTokenType(this.tokenId),
        );
    }

    private encodeSendPublicInputs(): SendPublicInputsBorshLegacy {
        return new SendPublicInputsBorshLegacy(
            SEND_PUBLIC_INPUT_IX_CODE,
            this.encodeJoinSplit(),
            this.recipientIsAssociatedTokenAccount,
            this.isSolanaPayTransfer,
            deserializeUint256LE(this.hashedInputs),
        );
    }

    public compile(): Uint8Array {
        if (this.treeIndices.length !== MAX_MT_COUNT) throw new Error(`Tree indices must have length ${MAX_MT_COUNT}`);
        const encoded = new InitVerificationInstructionBorshLegacy(
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
        return this.tokenId;
    }

    public getAssocCommIndex(): number {
        return this.commIndex;
    }
}
