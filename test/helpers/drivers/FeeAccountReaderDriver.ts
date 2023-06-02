import { Pair } from '../../../src/sdk/utils/Pair.js';
import { FeeAccBorsh } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/FeeAccBorsh';

export class FeeAccountReaderDriver {
    private feeVersions: Map<number, FeeAccBorsh> = new Map();

    constructor(feeVersions: Pair<number, FeeAccBorsh>[]) {
        for (const { fst, snd } of feeVersions) {
            this.feeVersions.set(fst, snd);
        }
    }

    public async getCurrentFeeVersion(): Promise<number> {
        return Math.max(...this.feeVersions.keys());
    }

    public async getData(): Promise<FeeAccBorsh> {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.feeVersions.get(await this.getCurrentFeeVersion())!;
    }

    public async getDataFromVersion(version: number): Promise<FeeAccBorsh> {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.feeVersions.get(version)!;
    }
}
