import { Cluster, ConfirmedSignatureInfo, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { TokenType, TokenTypeArr } from './TokenType.js';
import { INVALID_TOKEN_TYPE } from '../../constants.js';
import { buildWardenRequest } from '../../sdk/transactions/txBuilding/wardenSerialization/utils.js';
import { getDefaultWarden, WardenInfo } from '../WardenInfo.js';
import { AirdropParams } from '../../sdk/transactions/txBuilding/serializedTypes/types.js';
import { TransactionSerialization } from '../../sdk/transactions/txBuilding/wardenSerialization/TransactionSerialization.js';
import { WardenCommunicator } from '../../sdk/txSending/WardenCommunication.js';
import { tokenInfos } from './Token.js';

/**
 * Type representing all relevant info for a specific token type
 */
export type TokenInfo = {
    symbol: TokenType,
    mintMainnet: PublicKey,
    mintDevnet: PublicKey,
    active: boolean,
    decimals: number,
    /**
     * Min amount we can send on Elusiv (given in the smallest unit of the token)
     */
    min: number,
    /**
     * Max amount we can send on Elusiv (given in the smallest unit of the token)
     */
    max: number,
    denomination: number,
    pythUSDPriceMainnet: PublicKey,
    pythUSDPriceDevnet: PublicKey,
}

/**
 * Gets the TokenInfo of a token type
 * @param tokenType The token type for which to get the denomination
 * @returns The Token Info of the token type
 */
export function getTokenInfo(tokenType: TokenType): TokenInfo {
    const tokenIndex = getNumberFromTokenType(tokenType);
    if (tokenIndex >= tokenInfos.length) throw new Error(INVALID_TOKEN_TYPE);
    return tokenInfos[getNumberFromTokenType(tokenType)];
}

/**
 * Gets all token types
 * @returns The list of all token types
 */
export function getTokenTypes(): TokenType[] {
    return tokenInfos.map((tokenInfo) => tokenInfo.symbol);
}

/**
 * Get the mint for a certain token type
 * @param tokenType The token type for which to get the mint account
 * @param cluster The cluster on which to get the mint (e.g. 'devnet')
 * @returns The PublicKey of the token's mint
 */
export function getMintAccount(tokenType: TokenType, cluster: Cluster): PublicKey {
    const tokenInfo = getTokenInfo(tokenType);
    switch (cluster) {
        case 'devnet': return tokenInfo.mintDevnet;
        case 'mainnet-beta': return tokenInfo.mintMainnet;
        default: throw new Error('Unknown Cluster');
    }
}

/**
 *
 * @param tokenType The token type to airdrop.
 * @param amount The amount to airdrop.
 * @param recipientTA The recipient of the airdrop's token account. Use the getMintAccount method to help you create this.
 * @param cluster The cluster on which to get the mint (mainnet is not valid)
 * @param wardenInfo Controls what warden is used. Filled in with default config.
 * @returns A signature indicating the airdrop transaction on success. Throws on failure.
 */
export async function airdropToken(tokenType: TokenType, amount: number, recipientTA: PublicKey, cluster: Cluster = 'devnet', wardenInfo: WardenInfo = getDefaultWarden(cluster)): Promise<ConfirmedSignatureInfo> {
    if (cluster !== 'devnet' && cluster !== 'testnet') throw new Error('Airdrop only available on devnet and testnet');
    const params: AirdropParams = [
        tokenType,
        amount,
        TransactionSerialization.serializeU256Bytes(recipientTA.toBytes()),
    ];
    const request = buildWardenRequest('airdrop', params);

    const communicator = new WardenCommunicator(wardenInfo);
    return communicator.postWardenSigRequest(request).then((res) => TransactionSerialization.deserializeSerializedSignature(res.result));
}

export function getDenomination(t: TokenType): number {
    return getTokenInfo(t).denomination;
}

export function getTokenType(t: number): TokenType {
    if (t >= TokenTypeArr.length) throw new Error(INVALID_TOKEN_TYPE);
    return TokenTypeArr[t];
}

/**
 * Returns the number associated with a token type as a 16 bit uint.
 * @param t The token type to get the number of
 * @returns The number associated with the token type
 */
export function getNumberFromTokenType(t: TokenType): number {
    const n = TokenTypeArr.indexOf(t);
    if (n !== -1) return n;
    throw new Error(INVALID_TOKEN_TYPE);
}

export function getTokenTypeFromStr(t: string): TokenType {
    if (getNumberFromTokenType(t as TokenType) !== -1) return t as TokenType;
    throw new Error(INVALID_TOKEN_TYPE);
}

export function getAssociatedTokenAcc(pk: PublicKey, t: TokenType, cluster: Cluster, allowOwnerOffCurve = false): PublicKey {
    if (t === 'LAMPORTS') return pk;
    const mint = getMintAccount(t, cluster);
    try {
        return getAssociatedTokenAddressSync(mint, pk, allowOwnerOffCurve);
    }
    catch (e) {
        if (e instanceof Error && e.name === 'TokenOwnerOffCurveError') {
            throw new Error('TokenOwnerOffCurveError: Please pass the owner account instead of the ATA account or set allowOwnerOffCurve to true if this was intended');
        }
        throw e;
    }
}

export function getPythPriceAccount(t: TokenType, cluster: Cluster): PublicKey {
    const tokenInfo = getTokenInfo(t);
    switch (cluster) {
        case 'devnet': return tokenInfo.pythUSDPriceDevnet;
        case 'mainnet-beta': return tokenInfo.pythUSDPriceMainnet;
        default: throw new Error('Unknown Cluster');
    }
}

export function getPythPriceAcc(tokenType: TokenType, cluster: Cluster): PublicKey {
    const tI = getTokenInfo(tokenType);
    if (cluster === 'mainnet-beta') return tI.pythUSDPriceMainnet;
    if (cluster === 'devnet') return tI.pythUSDPriceDevnet;
    throw new Error('Invalid cluster');
}
