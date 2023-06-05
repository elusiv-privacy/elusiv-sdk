import {
    getAccount, TokenAccountNotFoundError, TokenInvalidAccountOwnerError,
} from '@solana/spl-token';
import { Cluster, Connection, PublicKey } from '@solana/web3.js';
import { bytesToBigIntLE } from 'elusiv-serialization';
import { getAssociatedTokenAcc } from '../../public/tokenTypes/TokenTypeFuncs.js';
import { TokenType } from '../../public/tokenTypes/TokenType.js';

export function pubKeyToBigInt(pubKey: PublicKey): bigint {
    return bytesToBigIntLE(pubKey.toBytes());
}

export async function tokenAccExists(conn: Connection, pubKey: PublicKey): Promise<boolean> {
    try {
        const acc = await getAccount(conn, pubKey);
        return acc !== undefined;
    }
    catch (error: unknown) {
        // TokenAccountNotFoundError can be possible if the associated address has already received some lamports,
        // becoming a system account. Assuming program derived addressing is safe, this is the only case for the
        // TokenInvalidAccountOwnerError in this code path.
        if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
            return false;
        }
        throw error;
    }
}

// 0. Owner -> Owner
// 1. Normal Token Account --> Owner
// 2. Normal Solana Account --> Normal Solana Account
// 3. PDA that owns a token account --> PDA
// 4. Solana PDA --> Solana PDA
export async function getOwnerFromAcc(conn: Connection, cluster: Cluster, acc: PublicKey, tokenType: TokenType): Promise<PublicKey> {
    // Owner -> Owner
    // Normal Solana Account --> Normal Solana Account
    // Solana PDA --> Solana PDA
    if (tokenType === 'LAMPORTS' || PublicKey.isOnCurve(acc)) {
        return acc;
    }

    // Only dealing with PDAs from here
    try {
        // 1. Normal Token Account --> Owner
        const ta = await getAccount(conn, acc);
        return ta.owner;
    }
    catch (error: unknown) {
        if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
            // We can only come here if acc is a PDA owning an ATA
            const ata = getAssociatedTokenAcc(acc, tokenType, cluster, true);
            // 3. PDA that owns a token account --> PDA
            if (await tokenAccExists(conn, ata)) return acc;
        }

        // Token Account truly doesn't exist or some other error
        throw error;
    }
}
