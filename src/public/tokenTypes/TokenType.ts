/**
 * Array representing all currently supported tokens.
 */
export const TokenTypeArr = ['LAMPORTS', 'USDC', 'USDT', 'mSOL', 'BONK', 'SAMO'] as const;

/**
 * Enum representing the currently supported tokens to be sent via Elusiv, derived from {@link TokenTypeArr}.
 */
export type TokenType = typeof TokenTypeArr[number];
