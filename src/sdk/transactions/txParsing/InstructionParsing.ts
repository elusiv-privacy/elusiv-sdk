import {
    Cluster, ParsedInnerInstruction, ParsedInstruction, PartiallyDecodedInstruction, PublicKey,
} from '@solana/web3.js';
import { INVALID_SIZE } from '@elusiv/serialization';
import {
    COMPUTE_COMM_HASH_IX_CODE, FAILED_TO_PARSE, FINALIZE_VERIFICATION_IX_CODE, INIT_VERIFICATION_IX_CODE, STORE_BASE_COMM_IX_CODE,
} from '../../../constants.js';
import { InvalidStoreError } from '../../errors/InvalidStoreError.js';
import { getElusivProgramId } from '../../../public/WardenInfo.js';
import { ComputeHashInstruction } from '../instructions/ComputeHashInstruction.js';
import { FinalizeVerificationInstruction } from '../instructions/FinalizeVerificationInstruction.js';
import { InitVerificationInstruction } from '../instructions/InitVerificationInstruction.js';
import { StoreInstruction } from '../instructions/StoreInstruction.js';
import { RVKWrapper } from '../../clientCrypto/RVKWrapper.js';
import { bs58ToBytes } from '../../utils/base58Utils.js';
import { StoreInstructionBase } from '../instructions/StoreInstructionBase.js';
import { StoreInstructionLegacy } from '../instructions/StoreInstructionLegacy.js';
import { InitVerificationInstructionBase } from '../instructions/InitVerificationInstructionBase.js';
import { InitVerificationInstructionLegacy } from '../instructions/InitVerificationInstructionLegacy.js';
import {
    isPartiallyDecodedInstruction, isParsedLamportTransfer, isParsedInstruction, isParsedSPLTransfer,
} from '../txBuilding/serializedTypes/typeGuards.js';
import { TokenType } from '../../../public/tokenTypes/TokenType.js';

const STORE_IX_INDEX = 2;

export class InstructionParsing {
    public static getCompiledVariableIxsFromRawStoreIxs<T>(storeIxs: T[]): T[] {
        if (storeIxs.length !== 4) {
            throw new InvalidStoreError(INVALID_SIZE('compiled constant store instructions', storeIxs.length, 4));
        }
        return storeIxs.slice(STORE_IX_INDEX, 4);
    }

    public static getCompiledConstantIxsFromRawStoreIxs<T>(storeIxs: T[]): T[] {
        if (storeIxs.length !== 4) throw new InvalidStoreError(INVALID_SIZE('compiled constant store instructions', storeIxs.length, 4));
        return storeIxs.slice(0, STORE_IX_INDEX);
    }

    // Try parsing the non-constant instructions in our transaction message
    public static async tryParseVariableInstructionsStore(
        ixs: PartiallyDecodedInstruction[],
        nonce: number,
        rvk: RVKWrapper,
    ): Promise<{
            storeIx: StoreInstructionBase;
            computeIx: ComputeHashInstruction;
            identifierAcc: PublicKey;
            senderAcc: PublicKey;
            wardenAcc: PublicKey;
        }> {
        if (ixs.length !== 2) throw new InvalidStoreError(INVALID_SIZE('compiled variable store instructions', ixs.length, 2));

        const rawStore = ixs[0];
        const rawCompute = ixs[1];

        let storeIx: StoreInstructionBase | null;
        // Most instructions will be normal ones, so try that first
        storeIx = await StoreInstruction.parseInstruction(rvk, rawStore);
        // If it fails, try the legacy store instruction
        if (storeIx === null) storeIx = StoreInstructionLegacy.parseInstruction(rawStore);
        // If that didn't work either, this is not a store so we throw an error
        if (storeIx === null) throw new InvalidStoreError(FAILED_TO_PARSE('store instruction'));

        const computeIx = await ComputeHashInstruction.parseInstruction(rawCompute, rvk, nonce);
        if (computeIx === null) throw new InvalidStoreError(FAILED_TO_PARSE('compute instruction'));

        const idAcc = StoreInstruction.getIdentifierAcc(rawStore);
        const senderAcc = StoreInstruction.getSenderAcc(rawStore);
        const wardenAcc = StoreInstruction.getWardenAcc(rawStore);

        return {
            storeIx, computeIx, identifierAcc: idAcc, senderAcc, wardenAcc,
        };
    }

    public static tryParseFeeFromStoreCPIs(cpis: ParsedInnerInstruction[], tokenType: TokenType): bigint {
        const transferIxs = cpis.find((ix) => ix.index === STORE_IX_INDEX);
        if (transferIxs === undefined) throw new Error('Failed to find transfer ix');

        if (tokenType === 'LAMPORTS') {
            // 5 CPIs for lamports for store
            if (transferIxs.instructions.length !== 5 || !isParsedInstruction(transferIxs.instructions[0]) || !isParsedLamportTransfer(transferIxs.instructions[0].parsed)) throw new InvalidStoreError(FAILED_TO_PARSE('store instruction'));
            return BigInt(transferIxs.instructions[0].parsed.info.lamports);
        }
        // 6 CPIs for spl for store
        if (transferIxs.instructions.length !== 6 || !isParsedInstruction(transferIxs.instructions[0]) || !isParsedSPLTransfer(transferIxs.instructions[0].parsed)) throw new InvalidStoreError(FAILED_TO_PARSE('store instruction'));
        return BigInt(transferIxs.instructions[0].parsed.info.amount);
    }

    public static async tryParseVariableInstructionsInitVerification(
        ixs: PartiallyDecodedInstruction[],
        rvk?: RVKWrapper,
    ): Promise<{
            initIx: InitVerificationInstructionBase;
            idAcc: PublicKey;
            wardenAcc: PublicKey;
        }> {
        // The init ix can be at any index
        for (const rawIx of ixs) {
            // eslint-disable-next-line no-await-in-loop
            let initIx: InitVerificationInstructionBase | null = await InitVerificationInstruction.parseInstruction(rawIx, rvk);
            // Check if we're maybe dealing with a legacy tx
            if (initIx === null) initIx = InitVerificationInstructionLegacy.parseInstruction(rawIx);
            if (initIx !== null) {
                const idIndex = InitVerificationInstruction.getIdentifierAcc(rawIx);
                const wardenIndex = InitVerificationInstruction.getWardenAcc(rawIx);
                return { initIx, idAcc: idIndex, wardenAcc: wardenIndex };
            }
        }

        // TODO: Should be invalid send error
        throw new InvalidStoreError(FAILED_TO_PARSE('init verification instruction'));
    }

    public static async tryParseVariableInstructionsFinalizeVerification(
        ixs: (ParsedInstruction | PartiallyDecodedInstruction)[],
        nonce: number,
        rvk: RVKWrapper,
    ): Promise<{ finalizeIx: FinalizeVerificationInstruction, idAcc: PublicKey, recipientAcc: PublicKey }> {
        // The finalize ix can be at any instruction index, so parse instructions until we run out or find first tx that is not null
        for (const rawIx of ixs) {
            if (isPartiallyDecodedInstruction(rawIx)) {
                // eslint-disable-next-line no-await-in-loop
                const finalizeIx = await FinalizeVerificationInstruction.parseInstructionFromSeedSalt(rawIx, rvk, nonce);
                if (finalizeIx !== null) {
                    const idAcc = FinalizeVerificationInstruction.getIdentifierAcc(rawIx);
                    const recipientAcc = FinalizeVerificationInstruction.getRecipientAcc(rawIx);
                    return { finalizeIx, idAcc, recipientAcc };
                }
            }
        }

        // TODO: Should be invalid send error
        throw new InvalidStoreError(FAILED_TO_PARSE('finalize verification instruction'));
    }

    public static async tryParseVariableInstructionsFinalizeVerificationFromDecryptionKey(
        ixs: (ParsedInstruction | PartiallyDecodedInstruction)[],
        decryptionKey: Uint8Array,
    ): Promise<{ finalizeIx: FinalizeVerificationInstruction, idAcc: PublicKey, recipientAcc: PublicKey, refKeyAcc: PublicKey }> {
        // The finalize ix can be at any instruction index, so parse instructions until we run out or find first tx that is not null
        for (const rawIx of ixs) {
            if (isPartiallyDecodedInstruction(rawIx)) {
                // eslint-disable-next-line no-await-in-loop
                const finalizeIx = await FinalizeVerificationInstruction.parseInstructionFromViewingKey(rawIx, decryptionKey);
                if (finalizeIx !== null) {
                    const idAcc = FinalizeVerificationInstruction.getIdentifierAcc(rawIx);
                    const recipientAcc = FinalizeVerificationInstruction.getRecipientAcc(rawIx);
                    const refKeyAcc = FinalizeVerificationInstruction.getReferenceKeyAcc(rawIx);
                    return {
                        finalizeIx, idAcc, recipientAcc, refKeyAcc,
                    };
                }
            }
        }

        // TODO: Should be invalid send error
        throw new InvalidStoreError(FAILED_TO_PARSE('finalize verification instruction'));
    }

    public static isSendIx(cluster: Cluster, ix: PartiallyDecodedInstruction, idPubKey: PublicKey): boolean {
        return this.isInitVerificationIx(cluster, ix, idPubKey) || this.isFinalizeVerificationIx(cluster, ix, idPubKey);
    }

    public static isStoreIx(cluster: Cluster, ix: PartiallyDecodedInstruction, idPubKey: PublicKey): boolean {
        return this.isStoreBaseCommIx(cluster, ix, idPubKey) || this.isComputeHashIx(cluster, ix, idPubKey);
    }

    public static isStoreBaseCommIx(cluster: Cluster, ix: PartiallyDecodedInstruction, idPubKey: PublicKey): boolean {
        return this.isIdentifierIx(cluster, ix, idPubKey) && bs58ToBytes(ix.data)[0] === STORE_BASE_COMM_IX_CODE;
    }

    public static isComputeHashIx(cluster: Cluster, ix: PartiallyDecodedInstruction, idPubKey: PublicKey): boolean {
        return this.isIdentifierIx(cluster, ix, idPubKey) && bs58ToBytes(ix.data)[0] === COMPUTE_COMM_HASH_IX_CODE;
    }

    public static isInitVerificationIx(cluster: Cluster, ix: PartiallyDecodedInstruction, idPubKey: PublicKey): boolean {
        return this.isIdentifierIx(cluster, ix, idPubKey) && bs58ToBytes(ix.data)[0] === INIT_VERIFICATION_IX_CODE;
    }

    public static isFinalizeVerificationIx(cluster: Cluster, ix: PartiallyDecodedInstruction, idPubKey: PublicKey): boolean {
        return this.isIdentifierIx(cluster, ix, idPubKey) && bs58ToBytes(ix.data)[0] === FINALIZE_VERIFICATION_IX_CODE;
    }

    public static isIdentifierIx(cluster: Cluster, ix: PartiallyDecodedInstruction, idPubKey: PublicKey): boolean {
        return this.isElusivIx(cluster, ix) && ix.accounts.find((k) => k.equals(idPubKey)) !== undefined;
    }

    public static isElusivIx(cluster: Cluster, ix: PartiallyDecodedInstruction): boolean {
        return ix.programId.equals(getElusivProgramId(cluster));
    }
}
