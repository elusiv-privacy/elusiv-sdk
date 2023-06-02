import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { FeeUtils } from '../../../src/sdk/paramManagers/fee/FeeUtils.js';

describe('Fee utils tests', () => {
    describe('Lamport fee to fee object tests', () => {
        it('Correctly converts 0 fee to fee object', () => {
            const fee = FeeUtils.lamportFeeToTokenFee({
                tokenType: 'LAMPORTS',
                txFee: 0,
                privacyFee: 0,
                tokenAccRent: 0,
                lamportsPerToken: 1,
            }, 'LAMPORTS', 1 / LAMPORTS_PER_SOL, 0);

            expect(fee.txFee).to.equal(0);
            expect(fee.privacyFee).to.equal(0);
            expect(fee.tokenType).to.equal('LAMPORTS');
            expect(fee.lamportsPerToken).to.equal(1 / LAMPORTS_PER_SOL);
            expect(fee.extraFee).to.equal(0);
        });

        it('Correctly converts non-zero fee from lamports to lamports for normal amount', () => {
            const fee = FeeUtils.lamportFeeToTokenFee({
                tokenType: 'LAMPORTS',
                txFee: 100_000,
                privacyFee: 200_000,
                tokenAccRent: 0,
                lamportsPerToken: 1,
            }, 'LAMPORTS', 1, 0);

            expect(fee.txFee).to.equal(100_000);
            expect(fee.privacyFee).to.equal(200_000);
            expect(fee.tokenType).to.equal('LAMPORTS');
            expect(fee.lamportsPerToken).to.equal(1);
            expect(fee.extraFee).to.equal(0);
        });

        it('Correctly converts non-zero fee from lamports to lamports for normal amount', () => {
            const fee = FeeUtils.lamportFeeToTokenFee({
                tokenType: 'LAMPORTS',
                txFee: 100_000,
                privacyFee: 200_000,
                tokenAccRent: 0,
                lamportsPerToken: 1,
            }, 'LAMPORTS', 1, 100_000);

            expect(fee.txFee).to.equal(100_000);
            expect(fee.privacyFee).to.equal(200_000);
            expect(fee.tokenType).to.equal('LAMPORTS');
            expect(fee.lamportsPerToken).to.equal(1);
            expect(fee.extraFee).to.equal(100_000);
        });

        it('Correctly converts non-zero fee from lamports to lamports for very small amount', () => {
            const fee = FeeUtils.lamportFeeToTokenFee({
                tokenType: 'LAMPORTS',
                txFee: 1,
                privacyFee: 2,
                tokenAccRent: 0,
                lamportsPerToken: 1,
            }, 'LAMPORTS', 1, 0);

            expect(fee.txFee).to.equal(1);
            expect(fee.privacyFee).to.equal(2);
            expect(fee.tokenType).to.equal('LAMPORTS');
            expect(fee.lamportsPerToken).to.equal(1);
            expect(fee.extraFee).to.equal(0);
        });

        it('Correctly converts non-zero fee from lamports to USDC for normal amount', () => {
            const fee = FeeUtils.lamportFeeToTokenFee({
                tokenType: 'LAMPORTS',
                txFee: 100_000,
                privacyFee: 200_000,
                tokenAccRent: 0,
                lamportsPerToken: 1,
            }, 'USDC', 10, 0);

            expect(fee.txFee).to.equal(10_000 * 1.02);
            expect(fee.privacyFee).to.equal(20_000 * 1.02);
            expect(fee.tokenType).to.equal('USDC');
            expect(fee.lamportsPerToken).to.equal(10);
            expect(fee.extraFee).to.equal(0);
        });

        it('Correctly converts non-zero fee from lamports to USDC for normal amount', () => {
            const fee = FeeUtils.lamportFeeToTokenFee({
                tokenType: 'LAMPORTS',
                txFee: 1,
                privacyFee: 2,
                tokenAccRent: 0,
                lamportsPerToken: 1,
            }, 'USDC', 1 / 10, 0);

            expect(fee.txFee).to.equal(Math.ceil(1 * 10 * 1.02));
            expect(fee.privacyFee).to.equal(Math.ceil(2 * 10 * 1.02));
            expect(fee.tokenType).to.equal('USDC');
            expect(fee.lamportsPerToken).to.equal(0.1);
            expect(fee.extraFee).to.equal(0);
        });

        it('Correctly converts non-zero fee from lamports to USDC for normal amount', () => {
            const fee = FeeUtils.lamportFeeToTokenFee({
                tokenType: 'LAMPORTS',
                txFee: 100_000,
                privacyFee: 200_000,
                tokenAccRent: 0,
                lamportsPerToken: 1,
            }, 'USDC', 10, 100);

            expect(fee.txFee).to.equal(10_000 * 1.02);
            expect(fee.privacyFee).to.equal(20_000 * 1.02);
            expect(fee.tokenType).to.equal('USDC');
            expect(fee.lamportsPerToken).to.equal(10);
            expect(fee.extraFee).to.equal(100);
        });
    });

    describe('Pyth price tests', () => {
        it('Correctly converts to token from bigint lamports with lamportsPerToken', () => {
            const token = FeeUtils['lamportsToToken'](1_000_000_000, 2);
            expect(token).to.equal(500_000_000);
        });

        it('Correctly converts to token from bigint lamports with lamportsPerToken when lamportsPerToken is 0', () => {
            const token = FeeUtils['lamportsToToken'](1_000_000_000, 0);
            expect(token).to.equal(0);
        });

        it('Correctly converts to token from bigint lamports with lamportsPerToken when lamports is 0', () => {
            const token = FeeUtils['lamportsToToken'](0, 2);
            expect(token).to.equal(0);
        });

        it('Correctly converts to token from bigint lamports with lamportsPerToken when both are 0', () => {
            const token = FeeUtils['lamportsToToken'](0, 0);
            expect(token).to.equal(0);
        });

        it('Correctly converts from token to lamports with lamportsPerToken', () => {
            const lamports = FeeUtils['tokenToLamports'](0.5, 2);
            expect(lamports).to.equal(1);
        });

        it('Correctly converts from token to lamports with lamportsPerToken when lamportsPerToken is 0', () => {
            const lamports = FeeUtils['tokenToLamports'](0.5, 0);
            expect(lamports).to.equal(0);
        });

        it('Correctly converts from token to lamports with lamportsPerToken when token is 0', () => {
            const lamports = FeeUtils['tokenToLamports'](0, 2);
            expect(lamports).to.equal(0);
        });

        it('Correctly converts from token to lamports with lamportsPerToken when both are 0', () => {
            const lamports = FeeUtils['tokenToLamports'](0, 0);
            expect(lamports).to.equal(0);
        });

        it('Correctly converts from lamports to token with lamportsPerToken', () => {
            const token = FeeUtils.lamportsToToken(1, 2);
            expect(token).to.equal(0.5);
        });

        it('Correctly converts from lamports to token with lamportsPerToken when lamportsPerToken is 0', () => {
            const token = FeeUtils.lamportsToToken(1, 0);
            expect(token).to.equal(0);
        });

        it('Correctly converts from lamports to token with lamportsPerToken when lamports is 0', () => {
            const token = FeeUtils.lamportsToToken(0, 2);
            expect(token).to.equal(0);
        });

        it('Correctly converts from lamports to token with lamportsPerToken when both are 0', () => {
            const token = FeeUtils.lamportsToToken(0, 0);
            expect(token).to.equal(0);
        });
    });
});
