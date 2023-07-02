import {
    ConfirmedSignatureInfo,
    MessageCompiledInstruction,
    PublicKey, SignaturePubkeyPair, Transaction,
} from '@solana/web3.js';
import {
    COMMITMENT_METADATA_LENGTH, Groth16Proof, SendQuadraProof, SendQuadraPublicInputs,
} from 'elusiv-circuits';
import { ProofPointG1, ProofPointG2 } from 'elusiv-circuits/dist/proofGeneration';
import {
    areEqualArrs,
    bigIntToNumber,
    bigIntToUint8ArrLE, padLE, serializeUintLE, TOO_LARGE_SIZE, zeros,
} from '@elusiv/serialization';
import { Fee, getComputationFeeTotal } from '../../../../public/Fee.js';
import { bs58ToBytes, bytesToBs58 } from '../../../utils/base58Utils.js';
import { utf8ByteCodesToString } from '../../../utils/stringUtils.js';
import { JoinSplitSerializedJSON } from '../serializedTypes/borshTypes/JoinSplitBorsh.js';
import { InputCommitmentSerializedJSON } from '../serializedTypes/borshTypes/legacy/InputCommitmentBorsh.js';
import { OptionalFeeSerializedJSON } from '../serializedTypes/borshTypes/OptionalFeeBorsh.js';
import { SendPublicInputsSerializedJSON } from '../serializedTypes/borshTypes/SendPublicInputsBorsh.js';
import {
    DataSerialized,
    TransactionSerialized,
    TxHeaderSerialized, TxInstructionSerialized, TxMessageSerialized, RawG1A, RawG2A, RawProof, SendJSON, SendProofSerialized, SignatureSerialized, StoreJSON, U256Serialized, CommitmentMetadataSerialized,
} from '../serializedTypes/types.js';
import { buildWardenRequest } from './utils.js';

export class TransactionSerialization {
    public static serializeSend(proof: SendQuadraProof, fee: Fee, isSolanaPayTransfer: boolean): SendJSON {
        const sendProofSerialized: SendProofSerialized = this.serializeSendProof(proof, fee, isSolanaPayTransfer);

        return buildWardenRequest(
            'elusiv_send',
            sendProofSerialized,
        );
    }

    public static serializeMerge(proof: SendQuadraProof, fee: Fee): SendJSON {
        return this.serializeSend(proof, fee, false);
    }

    public static serializePartiallySignedStore(tx: Transaction): StoreJSON {
        if (tx.signatures.length !== 2) throw new Error('Missing signature in transaction');
        const serializedSigs = this.serializeSignatures(tx.signatures);

        const compiledMessage = tx.compileMessage();

        const header: TxHeaderSerialized = compiledMessage.header;

        const accountKeys = this.serializeKeys(compiledMessage.accountKeys);

        const recentBlockhashSerialized = this.serializeBase58(compiledMessage.recentBlockhash);
        const instructions: DataSerialized<TxInstructionSerialized> = this.serializeMessageCompiledIxs(compiledMessage.compiledInstructions);

        const message: TxMessageSerialized = {
            header,
            accountKeys,
            recentBlockhash: recentBlockhashSerialized,
            instructions,
        };

        const txSerialized: TransactionSerialized = [{
            signatures: serializedSigs,
            message,
        }];

        return buildWardenRequest(
            'elusiv_store',
            txSerialized,
        );
    }

    private static serializeSendProof(proof: SendQuadraProof, fee: Fee, isSolanaPayTransfer: boolean): SendProofSerialized {
        const memo = proof.publicInputs.extraDataHashInputs.memo;
        return [
            this.serializeProof(proof.proof),
            this.serializeSendPublicInputs(proof.publicInputs, fee, isSolanaPayTransfer),
            this.serializeU256BigInt(proof.publicInputs.extraDataHashInputs.recipient),
            this.serializeU256BigInt(proof.publicInputs.extraDataHashInputs.identifier),
            this.serializeU256BigInt(proof.publicInputs.extraDataHashInputs.iv),
            this.serializeU256BigInt(proof.publicInputs.extraDataHashInputs.encryptedOwner),
            this.serializeU256BigInt(proof.publicInputs.extraDataHashInputs.solanaPayId),
            memo ? utf8ByteCodesToString(memo) : null,
        ];
    }

    private static serializeSendPublicInputs(publicInputs: SendQuadraPublicInputs, fee: Fee, isSolanaPayTransfer: boolean): SendPublicInputsSerializedJSON {
        const joinSplitSerialized = this.serializeJoinSplit(publicInputs, fee);
        return {
            join_split: joinSplitSerialized,
            recipient_is_associated_token_account: publicInputs.extraDataHashInputs.isAssociatedTokenAccount,
            hashed_inputs: this.serializeU256BigInt(publicInputs.hash),
            solana_pay_transfer: isSolanaPayTransfer,
        };
    }

    private static serializeJoinSplit(publicInputs: SendQuadraPublicInputs, fee: Fee): JoinSplitSerializedJSON {
        return {
            input_commitments: this.serializeInputCommitments(publicInputs.roots, publicInputs.nullifierHashes),
            output_commitment: this.serializeU256BigInt(publicInputs.nextCommitment),
            recent_commitment_index: bigIntToNumber(publicInputs.nextAssocCommIndex),
            fee_version: bigIntToNumber(publicInputs.feeVersion),
            amount: bigIntToNumber(publicInputs.amount) - getComputationFeeTotal(fee),
            fee: getComputationFeeTotal(fee),
            token_id: bigIntToNumber(publicInputs.tokenId),
            optional_fee: this.serializeOptionalFee(publicInputs.extraDataHashInputs.optionalFeeAmount, publicInputs.extraDataHashInputs.optionalFeeCollector),
            metadata: Array.from(serializeUintLE(publicInputs.serializedMetadata, COMMITMENT_METADATA_LENGTH)) as CommitmentMetadataSerialized,
        };
    }

    private static serializeOptionalFee(amount: bigint, collector: bigint): OptionalFeeSerializedJSON {
        return {
            collector: TransactionSerialization.serializeU256BigInt(collector),
            amount: bigIntToNumber(amount),
        };
    }

    private static serializeProof(proof: Groth16Proof): RawProof {
        return {
            a: this.serializeG1Point(proof.pi_a),
            b: this.serializeG2Point(proof.pi_b),
            c: this.serializeG1Point(proof.pi_c),
        };
    }

    private static serializeG1Point(point: ProofPointG1): RawG1A {
        return {
            x: this.serializeU256Bytes(point[0]),
            y: this.serializeU256Bytes(point[1]),
            infinity: point[2],
        };
    }

    private static serializeG2Point(point: ProofPointG2): RawG2A {
        return {
            x: [this.serializeU256Bytes(point[0][0]), this.serializeU256Bytes(point[0][1])],
            y: [this.serializeU256Bytes(point[1][0]), this.serializeU256Bytes(point[1][1])],
            infinity: point[2],
        };
    }

    private static serializeInputCommitments(rawRoots: bigint[], rawNHashes: bigint[]): InputCommitmentSerializedJSON[] {
        const inpComms: InputCommitmentSerializedJSON[] = [];

        const serializedNHashes = this.serializeNHashes(rawNHashes);
        const serializedRoots = this.serializeRoots(rawRoots);
        for (let i = 0; i < serializedNHashes.length; i++) {
            inpComms[i] = {
                root: serializedRoots[i],
                nullifier_hash: serializedNHashes[i],
            };
        }
        return inpComms;
    }

    private static serializeNHashes(nHashes: bigint[]): U256Serialized[] {
        const filtered = nHashes.filter((n) => n !== BigInt(0));
        // Empty NHashes always have to come at the end, throw if that's not the case
        if (!areEqualArrs(filtered, nHashes.slice(0, filtered.length), (a, b) => a === b)) {
            throw new Error('Empty nHashes must be at the end');
        }

        return filtered.map((n) => this.serializeU256BigInt(n));
    }

    private static serializeRoots(rawRoots: bigint[]): (U256Serialized | null)[] {
        if (rawRoots.length === 0) return [];
        const firstRoot = rawRoots[0];
        const serialized: (U256Serialized | null)[] = [this.serializeU256BigInt(firstRoot)];
        for (let i = 1; i < rawRoots.length; i++) {
            if (rawRoots[i] === BigInt(0) || rawRoots[i] === rawRoots[0]) serialized[i] = null;
            else serialized[i] = this.serializeU256BigInt(rawRoots[i]);
        }
        return serialized;
    }

    private static serializeBase58(toSerialize: string): number[] {
        return this.serializeUint8Array(bs58ToBytes(toSerialize));
    }

    private static serializeMessageCompiledIxs(ixs: MessageCompiledInstruction[]): DataSerialized<TxInstructionSerialized> {
        return [[ixs.length], ...ixs.map((ix) => this.serializeMessageCompiledIx(ix))];
    }

    private static serializeMessageCompiledIx(ix: MessageCompiledInstruction): TxInstructionSerialized {
        const accountsSerialized: DataSerialized<number> = [[ix.accountKeyIndexes.length], ...ix.accountKeyIndexes];
        const dataSerialized: DataSerialized<number> = [[ix.data.length], ...this.serializeUint8Array(ix.data)];

        return { programIdIndex: ix.programIdIndex, accounts: accountsSerialized, data: dataSerialized };
    }

    private static serializeSignatures(sigs: SignaturePubkeyPair[]): DataSerialized<number[]> {
        return [[sigs.length], ...sigs.map((s) => {
            if (s.signature === null) return Array.from(zeros(64));
            return this.serializeUint8Array(s.signature);
        })];
    }

    private static serializeKeys(keys: PublicKey[]): number[][] {
        return [[keys.length], ...keys.map((k) => this.serializeUint8Array(k.toBytes()))];
    }

    public static serializeU256BigInt(b: bigint): U256Serialized {
        const bytes = bigIntToUint8ArrLE(b);
        return this.serializeU256Bytes(bytes);
    }

    public static serializeU256Bytes(bytes: Uint8Array): U256Serialized {
        let bytesInner = bytes;
        // Ensure it's 32 bytes
        if (bytesInner.length > 32) {
            throw new Error(TOO_LARGE_SIZE('b', bytesInner.length, 32));
        }
        if (bytesInner.length < 32) {
            bytesInner = padLE(bytesInner, 32);
        }
        // We're sure it's the correct length because we pad it prior
        return this.serializeUint8Array(bytesInner) as U256Serialized;
    }

    private static serializeUint8Array(arr: Uint8Array): number[] {
        return Array.from(arr);
    }

    public static deserializeSerializedSignature(serialized: SignatureSerialized): ConfirmedSignatureInfo {
        return {
            signature: bytesToBs58(new Uint8Array(serialized as number[])),
            slot: -1,
            err: null,
            memo: null,
        };
    }
}
