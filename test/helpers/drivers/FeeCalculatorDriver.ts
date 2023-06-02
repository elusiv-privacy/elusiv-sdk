/* eslint-disable @typescript-eslint/no-unused-vars */
import { IncompleteSendQuadraProofInputs } from 'elusiv-circuits';
import { Fee } from '../../../src/public/Fee.js';

export class FeeCalculatorDriver {
    private storeFee? : Fee;

    private sendFee? : Fee;

    public constructor(storeFee? : Fee, sendFee? : Fee) {
        this.storeFee = storeFee;
        this.sendFee = sendFee;
    }

    public getStoreFee() : Fee {
        if (this.storeFee === undefined) throw new Error('Undefined store fee');
        return this.storeFee;
    }

    public getSendFee(
        inputs: IncompleteSendQuadraProofInputs,
        amountToSend: bigint,
        tokenCreationFee: bigint,
    ) : Fee {
        if (this.sendFee === undefined) throw new Error('Undefined send fee');
        return this.sendFee;
    }
}
