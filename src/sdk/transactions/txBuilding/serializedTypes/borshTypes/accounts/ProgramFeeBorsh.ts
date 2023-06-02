/* eslint-disable camelcase */
// pub struct ProgramFee {
//     /// Consists of `lamports_per_signature` and possible additional compute units costs
//     pub lamports_per_tx: Lamports,

//     /// Per storage-amount fee in basis points
//     pub base_commitment_network_fee: BasisPointFee,

//     /// Per join-split-amount fee in basis points
//     pub proof_network_fee: BasisPointFee,

//     /// Used only as privacy mining incentive to push rewards for wardens without increasing user costs
//     pub base_commitment_subvention: Lamports,
//     pub proof_subvention: Lamports,

//     pub warden_hash_tx_reward: Lamports,
//     pub warden_proof_reward: Lamports,

//     /// Current tx count for init, combined miller loop, final exponentiation and finalization (dynamic tx for input preparation ignored)
//     pub proof_base_tx_count: u64,
// }

import { field } from '@dao-xyz/borsh';

export class ProgramFeeBorsh {
    @field({ type: 'u64' })
    public lamports_per_tx!: bigint;

    @field({ type: 'u64' })
    public base_commitment_network_fee!: bigint;

    @field({ type: 'u64' })
    public proof_network_fee!: bigint;

    @field({ type: 'u64' })
    public base_commitment_subvention!: bigint;

    @field({ type: 'u64' })
    public proof_subvention!: bigint;

    @field({ type: 'u64' })
    public warden_hash_tx_reward!: bigint;

    @field({ type: 'u64' })
    public warden_proof_reward!: bigint;

    @field({ type: 'u64' })
    public proof_base_tx_count!: bigint;

    constructor(
        lamports_per_tx: bigint,
        base_commitment_network_fee: bigint,
        proof_network_fee: bigint,
        base_commitment_subvention: bigint,
        proof_subvention: bigint,
        warden_hash_tx_reward: bigint,
        warden_proof_reward: bigint,
        proof_base_tx_count: bigint,
    ) {
        this.lamports_per_tx = lamports_per_tx;
        this.base_commitment_network_fee = base_commitment_network_fee;
        this.proof_network_fee = proof_network_fee;
        this.base_commitment_subvention = base_commitment_subvention;
        this.proof_subvention = proof_subvention;
        this.warden_hash_tx_reward = warden_hash_tx_reward;
        this.warden_proof_reward = warden_proof_reward;
        this.proof_base_tx_count = proof_base_tx_count;
    }
}
