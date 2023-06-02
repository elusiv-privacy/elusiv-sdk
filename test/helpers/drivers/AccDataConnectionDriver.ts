import {
    AccountInfo,
    Commitment,
    GetAccountInfoConfig, PublicKey,
} from '@solana/web3.js';
import { zeros } from 'elusiv-serialization';

// Simulates a connection object for testing that provides access
// to account data
export class AccDataConnectionDriver {
    private addressToData : Map<string, Buffer>;

    public constructor() {
        this.addressToData = new Map<string, Buffer>();
    }

    public getAccountInfo(
        publicKey: PublicKey,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        commitmentOrConfig?: Commitment | GetAccountInfoConfig,
    ): Promise<AccountInfo<Buffer> | null> {
        const data = this.addressToData.get(publicKey.toBase58());
        if (data === undefined) return Promise.resolve(null);
        const res : AccountInfo<Buffer> = {
            executable: false,
            owner: new PublicKey(zeros(32)),
            lamports: 0,
            data: (data as Buffer),
        };
        return Promise.resolve(res);
    }

    public addAccountData(pubKey : PublicKey, data : Buffer) : void {
        this.addressToData.set(pubKey.toBase58(), data);
    }
}
