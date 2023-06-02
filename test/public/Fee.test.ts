import { expect } from 'chai';
import {
    addFees,
    Fee, getTotalFeeAmount, getTotalFeeAmountSol, zeroFee,
} from '../../src/public/Fee.js';

describe('Fee type tests', () => {
    it('Correctly gets the total fee amount', () => {
        const fee: Fee = {
            tokenType: 'LAMPORTS',
            txFee: 1,
            privacyFee: 2,
            tokenAccRent: 0,
            extraFee: 0,
        };
        expect(getTotalFeeAmount(fee)).to.equal(fee.txFee + fee.privacyFee);
    });

    it('Correctly gets the total fee amount in sol', () => {
        const fee: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            lamportsPerToken: 0.5,
            extraFee: 0,
        };

        expect(getTotalFeeAmountSol(fee)).to.equal(0.00015);
    });

    it('Throws an error if the conversion rate is not defined', () => {
        const fee: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            extraFee: 0,
        };

        expect(() => getTotalFeeAmountSol(fee)).to.throw();
    });

    it('Correctly creates a zero fee', () => {
        const zero = zeroFee('USDC');

        expect(zero.tokenType).to.equal('USDC');
        expect(zero.txFee).to.equal(0);
        expect(zero.privacyFee).to.equal(0);
        expect(zero.lamportsPerToken).to.be.undefined;
    });

    it('Correctly adds two fees', () => {
        const fee1: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            lamportsPerToken: 0.5,
            extraFee: 0,
        };
        const fee2: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            lamportsPerToken: 0.5,
            extraFee: 0,
        };

        const sum: Fee = {
            tokenType: 'USDC',
            txFee: 200_000,
            tokenAccRent: 0,
            privacyFee: 400_000,
            lamportsPerToken: 0.5,
            extraFee: 0,
        };

        expect(addFees(fee1, fee2)).to.deep.equal(sum);
    });

    it('Correctly adds two fees', () => {
        const fee1: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            lamportsPerToken: 0.5,
            extraFee: 200_000,
        };
        const fee2: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            lamportsPerToken: 0.5,
            extraFee: 100_000,
        };

        const sum: Fee = {
            tokenType: 'USDC',
            txFee: 200_000,
            tokenAccRent: 0,
            privacyFee: 400_000,
            lamportsPerToken: 0.5,
            extraFee: 300_000,
        };

        expect(addFees(fee1, fee2)).to.deep.equal(sum);
    });

    it('Correctly converts if one conversion rate is not defined', () => {
        const fee1: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            lamportsPerToken: 0.5,
            extraFee: 300_000,
        };
        const fee2: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            extraFee: 200_000,
        };

        const sum: Fee = {
            tokenType: 'USDC',
            txFee: 200_000,
            privacyFee: 400_000,
            tokenAccRent: 0,
            lamportsPerToken: 0.5,
            extraFee: 500_000,
        };

        expect(addFees(fee1, fee2)).to.deep.equal(sum);
    });

    it('Correctly converts if both the conversion rates are not defined', () => {
        const fee1: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            extraFee: 0,
        };
        const fee2: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            extraFee: 0,
        };

        const sum: Fee = {
            tokenType: 'USDC',
            txFee: 200_000,
            privacyFee: 400_000,
            lamportsPerToken: undefined,
            tokenAccRent: 0,
            extraFee: 0,
        };

        expect(addFees(fee1, fee2)).to.deep.equal(sum);
    });

    it('Throws an error if the token types are different', () => {
        const fee1: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            lamportsPerToken: 0.5,
            extraFee: 0,
        };
        const fee2: Fee = {
            tokenType: 'LAMPORTS',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            lamportsPerToken: 0.5,
            extraFee: 0,
        };

        expect(() => addFees(fee1, fee2)).to.throw();
    });

    it('Throws an error if the conversion rates are different', () => {
        const fee1: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            lamportsPerToken: 0.5,
            extraFee: 0,
        };
        const fee2: Fee = {
            tokenType: 'USDC',
            txFee: 100_000,
            privacyFee: 200_000,
            tokenAccRent: 0,
            lamportsPerToken: 0.6,
            extraFee: 0,
        };

        expect(() => addFees(fee1, fee2)).to.throw();
    });
});
