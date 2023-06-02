import { GovernorAccBorsh } from '../../../src/sdk/transactions/txBuilding/serializedTypes/borshTypes/accounts/GovernorAccBorsh';

export class GovernorAccountReaderDriver {
    private data : GovernorAccBorsh;

    public constructor(data : GovernorAccBorsh) {
        this.data = data;
    }

    public async getData() : Promise<GovernorAccBorsh> {
        return this.data;
    }
}
