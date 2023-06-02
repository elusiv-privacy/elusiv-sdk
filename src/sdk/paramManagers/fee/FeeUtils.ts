import {
    Cluster, Connection, PublicKey,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress, getMinimumBalanceForRentExemptAccount, getAccount, TokenInvalidAccountOwnerError, TokenAccountNotFoundError,
} from '@solana/spl-token';
import { PriceStatus, PythHttpClient } from '@pythnetwork/client';
import { getPythProgramKeyForCluster } from '@pythnetwork/client/lib/cluster.js';
import {
    getDenomination, getMintAccount, getPythSymbol, TokenType,
} from '../../../public/tokenTypes/TokenType.js';
import { BasicFee, Fee } from '../../../public/Fee.js';
import { zipSameLength } from '../../utils/utils.js';

// Default precision is 9 due to 1 SOL = 10^9 Lamports
const DEFAULT_PRECISION = 9;

export class FeeUtils {
    /**
     * Converts a lamport fee to a token fee. Important note: This adds 2% to the fee amount when using a token type other than lamports
     * to account for any potential price fluctuations to ensure the tx goes through.
     * @param lamportFee Fee in lamports
     * @param tokenType Token type to convert to
     * @param lamportsPerToken The amount of lamports per token
     * @returns The fee in the token type
     */
    public static lamportFeeToTokenFee(
        lamportFee: BasicFee,
        tokenType: TokenType,
        lamportsPerToken: number,
        extraFeeInToken: number,
    ): Fee {
        if (lamportFee.tokenType !== 'LAMPORTS') throw new Error('Expected fee in lamports');
        const bufferMultiplier = tokenType === 'LAMPORTS' ? 1 : 1.02;
        const lamportAmounts: number[] = [lamportFee.txFee, lamportFee.privacyFee, lamportFee.tokenAccRent];
        const tokenAmounts = lamportAmounts.map((lamportAmount) => FeeUtils.lamportsToToken(lamportAmount, lamportsPerToken));
        return {
            tokenType,
            txFee: Math.ceil(tokenAmounts[0] * bufferMultiplier),
            privacyFee: Math.ceil(tokenAmounts[1] * bufferMultiplier),
            tokenAccRent: Math.ceil(tokenAmounts[2] * bufferMultiplier),
            lamportsPerToken,
            extraFee: extraFeeInToken,
        };
    }

    public static async getTokenSendFee(connection: Connection, cluster: Cluster, tokenType: TokenType, recipient?: PublicKey): Promise<bigint> {
        // No fee for creating an associate acc if we're sennding lamports or we have no recipient (i.e. we're merging)
        if (tokenType === 'LAMPORTS' || recipient === undefined) return BigInt(0);

        const rentPromise = getMinimumBalanceForRentExemptAccount(connection);
        const mintAcc = getMintAccount(tokenType, cluster);
        // Acc exists? No extra cost
        if (await FeeUtils.hasAssociatedAccount(connection, recipient, mintAcc)) return BigInt(0);
        return rentPromise.then((rent) => BigInt(rent));
    }

    public static async getLamportsPerToken(connection: Connection, cluster: Cluster, tokenType: TokenType): Promise<number> {
        if (tokenType === 'LAMPORTS') return 1;
        const priceData = await FeeUtils.fetchPythPrices(connection, cluster, ['LAMPORTS', tokenType]);
        // USD/T / USD/L  = USD/T * L/USD = L/T
        return priceData[1] / priceData[0];
    }

    public static tokenToLamports(tokenAmount: number, lamportsPerToken: number): number {
        if (lamportsPerToken === 0) return 0;
        return tokenAmount * lamportsPerToken;
    }

    public static lamportsToToken(lamportAmount: number, lamportsPerToken: number, precision = DEFAULT_PRECISION): number {
        if (lamportsPerToken === 0) return 0;
        // L / (L/T) = L * (T/L) = T
        return Number.parseFloat((lamportAmount / lamportsPerToken).toFixed(precision));
    }

    private static async fetchPythPrices(connection: Connection, cluster: Cluster, tokens: TokenType[], maxRetries = 5, msBetweenRetries = 200): Promise<number[]> {
        const pythPublicKey = getPythProgramKeyForCluster(cluster);
        const pythClient = new PythHttpClient(connection, pythPublicKey);
        for (let i = 0; i < maxRetries; i++) {
            // eslint-disable-next-line no-await-in-loop
            const priceData = await pythClient.getData();
            const prices = tokens.map((t) => priceData.productPrice.get(getPythSymbol(t)));
            if (prices.some((price) => price === undefined || price.price === undefined || price.status === PriceStatus.Halted || price.status === PriceStatus.Unknown)) {
                // eslint-disable-next-line no-console
                console.warn(`Failed to fetch Pyth Data, retrying ${i}/${maxRetries}`);
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, msBetweenRetries));
            }
            else {
                // We can assert price to be true here because we checked in the if statement above, typescript just isn't smart enough to understand this
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                return zipSameLength(prices, tokens).map(({ fst: price, snd: token }) => price!.price! / getDenomination(token));
            }
        }
        throw new Error('Failed to fetch/parse pyth data, this usually means the price is undefined or the status is not trading');
    }

    private static hasAssociatedAccount(connection: Connection, recipient: PublicKey, mintAcc: PublicKey): Promise<boolean> {
        return getAssociatedTokenAddress(mintAcc, recipient, true).then(async (associatedTokenAcc) => {
            try {
                const account = await getAccount(connection, associatedTokenAcc);
                return account !== undefined;
            }
            catch (error: unknown) {
                if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
                    return false;
                }
                throw error;
            }
        });
    }
}
