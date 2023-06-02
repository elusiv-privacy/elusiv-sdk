import {
    PublicKey,
} from '@solana/web3.js';
import {
    Commitment, IncompleteCommitment,
} from 'elusiv-cryptojs';
import { SendQuadraProof } from 'elusiv-circuits';
import { ElusivTransaction } from './ElusivTransaction.js';
import { GeneralSet } from '../utils/GeneralSet.js';
import { EncryptedValue } from '../clientCrypto/encryption.js';
import { CommitmentMetadata } from '../clientCrypto/CommitmentMetadata.js';
import { OptionalFee } from '../../public/Fee.js';

/*
Finalize Tx Format ("RequestProofVerification" in the elusiv program)
- Ix 0: FinalizeVerificationSend
- Ix 1: FinalizeVerificationNullifier (unneeded by SDK)
- Ix 2: FinalizeVerificationTransfer (unneeded by SDK)
*/

// Send Tx without reconstructing the commitment, as this isn't possible with rvk parsing
export type PartialSendTx = ElusivTransaction & {
    // Is the recipient an associated token account?
    isAssociatedTokenAcc: boolean;
    // Boolean indicating whether this is a solana pay transfer
    isSolanaPayTransfer: boolean;
    // Optional because legacy transactions don't have this field
    metadata?: CommitmentMetadata;
    // The recipient of the funds being sent.
    // Optional because this could be a merge tx with no recipient
    recipient?: PublicKey;
    // The owner of the funds being sent (encrypted ofc)
    encryptedOwner?: EncryptedValue;
    // The owner of the funds being sent in readable format (if viewing key is available)
    owner?: PublicKey;
    // Optional (solana pay) reference key
    refKey?: PublicKey;
    // Optional (solana pay) memo
    memo?: string;
    // The commitments that are used (and invalidated) in this tx. Optional because we don't
    // parse this out when parsing the tx from chain
    inputCommitments?: GeneralSet<Commitment>;
    // The proof used to make this send. Optional because we don't
    // parse this out when parsing the tx from chain
    proof?: SendQuadraProof;
    // Extra fee to be paid to a third party collector
    extraFee: OptionalFee;
}

export type SendTx = PartialSendTx & {
    commitment: IncompleteCommitment;
}

export function partialSendTxToSendTx(partialSendTx: PartialSendTx, commitment: IncompleteCommitment): SendTx {
    return {
        ...partialSendTx,
        commitment,
    };
}
