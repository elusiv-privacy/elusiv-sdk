import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
    AccountMeta, Cluster, PartiallyDecodedInstruction, PublicKey, SystemProgram,
} from '@solana/web3.js';
import { ReprScalar } from 'elusiv-cryptojs';
import { AccountReader } from '../../accountReaders/AccountReader.js';
import {
    BASE_COMMITMENT_BUFFER_ACC_SEED, FEE_COLLECTOR_SEED, GOVERNOR_ACC_SEED, POOL_ACC_SEED, STORAGE_ACC_SEED,
} from '../../../constants.js';
import {
    getAssociatedTokenAcc, getPythPriceAccount, TokenType,
} from '../../../public/tokenTypes/TokenType.js';
import { getElusivProgramId } from '../../../public/WardenInfo.js';
import { RVKWrapper } from '../../clientCrypto/RVKWrapper.js';

// Warden is the feepayer
const WARDEN_INDEX = 2;
const IDENTIFIER_INDEX = 16;
export abstract class StoreInstructionBase {
    public readonly coreCommitmentHash: ReprScalar;

    public readonly commitmentHash: ReprScalar;

    public readonly feeVersion: number;

    public readonly minBatchingRate: number;

    public readonly hashAccIndex: number;

    // Mandatory params for getting keys, rest for generating ix
    constructor(
        hashAccIndex: number,
        coreCommitmentHash: ReprScalar,
        commitmentHash: ReprScalar,
        feeVersion: number,
        minBatchingRate: number,
    ) {
        this.hashAccIndex = hashAccIndex;
        this.minBatchingRate = minBatchingRate;
        this.coreCommitmentHash = coreCommitmentHash;
        this.commitmentHash = commitmentHash;
        this.feeVersion = feeVersion;
    }

    public getAccounts(
        rvk: RVKWrapper,
        nonce: number,
        hashingAcc: PublicKey,
        cluster: Cluster,
        sender: PublicKey,
        warden: PublicKey,
    ): AccountMeta[] {
        /*
            #[acc(sender, { signer })]
            #[acc(sender_account, { writable })]

            #[acc(fee_payer, { writable, signer })]
            #[acc(fee_payer_account, { writable })]

            #[pda(pool, PoolAccount, { writable, account_info })]
            #[acc(pool_account, { writable })]

            #[pda(fee_collector, FeeCollectorAccount, { writable, account_info })]
            #[acc(fee_collector_account, { writable })]

            #[acc(sol_price_account)] // if `token_id = 0` { `system_program` } else { `sol_price_account` }
            #[acc(token_price_account)] // if `token_id = 0` { `system_program` } else { `token_price_account` }

            #[pda(governor, GovernorAccount)]
            #[pda(storage_account, StorageAccount)]

            #[pda(hashing_account, BaseCommitmentHashingAccount, pda_offset = Some(hash_account_index), { writable, account_info, find_pda })]
            #[pda(buffer, BaseCommitmentBufferAccount, { writable })]

            #[acc(token_program)]   // if `token_id = 0` { `system_program` } else { `token_program` }
            #[sys(system_program, key = system_program::ID)]
            */

        const elusivProgramId = getElusivProgramId(cluster);

        let senderTokenAcc = sender;
        let feePayerTokenAcc = warden;
        const poolAcc = AccountReader.generateElusivPDAFrom([POOL_ACC_SEED], elusivProgramId)[0];
        let poolTokenAcc = poolAcc;
        const feeCollectorAcc = AccountReader.generateElusivPDAFrom([FEE_COLLECTOR_SEED], elusivProgramId)[0];
        let feeCollectorTokenAcc = feeCollectorAcc;
        let solPriceAcc = SystemProgram.programId;
        let tokenPriceAcc = SystemProgram.programId;
        const baseCommBufferAcc = AccountReader.generateElusivPDAFrom([BASE_COMMITMENT_BUFFER_ACC_SEED], elusivProgramId)[0];
        // Default value for token program is system program for lamports
        let tokenProgram = SystemProgram.programId;

        const tokenType = this.getTokenType();

        if (tokenType !== 'LAMPORTS') {
            senderTokenAcc = getAssociatedTokenAcc(sender, tokenType, cluster, true);
            feePayerTokenAcc = getAssociatedTokenAcc(warden, tokenType, cluster, true);
            poolTokenAcc = getAssociatedTokenAcc(poolAcc, tokenType, cluster, true);
            feeCollectorTokenAcc = getAssociatedTokenAcc(feeCollectorAcc, tokenType, cluster, true);
            solPriceAcc = getPythPriceAccount('LAMPORTS', cluster);
            tokenPriceAcc = getPythPriceAccount(tokenType, cluster);
            tokenProgram = TOKEN_PROGRAM_ID;
        }

        const identifierKey = rvk.getIdentifierKey(nonce);

        const res = [
            { pubkey: sender, isSigner: true, isWritable: false },
            { pubkey: senderTokenAcc, isSigner: false, isWritable: true },

            { pubkey: warden, isSigner: true, isWritable: true },
            { pubkey: feePayerTokenAcc, isSigner: false, isWritable: true },

            { pubkey: poolAcc, isSigner: false, isWritable: true },
            { pubkey: poolTokenAcc, isSigner: false, isWritable: true },

            { pubkey: feeCollectorAcc, isSigner: false, isWritable: true },
            { pubkey: feeCollectorTokenAcc, isSigner: false, isWritable: true },

            { pubkey: solPriceAcc, isSigner: false, isWritable: false },
            { pubkey: tokenPriceAcc, isSigner: false, isWritable: false },

            { pubkey: AccountReader.generateElusivPDAFrom([GOVERNOR_ACC_SEED], elusivProgramId)[0], isSigner: false, isWritable: false },
            { pubkey: AccountReader.generateElusivPDAFrom([STORAGE_ACC_SEED], elusivProgramId)[0], isSigner: false, isWritable: false },

            { pubkey: hashingAcc, isSigner: false, isWritable: true },
            { pubkey: baseCommBufferAcc, isSigner: false, isWritable: true },

            { pubkey: tokenProgram, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },

            {
                pubkey: identifierKey,
                isSigner: false,
                isWritable: false,
            },
        ];

        return res;
    }

    public abstract getTokenType(): TokenType;

    public abstract getAmount(): bigint;

    public abstract getAssocCommIndex(): number;

    public static getSenderAcc(ix: PartiallyDecodedInstruction): PublicKey {
        return ix.accounts[0];
    }

    public static getIdentifierAcc(ix: PartiallyDecodedInstruction): PublicKey {
        return ix.accounts[IDENTIFIER_INDEX];
    }

    public static getWardenAcc(ix: PartiallyDecodedInstruction): PublicKey {
        return ix.accounts[WARDEN_INDEX];
    }
}
