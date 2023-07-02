import { PublicKey } from '@solana/web3.js';
import { IncompleteCommitment } from '@elusiv/cryptojs';
import { ElusivTransaction } from './ElusivTransaction.js';

// Store Tx without reconstructing the commitment, as this isn't possible with rvk parsing
export type PartialStoreTx = ElusivTransaction & {
    sender: PublicKey;
    parsedPrivateBalance: bigint;
    hashAccIndex: number;
    // Was this store tx a recipient key?
    isRecipient: boolean;
}

export type StoreTx = PartialStoreTx & {
    commitment: IncompleteCommitment;
};
