export const TokenTypeArr = ['LAMPORTS', 'USDC', 'USDT', 'mSOL', 'BONK', 'SAMO'] as const;
/**
 * Enum representing the currently supported tokens to be sent via Elusiv
 */
export type TokenType = typeof TokenTypeArr[number];
