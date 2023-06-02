import { PublicKey } from '@solana/web3.js';
import { getTokenTypeFromStr, TokenInfo } from './TokenType.js';
// Index of a token is how its tokentype is serialized e.g. lamports is at index 0, so it's serialied to 0
export const tokenInfos : TokenInfo[] = [
    {
        symbol: getTokenTypeFromStr('LAMPORTS'),
        mintMainnet: new PublicKey('11111111111111111111111111111111'),
        mintDevnet: new PublicKey('11111111111111111111111111111111'),
        active: true,
        decimals: 9,
        min: 1000,
        max: 360_000_000_000,
        denomination: 1000000000,
        pythUSDPriceMainnet: new PublicKey('H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG'),
        pythUSDPriceDevnet: new PublicKey('J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix'),
    },
    {
        symbol: getTokenTypeFromStr('USDC'),
        mintMainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
        mintDevnet: new PublicKey('F3hocsFVHrdTBG2yEHwnJHAJo4rZfnSwPg8d5nVMNKYE'),
        active: true,
        decimals: 6,
        min: 1000,
        max: 8_000_000_000,
        denomination: 1000000,
        pythUSDPriceMainnet: new PublicKey('Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD'),
        pythUSDPriceDevnet: new PublicKey('5SSkXsEKQepHHAewytPVwdej4epN1nxgLVM84L4KXgy7'),
    },
    {
        symbol: getTokenTypeFromStr('USDT'),
        mintMainnet: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
        mintDevnet: new PublicKey('AyPeYKj4oHBGdhLjMwbj9m8tEdS1gr9tyqkpT3oDEZUV'),
        active: true,
        decimals: 6,
        min: 1000,
        max: 8_000_000_000,
        denomination: 1000000,
        pythUSDPriceMainnet: new PublicKey('3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL'),
        pythUSDPriceDevnet: new PublicKey('38xoQ4oeJCBrcVvca2cGk7iV1dAfrmTR1kmhSCJQ8Jto'),
    },
];
