import {
    Cluster, ConfirmedSignatureInfo, ParsedInnerInstruction, ParsedMessage, PartiallyDecodedInstruction, PublicKey, SystemProgram,
} from '@solana/web3.js';
import { InvalidStoreError } from '../../errors/InvalidStoreError.js';
import { ComputeHashInstruction } from '../instructions/ComputeHashInstruction.js';
import { FinalizeVerificationInstruction } from '../instructions/FinalizeVerificationInstruction.js';
import { PartialSendTx } from '../SendTx.js';
import { PartialStoreTx } from '../StoreTx.js';
import { InstructionParsing } from './InstructionParsing.js';
import { RVKWrapper } from '../../clientCrypto/RVKWrapper.js';
import { StoreInstructionBase } from '../instructions/StoreInstructionBase.js';
import { InitVerificationInstructionBase } from '../instructions/InitVerificationInstructionBase.js';
import { isCommitmentMetadata, isInitVerificationInstruction, isPartiallyDecodedInstruction } from '../txBuilding/serializedTypes/typeGuards.js';
import { OptionalFee } from '../../../public/Fee.js';

export class TransactionParsing {
    public static async tryParseRawStore(
        storeTx: ParsedMessage,
        cpis: ParsedInnerInstruction[],
        signature: ConfirmedSignatureInfo,
        nonce: number,
        identifier: PublicKey,
        rvk: RVKWrapper,
    ): Promise<PartialStoreTx> {
        const variableCompiledIxs = InstructionParsing.getCompiledVariableIxsFromRawStoreIxs(storeTx.instructions);
        let storeIx: StoreInstructionBase;
        let computeIx: ComputeHashInstruction;
        let fee: bigint;
        let sender: PublicKey;
        let warden: PublicKey;
        try {
            const res = await InstructionParsing.tryParseVariableInstructionsStore(variableCompiledIxs.filter(isPartiallyDecodedInstruction), nonce, rvk);
            storeIx = res.storeIx;
            computeIx = res.computeIx;
            fee = InstructionParsing.tryParseFeeFromStoreCPIs(cpis, storeIx.getTokenType());
            sender = res.senderAcc;
            warden = res.wardenAcc;
        }
        // TODO: Check for the type of error
        catch (err) {
            throw new InvalidStoreError('Failed to parse Store');
        }

        return {
            sender,
            tokenType: storeIx.getTokenType(),
            parsedPrivateBalance: computeIx.currPrivateBalance,
            signature,
            nonce,
            amount: storeIx.getAmount(),
            commitmentHash: storeIx.commitmentHash,
            merkleStartIndex: storeIx.getAssocCommIndex(),
            txType: 'TOPUP',
            hashAccIndex: storeIx.hashAccIndex,
            isRecipient: computeIx.isRecipient,
            identifier,
            transactionStatus: 'PENDING',
            warden,
            fee,
        };
    }

    public static async tryParseRawSend(
        cluster: Cluster,
        rawSend: ParsedMessage[],
        signature: ConfirmedSignatureInfo[],
        nonce: number,
        identifier: PublicKey,
        rvk: RVKWrapper,
    ): Promise<PartialSendTx> {
        const decryptionKey = rvk.generateDecryptionKey(nonce);
        return this.tryParseRawSendFromDecryptionKey(cluster, rawSend, signature, decryptionKey, identifier, rvk, nonce);
    }

    public static async tryParseRawSendFromDecryptionKey(
        cluster: Cluster,
        rawSend: ParsedMessage[],
        signature: ConfirmedSignatureInfo[],
        decryptionKey: Uint8Array,
        identifier: PublicKey,
        rvk?: RVKWrapper,
        nonce = -1,
    ): Promise<PartialSendTx> {
        const initTx = this.findSendInitTx(cluster, rawSend, identifier)?.tx;
        const finalizeTx = this.findSendFinalizeTx(cluster, rawSend, identifier)?.tx;

        if (initTx === undefined) {
            throw new Error('Invalid Send');
        }

        let initIx: InitVerificationInstructionBase;
        let idAcc: PublicKey;
        let wardenAcc: PublicKey;
        let finalizeData: { tx: ParsedMessage, ix: FinalizeVerificationInstruction, recipientAcc: PublicKey, refKeyAcc: PublicKey, idAcc: PublicKey } | undefined;

        try {
            const init = await InstructionParsing.tryParseVariableInstructionsInitVerification(initTx.instructions.filter(
                // In both of the branches above we throw an error if initTx is undefined, so we can safely assert here
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                (ix) => isPartiallyDecodedInstruction(ix) && InstructionParsing.isElusivIx(cluster, ix),
            ) as PartiallyDecodedInstruction[], rvk);
            initIx = init.initIx;
            idAcc = init.idAcc;
            wardenAcc = init.wardenAcc;
            if (finalizeTx) {
                const finalize = await InstructionParsing.tryParseVariableInstructionsFinalizeVerificationFromDecryptionKey(
                    finalizeTx.instructions,
                    decryptionKey,
                );
                finalizeData = {
                    tx: finalizeTx,
                    ix: finalize.finalizeIx,
                    recipientAcc: finalize.recipientAcc,
                    refKeyAcc: finalize.refKeyAcc,
                    idAcc: finalize.idAcc,
                };
            }
        }
        catch (err) {
            throw new Error('Failed to parse Send');
        }

        const extraFee: OptionalFee = isInitVerificationInstruction(initIx) ? initIx.optFee : { collector: SystemProgram.programId, amount: BigInt(0) };

        return {
            nonce,
            txType: 'SEND',
            tokenType: initIx.getTokenType(),
            identifier: idAcc,
            owner: finalizeData ? finalizeData.ix.owner : undefined,
            amount: initIx.sendAmount,
            memo: signature[0].memo === null ? undefined : signature[0].memo,
            fee: initIx.fee,
            recipient: finalizeData ? finalizeData.recipientAcc : undefined,
            refKey: finalizeData ? finalizeData.refKeyAcc : undefined,
            isAssociatedTokenAcc: initIx.recipientIsAssociatedTokenAccount,
            signature: signature[0],
            transactionStatus: finalizeData ? 'PROCESSED' : 'PENDING',
            commitmentHash: initIx.commitmentHash,
            merkleStartIndex: initIx.getAssocCommIndex(),
            isSolanaPayTransfer: initIx.isSolanaPayTransfer,
            encryptedOwner: finalizeData?.ix.encryptedOwner,
            warden: wardenAcc,
            metadata: isInitVerificationInstruction(initIx) && isCommitmentMetadata(initIx.metadata) ? initIx.metadata : undefined,
            extraFee,
        };
    }

    public static findStoreTx(cluster: Cluster, rawTxs: ParsedMessage[], identifier: PublicKey): { tx: ParsedMessage, index: number } | undefined {
        const storeIndex = rawTxs.findIndex((t) => t.instructions.some((ix) => isPartiallyDecodedInstruction(ix) && InstructionParsing.isStoreBaseCommIx(cluster, ix, identifier)));
        const computeHashIndex = rawTxs.findIndex((t) => t.instructions.some((ix) => isPartiallyDecodedInstruction(ix) && InstructionParsing.isComputeHashIx(cluster, ix, identifier)));
        // StoreBaseComm and ComputeHash must be in the same transaction
        return (storeIndex === -1 || computeHashIndex === -1 || storeIndex !== computeHashIndex)
            ? undefined
            : { tx: rawTxs[storeIndex], index: storeIndex };
    }

    public static findSendInitTx(cluster: Cluster, rawTxs: ParsedMessage[], identifier: PublicKey): { tx: ParsedMessage, index: number } | undefined {
        const index = rawTxs.findIndex((t) => t.instructions.some((ix) => isPartiallyDecodedInstruction(ix) && InstructionParsing.isInitVerificationIx(cluster, ix, identifier)));
        return index === -1 ? undefined : { tx: rawTxs[index], index };
    }

    public static findSendFinalizeTx(cluster: Cluster, rawTxs: ParsedMessage[], identifier: PublicKey): { tx: ParsedMessage, index: number } | undefined {
        const index = rawTxs.findIndex((t) => t.instructions.some((ix) => isPartiallyDecodedInstruction(ix) && InstructionParsing.isFinalizeVerificationIx(cluster, ix, identifier)));
        return index === -1 ? undefined : { tx: rawTxs[index], index };
    }

    // Returns the index of the send finalize ix, if present. Else -1
    public static getSendFinalizeIx(cluster: Cluster, txMessage: ParsedMessage, idPubKey: PublicKey): PartiallyDecodedInstruction | undefined {
        return txMessage.instructions.find((ix) => isPartiallyDecodedInstruction(ix) && InstructionParsing.isFinalizeVerificationIx(cluster, ix, idPubKey)) as PartiallyDecodedInstruction;
    }

    // Returns the index of the send init ix, if present. Else -1
    public static getSendInitIx(cluster: Cluster, txMessage: ParsedMessage, idPubKey: PublicKey): PartiallyDecodedInstruction | undefined {
        return txMessage.instructions.find((ix) => isPartiallyDecodedInstruction(ix) && InstructionParsing.isInitVerificationIx(cluster, ix, idPubKey)) as PartiallyDecodedInstruction;
    }

    public static isSendTx(cluster: Cluster, txMessage: ParsedMessage, idPubKey: PublicKey): boolean {
        return txMessage.instructions.some((ix) => isPartiallyDecodedInstruction(ix) && InstructionParsing.isSendIx(cluster, ix, idPubKey));
    }

    public static isStoreTx(cluster: Cluster, txMessage: ParsedMessage, idPubKey: PublicKey): boolean {
        return txMessage.instructions.some((ix) => isPartiallyDecodedInstruction(ix) && InstructionParsing.isStoreIx(cluster, ix, idPubKey));
    }

    public static isElusivTx(cluster: Cluster, txMessage: ParsedMessage, idPubKey: PublicKey): boolean {
        return this.isStoreTx(cluster, txMessage, idPubKey) || this.isSendTx(cluster, txMessage, idPubKey);
    }
}
