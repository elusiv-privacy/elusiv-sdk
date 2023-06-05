// eslint-disable-next-line import/no-extraneous-dependencies
import TOML from '@iarna/toml';
import fs from 'fs';
import { getTokenTypeFromStr } from '../src/public/tokenTypes/TokenTypeFuncs.js';

type RawTomlToken = {
    symbol: string,
    mint: string,
    mint_devnet: string,
    active: boolean,
    min: number,
    max: number,
    pyth_usd_price_mainnet: string,
    pyth_usd_price_devnet: string,
}

type RawSPLToken = RawTomlToken & { decimals: number }
type RawLamportsToken = RawTomlToken & { price_base_exp: number }

const HEADER = `import { PublicKey } from '@solana/web3.js';
import { getTokenTypeFromStr, TokenInfo } from './TokenTypeFuncs.js';
// Index of a token is how its tokentype is serialized e.g. lamports is at index 0, so it's serialied to 0
export const tokenInfos : TokenInfo[] =`;

function main() {
    const args = process.argv;
    // First two arguments are node and the script path
    if (args.length !== 4) throw new Error(`Expected 2 arguments (path to Token.toml, destination for typescript), got ${args.length - 2}`);
    const tomlData = fs.readFileSync(args[2], { encoding: 'utf-8' });
    const tokenTs = tomlToTypescript(tomlData);
    fs.writeFileSync(args[3], tokenTs);
}

// Converts a Token.toml file to a typescript file instantiating the same data
function tomlToTypescript(toml: string): string {
    const tokenToml = TOML.parse(toml);
    if (tokenToml.token === undefined) throw new Error('Invalid token file');

    return `${HEADER} [\n${(tokenToml.token as (RawSPLToken | RawLamportsToken)[]).map((t) => `    ${codeGenToken(t)}`).reduce((p, c) => p.concat(c))
        }];\n`;
}

// Convert a raw token type instance to Typescript code instantiating it
// as a TokenInfo object
function codeGenToken(token: RawSPLToken | RawLamportsToken): string {
    const decimals = getTokenTypeFromStr(token.symbol) === 'LAMPORTS' ? (token as RawLamportsToken).price_base_exp : (token as RawSPLToken).decimals;
    const denomination = BigInt(10) ** BigInt(decimals);
    return `{
        symbol: getTokenTypeFromStr('${token.symbol}'),
        mintMainnet: new PublicKey('${token.mint}'),
        mintDevnet: new PublicKey('${token.mint_devnet}'),
        active: ${token.active},
        decimals: ${decimals},
        min: ${token.min},
        max: ${token.max},
        denomination: ${denomination},
        pythUSDPriceMainnet: new PublicKey('${token.pyth_usd_price_mainnet}'),
        pythUSDPriceDevnet: new PublicKey('${token.pyth_usd_price_devnet}'),
    },\n`;
}

main();
