import { deserialize, serialize } from '@dao-xyz/borsh';
import {
    AccountMeta, Cluster, PartiallyDecodedInstruction, TransactionInstruction,
} from '@solana/web3.js';
import { equalsUint8Arr } from '@elusiv/serialization';
import { AccountReader } from '../../accountReaders/AccountReader.js';
import {
    BASE_COMMITMENT_HASH_ACC_SEED,
} from '../../../constants.js';
import { getElusivProgramId } from '../../../public/WardenInfo.js';
import { EncryptedValue } from '../../clientCrypto/encryption.js';
import { RVKWrapper } from '../../clientCrypto/RVKWrapper.js';
import { ComputeBaseCommitmentHashBorsh } from '../txBuilding/serializedTypes/borshTypes/legacy/ComputeBaseCommitmentHashBorsh.js';
import { ComputeHashIxEncryptedPayloadBorsh } from '../txBuilding/serializedTypes/borshTypes/legacy/ComputeHashIxEncryptedPayloadBorsh.js';
import { bs58ToBytes } from '../../utils/base58Utils.js';

export class ComputeHashInstruction {
    public readonly nonce: number;

    public readonly isRecipient: boolean;

    public static readonly CHECKSUM = Buffer.from('elusiv', 'utf-8');

    public readonly hashAccIndex: number;

    public readonly currPrivateBalance: bigint;

    public readonly programNonce: number;

    // Mandatory params for getting keys, rest for generating ix
    constructor(
        nonce: number,
        hashAccIndex: number,
        currPrivateBalance: bigint,
        isRecipient: boolean,
        programNonce = 0,
    ) {
        this.nonce = nonce;
        this.hashAccIndex = hashAccIndex;
        this.currPrivateBalance = currPrivateBalance;
        this.isRecipient = isRecipient;
        this.programNonce = programNonce;
    }

    public static async parseInstruction(ix: PartiallyDecodedInstruction, rvk: RVKWrapper, nonce: number): Promise<ComputeHashInstruction | null> {
        let parsed: ComputeBaseCommitmentHashBorsh;
        try {
            parsed = deserialize(bs58ToBytes(ix.data), ComputeBaseCommitmentHashBorsh);
        }
        catch (e) {
            return null;
        }

        const encryptedData: EncryptedValue = {
            cipherText: Uint8Array.from(parsed.cipher_text),
            iv: Uint8Array.from(parsed.iv),
        };

        let decryptedData: ComputeHashIxEncryptedPayloadBorsh;
        try {
            decryptedData = await this.parseEncryptedData(rvk, nonce, encryptedData);
        }
        catch (e) {
            return null;
        }

        return new ComputeHashInstruction(
            nonce,
            parsed.hash_account_index,
            decryptedData.curr_priv_balance,
            decryptedData.is_recipient,
            parsed.nonce,
        );
    }

    private static async parseEncryptedData(rvk: RVKWrapper, nonce: number, encryptedData: EncryptedValue): Promise<ComputeHashIxEncryptedPayloadBorsh> {
        const decryptedPayload = rvk.decryptSeededSaltedAES256(encryptedData, nonce);
        const parsed: ComputeHashIxEncryptedPayloadBorsh = deserialize(await decryptedPayload, ComputeHashIxEncryptedPayloadBorsh);

        if (!equalsUint8Arr(Uint8Array.from(parsed.checksum), ComputeHashInstruction.CHECKSUM)) {
            throw new Error('Checksum mismatch');
        }
        return parsed;
    }

    public async compileInstruction(rvk: RVKWrapper, cluster: Cluster): Promise<TransactionInstruction> {
        const encryptedData = await this.compileEncryptedData(rvk);

        const txData: ComputeBaseCommitmentHashBorsh = new ComputeBaseCommitmentHashBorsh(
            this.hashAccIndex,
            this.programNonce,
            Array.from(encryptedData.iv),
            Array.from(encryptedData.cipherText),
        );

        const keys = this.getAccounts(cluster);

        return new TransactionInstruction({
            keys,
            programId: getElusivProgramId(cluster),
            data: Buffer.from(serialize(txData)),
        });
    }

    private async compileEncryptedData(rvk: RVKWrapper): Promise<EncryptedValue> {
        const payload: ComputeHashIxEncryptedPayloadBorsh = new ComputeHashIxEncryptedPayloadBorsh(
            this.currPrivateBalance,
            this.isRecipient,
            Array.from(ComputeHashInstruction.CHECKSUM),
        );

        return rvk.encryptSeededSaltedAES256(serialize(payload), this.nonce);
    }

    public getAccounts(cluster: Cluster): AccountMeta[] {
        /*
            #[pda(hashing_account, BaseCommitmentHashingAccount, pda_offset = Some(hash_account_index), { writable })]
        */

        const res = [
            {
                pubkey: AccountReader.generateElusivPDAFrom([BASE_COMMITMENT_HASH_ACC_SEED], getElusivProgramId(cluster), this.hashAccIndex)[0],
                isSigner: false,
                isWritable: true,
            },
        ];
        return res;
    }
}
