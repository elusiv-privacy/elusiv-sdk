// Helper class that implements the calculations for fees from
// https://github.com/elusiv-privacy/elusiv/blob/master/elusiv/src/commitment.rs

import { IncompleteSendQuadraProofInputs } from 'elusiv-circuits';
import { bigIntToNumber, serializeUint256LE } from '@elusiv/serialization';
import {
    ADD_COST,
    ADD_MIXED_COST,
    BASE_TX_PER_HASH,
    MAX_BATCHING_RATE, MAX_CUS, MERKLE_TREE_HEIGHT, TOO_LARGE_SIZE,
} from '../../../constants.js';
import { Fee } from '../../../public/Fee.js';
import { FeeAccBorsh } from '../../transactions/txBuilding/serializedTypes/borshTypes/accounts/FeeAccBorsh.js';
import { divCeilBigInt } from '../../utils/bigIntUtils.js';
import { repeatChar } from '../../utils/stringUtils.js';

// Class used for calculating the fees of Send and Store transactions.
// The reason this is one big class instead of a super class for shared methods and
// individual child classes for send and store fees is because for store we might have
// a merge as well, which is a type of send. If this is the case, we'd need two seperate calculators
// that effectively hold the same data but just do differenct calculations with it. By having both function types
// that operate on this data in one place we can avoid this.

export class FeeCalculator {
    private feeData: FeeAccBorsh;

    private minBatchingRate: number;

    public constructor(feeData: FeeAccBorsh, minBatchingRate: number) {
        this.feeData = feeData;
        this.minBatchingRate = minBatchingRate;
    }

    /**
     *
     * Public Fee Calculation functions
     *
     */

    // Estimator (can be called before building the tx)
    public estimateStoreFee(amount: number): Fee {
        return this.getStoreFee(BigInt(amount));
    }

    // Estimator (can be called before building the tx)
    public estimateSendFee(amount: number, recipientExists: boolean, tokenAccRentLamports: number): Fee {
        const inputs = getDummyIncompleteSendQuadraInputs();
        const maxCommIndex = (2 ** MERKLE_TREE_HEIGHT) - 1;
        // We guess max comm index as the recent comm index to worst case overshoot
        return this.getSendFee(inputs, BigInt(amount), maxCommIndex, tokenAccRentLamports, recipientExists);
    }

    public getStoreFee(amount: bigint): Fee {
        return {
            tokenType: 'LAMPORTS',
            txFee: bigIntToNumber(this.getStoreTotalFee(amount)),
            privacyFee: bigIntToNumber(this.getStorePrivacyFee()),
            extraFee: 0,
            tokenAccRent: 0,
            lamportsPerToken: 1,
        };
    }

    public getSendFee(
        inputs: IncompleteSendQuadraProofInputs,
        amountToSend: bigint,
        recentCommIndex: number,
        tokenAccRentLamports: number,
        recipientExists: boolean,
    ): Fee {
        // The reason this includes the privacy fee as well is because the transaction fee
        // depends on the number of transactions, which itself again depends on the size of the public inputs.
        // One of the public inputs is the total amount of money being transferred i.e. including the privacy fee influences
        // the txFee.
        const totalFee = this.getSendTotalFee(inputs, amountToSend, recentCommIndex);
        const privacyFee = this.getSendPrivacyFee(amountToSend);
        return {
            tokenType: 'LAMPORTS',
            txFee: bigIntToNumber(totalFee - privacyFee),
            privacyFee: bigIntToNumber(privacyFee),
            extraFee: bigIntToNumber(inputs.hashedData.optionalFeeAmount),
            tokenAccRent: recipientExists ? 0 : tokenAccRentLamports,
            lamportsPerToken: 1,
        };
    }

    /**
     *
     * START Store Fee Calculation functions
     *
     */
    private getStoreTotalFee(amount: bigint): bigint {
        return BigInt(BASE_TX_PER_HASH) * this.hashTxCompensation()
            + this.baseCommNetworkFee(amount)
            + this.commitmentHashFee()
            // Extra lamports per tx because warden is also the feepayer for the init tx
            + this.feeData.program_fee.lamports_per_tx
            - this.feeData.program_fee.base_commitment_subvention;
    }

    // Non-static method for symmetry with non-static getSendPrivacyFee
    // eslint-disable-next-line class-methods-use-this
    private getStorePrivacyFee(): bigint {
        return BigInt(0);
    }

    /**
     *
     * END Store Fee Calculation functions
     *
     */

    /**
     *
     * START Send fee calculation function
     *
     */

    private getSendTotalFee(
        inputs: IncompleteSendQuadraProofInputs,
        amountToSend: bigint,
        recenCommIndex: number,
    ): bigint {
        const pubInputsNoAmount = FeeCalculator.getPublicInputsFromSendQuadraInputsForFeeCalc(inputs, BigInt(recenCommIndex));
        return this.getSendTotalFeeInner(pubInputsNoAmount, amountToSend);
    }

    /**
     * Takes in the public inputs and computes the fee to add to the amount.
     * The reason this includes the privacy fee as well is because the transaction fee
     * depends on the number of transactions, which itself again depends on the size of the public inputs.
     * One of the public inputs is the total amount of money being transferred i.e. including the privacy fee.
     */
    private getSendTotalFeeInner(
        pubInputsNoAmount: bigint[],
        amountToSend: bigint,
    ): bigint {
        // Tx count WITHOUT AMOUNT INCLUDED
        const { txCount, usedCUsLastTx } = FeeCalculator.getInputPreparationTxCountNoAmount(pubInputsNoAmount);

        // Amount without amount input preparation fee
        let baseAmount = amountToSend
            + this.getSendFeeFixedCosts()
            + this.getSendPrivacyFee(amountToSend)
            + BigInt(txCount) * this.proofTxCompensation();
        let remainingSubvention = BigInt(this.feeData.program_fee.proof_subvention);

        if (baseAmount > remainingSubvention) {
            baseAmount -= remainingSubvention;
            remainingSubvention = BigInt(0);
        }
        else {
            baseAmount = BigInt(0);
            remainingSubvention -= baseAmount;
        }

        // Amount takes at most x = (31 * ADD_MIXED_COST + ADD_COST) / MAX_CUS
        // extra txs if we have all non - 0s.
        // We start by adding the cost for 0 extra txs. If that doesn't work, we check if we can do it in x+1

        const maxExtraTx = Math.ceil((31 * ADD_MIXED_COST + ADD_COST) / MAX_CUS);

        for (let i = 0; i < maxExtraTx + 1; i++) {
            const totalAmount = baseAmount + BigInt(i) * this.proofTxCompensation();

            const neededTxs = FeeCalculator.getTxCountForExtraInput(totalAmount, usedCUsLastTx);

            // If we need leq txs than we're willing to spend, return this amount
            if (neededTxs <= i) {
                const baseTxCost = totalAmount - amountToSend - remainingSubvention;
                return baseTxCost;
            }
        }

        throw new Error(TOO_LARGE_SIZE('transaction count', maxExtraTx + 1, maxExtraTx));
    }

    // Fee added by Elusiv, not used for tx computation costs
    private getSendPrivacyFee(amount: bigint): bigint {
        return this.proofVerificationNetworkFee(amount);
    }

    // Gets costs independent of amount being sent
    private getSendFeeFixedCosts(): bigint {
        return this.feeData.program_fee.warden_proof_reward
            + this.commitmentHashFee()
            + this.feeData.program_fee.proof_base_tx_count * this.proofTxCompensation();
    }

    // Price for one tx for verifying a proof
    private proofTxCompensation(): bigint {
        return this.feeData.program_fee.lamports_per_tx + this.feeData.program_fee.warden_proof_reward;
    }

    // Fee paid to the elusiv network for sending a specified amount
    // floor(proof_network_fee * amount / 10_000)
    private proofVerificationNetworkFee(amount: bigint): bigint {
        return (this.feeData.program_fee.proof_network_fee * amount) / BigInt(10_000);
    }

    private baseCommNetworkFee(amount: bigint): bigint {
        return (this.feeData.program_fee.base_commitment_network_fee * amount) / BigInt(10_000);
    }

    // Based on https://github.com/elusiv-privacy/elusiv/blob/master/elusiv/src/proof/verifier.rs
    private static getInputPreparationTxCountNoAmount(publicInputs: bigint[]): { txCount: number, usedCUsLastTx: number } {
        const instructions: number[] = [];

        let rounds = 0;
        let computeUnits = 0;

        for (const publicInput of publicInputs) {
            const publicInputBits = serializeUint256LE(publicInput);
            for (let b = 0; b < 33; b++) {
                let cus: number;
                if (b === 32) {
                    cus = publicInput === BigInt(0) ? 0 : ADD_COST;
                }
                else {
                    cus = publicInputBits[b] === 0 ? 0 : ADD_MIXED_COST;
                }

                // We start a new tx
                if (computeUnits + cus > MAX_CUS) {
                    instructions.push(rounds);
                    rounds = 1;
                    computeUnits = cus;
                }
                else {
                    rounds += 1;
                    computeUnits += cus;
                }
            }
        }

        if (rounds > 0) {
            instructions.push(rounds);
        }

        return { txCount: instructions.length, usedCUsLastTx: computeUnits };
    }

    // Returns the total compute units needed for preparing one input
    private static getTxCountForExtraInput(input: bigint, startingCUs: number): number {
        const { txCount, usedCUsLastTx } = this.getInputPreparationTxCountNoAmount([input]);
        // Check if the spare CUs need an extra tx. txCount -1 because we don't neccesarily need the extra tx
        // if our input already fits in the previous tx
        return txCount - 1 + (usedCUsLastTx + startingCUs > MAX_CUS ? 1 : 0);
    }

    // IMPORTANT: DOES NOT RETURN GENERAL PROOF INPUTS, ONLY FOR FEE CALCULATION, MEANING:
    // - Amount is not defined yet, as this depends on the resulting fee
    // - nextCommitmentHash is 253 '1' bits
    // - Rest of public inputs is normal, which are:
    // > root,
    // > nullifierHash,
    // > recipient,
    // > identifier,
    // > salt,
    // > feeVersion
    private static getPublicInputsFromSendQuadraInputsForFeeCalc(
        inputs: IncompleteSendQuadraProofInputs,
        recentCommIndex: bigint,
    ): bigint[] {
        const res: bigint[] = [];
        res.push(...inputs.nHashes);
        res.push(...inputs.roots);
        res.push(inputs.feeVersion);
        res.push(inputs.tokenId);
        // TODO: These could be assigning too much fee.
        // The program/warden should accept txs offering more fee than needed.
        // We assume the hashed inputs hash is 253 1 bits
        res.push(BigInt(`0b${repeatChar('1', 253)}`));
        // We assume next commitment is 253 1 bits
        res.push(BigInt(`0b${repeatChar('1', 253)}`));
        res.push(recentCommIndex);
        return res;
    }

    /**
     *
     * END Send fee calculation function
     *
     */

    /**
     *
     * Functions used for Calculation by both store and send
     *
     */

    private commitmentHashFee(): bigint {
        const txCount = this.getCommitmentHashTxCount();
        const commsPerBatch = this.getCommitmentsPerBatch();
        return divCeilBigInt(
            BigInt(txCount) * this.hashTxCompensation(),
            BigInt(commsPerBatch),
        );
    }

    private getCommitmentHashTxCount(): number {
        // Mapping from batch rate to TOTAL tx count (not per hash)
        const mapping = [24, 24, 25, 29, 37];
        // MAX_BATCHING_RATE + 1 because array also includes for batching rate 0
        if (this.minBatchingRate > MAX_BATCHING_RATE || mapping.length !== MAX_BATCHING_RATE + 1) {
            throw new Error(TOO_LARGE_SIZE('Batching rate', this.minBatchingRate, MAX_BATCHING_RATE));
        }

        return mapping[this.minBatchingRate];
    }

    private getCommitmentsPerBatch(): number {
        // Max safe integer in js 2^53 - 1
        if (this.minBatchingRate >= 53) throw new Error(TOO_LARGE_SIZE('Minimum batching rate', this.minBatchingRate, 53));
        return 2 ** this.minBatchingRate;
    }

    // Price for one 'crank' for computing a hash
    private hashTxCompensation(): bigint {
        return this.feeData.program_fee.lamports_per_tx + this.feeData.program_fee.warden_hash_tx_reward;
    }
}

function getDummyIncompleteSendQuadraInputs(): IncompleteSendQuadraProofInputs {
    // 64 bit number with equal amount of 1 and 0 (i.e. 32 0 bits followed by 32 1 bits)
    const alternating64 = BigInt('4294967295');
    const a64Arr4 = [alternating64, alternating64, alternating64, alternating64];
    // 16 bit number with equal amount of 1 and 0 (i.e. 8 0 bits followed by 8 1 bits)
    const alternating16 = BigInt('255');
    // 20 bit number with equal amount of 1 and 0 (i.e. 10 0 bits followed by 10 1 bits)
    const alternating20 = BigInt('1048575');
    const a20Arr4 = [alternating20, alternating20, alternating20, alternating20];
    // 256 bit number with equal amount of 1 and 0 (i.e. 128 0 bits followed by 128 1 bits)
    const alternating256 = BigInt('340282366920938463463374607431768211455');
    const a256Arr4 = [alternating256, alternating256, alternating256, alternating256];
    const a256Arr20 = [
        alternating256, alternating256, alternating256, alternating256, alternating256, alternating256,
        alternating256, alternating256, alternating256, alternating256, alternating256, alternating256,
        alternating256, alternating256, alternating256, alternating256, alternating256, alternating256,
        alternating256, alternating256, alternating256, alternating256, alternating256, alternating256,
    ];
    return {
        commitmentHashes: a256Arr4,
        nullifiers: a256Arr4,
        balances: a64Arr4,
        assocCommIndexes: a20Arr4,
        openings: [a256Arr20, a256Arr20, a256Arr20, a256Arr20],
        position: a256Arr4,
        roots: a256Arr4,
        nHashes: a256Arr4,
        feeVersion: alternating16,
        tokenId: alternating16,
        hashedData: {
            recipient: BigInt(0),
            identifier: BigInt(0),
            iv: BigInt(0),
            encryptedOwner: BigInt(0),
            solanaPayId: BigInt(0),
            optionalFeeCollector: BigInt(0),
            optionalFeeAmount: BigInt(0),
            isAssociatedTokenAccount: true,
        },
    };
}
