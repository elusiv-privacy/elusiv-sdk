import { Cluster, PublicKey } from '@solana/web3.js';
import { FEE_COLLECTOR_SEED, POOL_ACC_SEED } from '../constants.js';
import { AccountReader } from '../sdk/accountReaders/AccountReader.js';

export type WardenInfo = {
    /**
     * URL at which the warden is listening for RPC calls
     */
    url: string,
    /**
     * Public key the warden is sending txs from
     */
    pubKey: PublicKey
}

export function getDefaultWarden(cluster: Cluster): WardenInfo {
    switch (cluster) {
        case 'mainnet-beta': return { url: 'https://warden-mainnet.elusiv.io', pubKey: new PublicKey('6f3BpUtZUgsc4xiLyqNhwEuQZ9MxSXUdsUAAyYqZyxe9') };
        case 'devnet': return { url: 'https://warden-devnet.elusiv.io', pubKey: new PublicKey('DKd9AdVt2ai1rZ37Y64rSvqEz1bubdPHhhYMccKruzfv') };
        default: throw new Error('Invalid cluster for warden');
    }
}

export function getElusivProgramId(cluster: Cluster): PublicKey {
    switch (cluster) {
        case 'mainnet-beta': return new PublicKey('4CgyHKuP6yi1vbmcdsArngEKcETR4nZupqYEMk2hEoQd');
        case 'devnet': return new PublicKey('B5TTFPKCd2Rkw3vAJigLeRCDGK673vfAWefmrrZKou9V');
        default: throw new Error('Invalid cluster for program id');
    }
}

export function getElusivPoolAddress(cluster: Cluster): PublicKey {
    const elusivProgramId = getElusivProgramId(cluster);
    return AccountReader.generateElusivPDAFrom([POOL_ACC_SEED], elusivProgramId)[0];
}

export function getElusivFeeCollectorAddress(cluster: Cluster): PublicKey {
    const elusivProgramId = getElusivProgramId(cluster);
    return AccountReader.generateElusivPDAFrom([FEE_COLLECTOR_SEED], elusivProgramId)[0];
}
