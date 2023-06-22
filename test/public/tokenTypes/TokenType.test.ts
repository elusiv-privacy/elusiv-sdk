import { expect } from 'chai';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
    getAssociatedTokenAcc,
    getDenomination, getMintAccount, getNumberFromTokenType, getPythPriceAccount, getTokenInfo, getTokenType, getTokenTypeFromStr,
} from '../../../src/public/tokenTypes/TokenTypeFuncs.js';
import { tokenInfos } from '../../../src/public/tokenTypes/Token.js';
import { TokenType } from '../../../src/public/tokenTypes/TokenType.js';

describe('Token type tests', () => {
    tokenInfos.forEach((tokenInfo, i) => {
        it(`Correctly gets the token info for ${tokenInfo.symbol}`, () => {
            expect(getTokenInfo(tokenInfo.symbol)).to.deep.equal(tokenInfo);
        });

        it(`Correctly gets the mint account for ${tokenInfo.symbol} (default devnet)`, () => {
            expect(getMintAccount(tokenInfo.symbol, 'devnet')).to.deep.equal(tokenInfo.mintDevnet);
        });

        it(`Correctly gets the mint account for ${tokenInfo.symbol} (explicit devnet)`, () => {
            expect(getMintAccount(tokenInfo.symbol, 'devnet')).to.deep.equal(tokenInfo.mintDevnet);
        });

        it(`Correctly gets the mint account for ${tokenInfo.symbol} (explicit mainnet)`, () => {
            expect(getMintAccount(tokenInfo.symbol, 'devnet')).to.deep.equal(tokenInfo.mintDevnet);
        });

        it(`Correctly gets the denomination for ${tokenInfo.symbol}`, () => {
            expect(getDenomination(tokenInfo.symbol)).to.equal(tokenInfo.denomination);
        });

        it('Correctly gets the tokentype from index', () => {
            expect(getTokenType(i)).to.equal(tokenInfo.symbol);
        });

        it('Correctly gets the tokentype from string', () => {
            expect(getTokenTypeFromStr(tokenInfo.symbol)).to.equal(tokenInfo.symbol);
        });

        it('Correctly gets the number from tokentype', () => {
            expect(getNumberFromTokenType(tokenInfo.symbol)).to.equal(i);
        });

        it(`Correctly gets the pythprice account for ${tokenInfo.symbol}`, () => {
            expect(getPythPriceAccount(tokenInfo.symbol, 'devnet')).to.deep.equal(tokenInfo.pythUSDPriceDevnet);
            expect(getPythPriceAccount(tokenInfo.symbol, 'mainnet-beta')).to.deep.equal(tokenInfo.pythUSDPriceMainnet);
        });

        it(`Correctly gets the pyth symbol for ${tokenInfo.symbol}`, () => {
            expect(getPythPriceAccount(tokenInfo.symbol, 'devnet').equals(tokenInfo.pythUSDPriceDevnet));
            expect(getPythPriceAccount(tokenInfo.symbol, 'mainnet-beta').equals(tokenInfo.pythUSDPriceMainnet));
        });

        it(`Correctly gets ATA for ${tokenInfo.symbol}`, () => {
            const pk = new PublicKey(new Uint8Array(32).fill(10));
            if (tokenInfo.symbol === 'LAMPORTS') expect(getAssociatedTokenAcc(pk, tokenInfo.symbol, 'devnet').equals(pk)).to.be.true;
            else {
                const mint = getMintAccount(tokenInfo.symbol, 'devnet');
                const ata = getAssociatedTokenAddressSync(mint, pk);
                expect(getAssociatedTokenAcc(pk, tokenInfo.symbol, 'devnet').equals(ata)).to.be.true;
            }
        });
    });

    const FAKE_TOKEN: TokenType = 'FAKE_TOKEN' as TokenType;

    it('Throws for getting token info for a non-existing token', () => {
        expect(() => getTokenInfo(FAKE_TOKEN)).to.throw();
    });

    it('Throws for getting mint account for a non-existing token', () => {
        expect(() => getMintAccount(FAKE_TOKEN, 'devnet')).to.throw();
    });

    it('Throws for getting denomination for a non-existing token', () => {
        expect(() => getDenomination(FAKE_TOKEN)).to.throw();
    });

    it('Throws for getting tokentype from index for a non-existing token', () => {
        expect(() => getTokenType(100)).to.throw();
    });

    it('Throws for getting tokentype from string for a non-existing token', () => {
        expect(() => getTokenTypeFromStr(FAKE_TOKEN)).to.throw();
    });

    it('Throws for getting number from tokentype for a non-existing token', () => {
        expect(() => getNumberFromTokenType(FAKE_TOKEN)).to.throw();
    });

    it('Throws for getting pythprice account for a non-existing token', () => {
        expect(() => getPythPriceAccount(FAKE_TOKEN, 'devnet')).to.throw();
        expect(() => getPythPriceAccount(FAKE_TOKEN, 'mainnet-beta')).to.throw();
    });

    it('Throws for getting pyth price key for a non-existing token', () => {
        expect(() => getPythPriceAccount(FAKE_TOKEN, 'devnet')).to.throw();
        expect(() => getPythPriceAccount(FAKE_TOKEN, 'mainnet-beta')).to.throw();
    });

    it('Throws for getting ATA for a non-existing token', () => {
        expect(() => getAssociatedTokenAcc(new PublicKey(new Uint8Array(32).fill(10)), FAKE_TOKEN, 'devnet')).to.throw();
    });
});
