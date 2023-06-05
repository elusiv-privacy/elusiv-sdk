import { COMMITMENT_METADATA_LENGTH } from 'elusiv-circuits';
import { IncompleteCommitment } from 'elusiv-cryptojs';
import {
    deserializeUint16LE,
    deserializeUint32LE,
    deserializeUint64LE,
    deserializeUintLE,
    mergeUint8, serializeUint16LE, serializeUint32LE, serializeUint64LE, serializeUintLE,
} from 'elusiv-serialization';
import { MAX_UINT20, MAX_UINT32, MAX_UINT64 } from '../../constants.js';
import { getNumberFromTokenType, getTokenType } from '../../public/tokenTypes/TokenTypeFuncs.js';
import { EncryptedValue } from './encryption.js';
import { RVKWrapper } from './RVKWrapper.js';
import { TokenType } from '../../public/tokenTypes/TokenType.js';

export class CommitmentMetadata {
    public readonly nonce: number;

    public readonly tokenType: TokenType;

    public readonly assocCommIndex: number;

    // The amount of money in this commitment
    public readonly balance: bigint;

    public constructor(
        nonce: number,
        tokenType: TokenType,
        assocCommIndex: number,
        balance: bigint,
    ) {
        if (nonce < 0 || nonce > MAX_UINT32) throw new Error('Invalid nonce');
        if (assocCommIndex < 0 || assocCommIndex > MAX_UINT20) throw new Error('Invalid assoc comm index');
        if (balance < BigInt(0) || balance > MAX_UINT64) throw new Error('Invalid amount');
        this.nonce = nonce;
        this.tokenType = tokenType;
        this.assocCommIndex = assocCommIndex;
        this.balance = balance;
    }

    // Serializing means encrypting this data using the commHash as the IV.
    public async serializeAndEncrypt(rvk: RVKWrapper, commHash: Uint8Array): Promise<EncryptedValue> {
        return rvk.encryptMetadata(this.toBytes(), commHash);
    }

    public static async deserializeAndDecrypt(cipherText: Uint8Array, rvk: RVKWrapper, commHash: Uint8Array): Promise<CommitmentMetadata> {
        const payload = await rvk.decryptMetadata(cipherText, commHash);
        return this.fromBytes(payload);
    }

    // Nonce|TokenType|AssocCommIndex|Amount
    // 4B   |2B       |3B            |8B
    public toBytes(): Uint8Array {
        return mergeUint8([
            serializeUint32LE(this.nonce),
            serializeUint16LE(getNumberFromTokenType(this.tokenType)),
            serializeUintLE(BigInt(this.assocCommIndex), 3),
            serializeUint64LE(this.balance),
        ]);
    }

    public static fromBytes(serializedMetadata: Uint8Array): CommitmentMetadata {
        if (serializedMetadata.length !== COMMITMENT_METADATA_LENGTH) throw new Error('Invalid length for metadata');
        return new CommitmentMetadata(
            deserializeUint32LE(serializedMetadata.slice(0, 4)),
            getTokenType(deserializeUint16LE(serializedMetadata.slice(4, 6))),
            Number(deserializeUintLE(serializedMetadata.slice(6, 9), 3)),
            deserializeUint64LE(serializedMetadata.slice(9, 17)),
        );
    }

    public static fromCommitment(nonce: number, comm: IncompleteCommitment): CommitmentMetadata {
        return new CommitmentMetadata(
            nonce,
            getTokenType(Number(comm.getTokenId())),
            Number(comm.getAssocCommIndex()),
            BigInt(comm.getBalance()),
        );
    }
}
