import { deserialize, serialize } from '@dao-xyz/borsh';
import { PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import {
    deserializeUint256LE,
    serializeUint256LE,
    padLE,
} from '@elusiv/serialization';
import { getNumberFromTokenType, getTokenType } from '../../../public/tokenTypes/TokenTypeFuncs.js';
import { decryptAES256CTRWithKey, EncryptedValue } from '../../clientCrypto/encryption.js';
import { RVKWrapper } from '../../clientCrypto/RVKWrapper.js';
import { FinalizeSendDataBorsh } from '../txBuilding/serializedTypes/borshTypes/legacy/FinalizeSendDataBorsh.js';
import { FinalizeVerificationBorsh } from '../txBuilding/serializedTypes/borshTypes/legacy/FinalizeVerificationBorsh.js';
import { bs58ToBytes } from '../../utils/base58Utils.js';
import { TokenType } from '../../../public/tokenTypes/TokenType.js';

/*
Accounts:
    #[acc(recipient)]
    #[acc(identifier_account)]
    #[acc(transaction_reference_account)]
    #[acc(original_fee_payer, { ignore })]
    #[pda(commitment_hash_queue, CommitmentQueueAccount, { writable })]
    #[pda(verification_account, VerificationAccount, pda_pubkey = original_fee_payer.pubkey(), pda_offset = Some(verification_account_index.into()), { writable })]
    #[pda(storage_account, StorageAccount)]
    #[pda(buffer, CommitmentBufferAccount, { writable })]
    #[sys(instructions_account, key = instructions::ID)]
*/

const RECIPIENT_ACC_INDEX = 0;
const IDENTIFIER_ACC_INDEX = 1;
const SOLANA_PAY_REFERENCE_INDEX = 2;
const VERIFICATION_ACC_INDEX = 5;

export class FinalizeVerificationInstruction {
    public readonly amount: bigint;

    public readonly tokenId: TokenType;

    public readonly mtIndex: number;

    public readonly encryptedOwner: EncryptedValue;

    public readonly verificationAccountIndex: number;

    public readonly owner: PublicKey;

    // Mandatory params for getting keys, rest for generating ix
    constructor(
        amount: bigint,
        tokenId: TokenType,
        mtIndex: number,
        encryptedOwner: EncryptedValue,
        verificationAccountIndex: number,
        owner: PublicKey,
    ) {
        this.amount = amount;
        this.tokenId = tokenId;
        this.mtIndex = mtIndex;
        this.encryptedOwner = encryptedOwner;
        this.verificationAccountIndex = verificationAccountIndex;
        this.owner = owner;
    }

    private static parseRawInstruction(data: Uint8Array): FinalizeVerificationBorsh {
        const res = deserialize(data, FinalizeVerificationBorsh);
        return res;
    }

    public static async parseInstructionFromSeedSalt(ix: PartiallyDecodedInstruction, rvk: RVKWrapper, nonce: number): Promise<FinalizeVerificationInstruction | null> {
        const key = rvk.generateDecryptionKey(nonce);
        return this.parseInstructionFromViewingKey(ix, key);
    }

    public static async parseInstructionFromViewingKey(ix: PartiallyDecodedInstruction, key: Uint8Array): Promise<FinalizeVerificationInstruction | null> {
        let parsed: FinalizeVerificationBorsh;
        try {
            parsed = this.parseRawInstruction(new Uint8Array(bs58ToBytes(ix.data)));
        }
        catch (e) {
            return null;
        }

        const rawIV = serializeUint256LE(parsed.data.iv);
        const iv = rawIV.slice(0, 16);
        const ivPadding = rawIV.slice(16, 32);

        // Padding should be 0
        if (!ivPadding.every((x) => x === 0)) {
            return null;
        }

        const encryptedOwner: EncryptedValue = {
            cipherText: serializeUint256LE(parsed.data.encrypted_owner),
            iv,
        };
        const ownerKey = new PublicKey(await decryptAES256CTRWithKey(encryptedOwner, key));

        return new FinalizeVerificationInstruction(
            parsed.data.total_amount,
            getTokenType(parsed.data.token_id),
            parsed.data.mt_index,
            encryptedOwner,
            parsed.verification_account_index,
            ownerKey,
        );
    }

    public static getRecipientAcc(ix: PartiallyDecodedInstruction): PublicKey {
        return ix.accounts[RECIPIENT_ACC_INDEX];
    }

    public static getIdentifierAcc(ix: PartiallyDecodedInstruction): PublicKey {
        return ix.accounts[IDENTIFIER_ACC_INDEX];
    }

    public static getReferenceKeyAcc(ix: PartiallyDecodedInstruction): PublicKey {
        return ix.accounts[SOLANA_PAY_REFERENCE_INDEX];
    }

    public static getVerificationAcc(ix: PartiallyDecodedInstruction): PublicKey {
        return ix.accounts[VERIFICATION_ACC_INDEX];
    }

    public compile(usesMemo: boolean, commIndex: number): Uint8Array {
        const deserializedIV = deserializeUint256LE(padLE(this.encryptedOwner.iv, 32));
        const deserializedCipherText = deserializeUint256LE(this.encryptedOwner.cipherText);

        const encodedInstruction: FinalizeSendDataBorsh = new FinalizeSendDataBorsh(
            this.amount,
            getNumberFromTokenType(this.tokenId),
            this.mtIndex,
            commIndex,
            deserializedIV,
            deserializedCipherText,
        );
        const encoded: FinalizeVerificationBorsh = new FinalizeVerificationBorsh(this.verificationAccountIndex, encodedInstruction, usesMemo);

        return serialize(encoded);
    }
}
