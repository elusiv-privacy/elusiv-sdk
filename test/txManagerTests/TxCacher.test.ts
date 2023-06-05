/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { PublicKey } from '@solana/web3.js';
import { expect } from 'chai';
import { ReprScalar } from 'elusiv-cryptojs';
import { ElusivTransaction } from '../../src/sdk/transactions/ElusivTransaction.js';
import { TxCacherInstance } from '../helpers/instances/TxCacherInstance.js';
import { TokenType } from '../../src/public/tokenTypes/TokenType.js';

describe('TxCacher tests', () => {
    let cacher: TxCacherInstance;
    const tokenTypes: (TokenType | undefined)[] = [
        undefined,
        'USDC',
        'LAMPORTS',
    ];
    const sampleTxs: ElusivTransaction[][] = [
        // All same token type
        [
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 1, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 2, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 3, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 4, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 5, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 6, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 7, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 8, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 9, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 10, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
        ],
        // Mixed
        [
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 11, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 12, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 13, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 14, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 15, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 16, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 17, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 18, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 19, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
        ],
    ];
    const sampleOverwriteTxs: ElusivTransaction[][] = [
        [
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 5, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 8, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 9, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
        ],
        [
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 11, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 12, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 13, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 17, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
        ],
    ];

    const expectedTxs: ElusivTransaction[][] = [
        // All same token type
        [
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 1, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 2, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 3, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 4, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 5, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 6, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 7, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 8, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 9, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 10, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
        ],
        // Mixed
        // Unavailable nonces are undefined
        [
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 11, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 12, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 13, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 14, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 15, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 16, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 17, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 18, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 19, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
        ],
    ];

    const expectedOverwrittenTxs: ElusivTransaction[][] = [
        // All same token type
        [
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 0, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 1, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 2, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 3, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 4, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 5, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 6, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 7, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 8, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 9, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 10, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
        ],
        // Mixed
        // Unavailable nonces are undefined
        [
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 11, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 12, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 13, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 14, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 15, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 16, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 17, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[2]!, nonce: 18, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
            {
                merkleStartIndex: -1, commitmentHash: new Uint8Array([0]) as ReprScalar, amount: BigInt(1), fee: BigInt(3), tokenType: tokenTypes[1]!, nonce: 19, txType: 'TOPUP', identifier: new PublicKey(new Uint8Array(32).fill(1)), warden: new PublicKey(new Uint8Array(32).fill(2)),
            },
        ],
    ];

    function getExpected(index: number, overWrite: boolean, tokenType?: TokenType, from = 0, to: number | undefined = undefined): ElusivTransaction[] {
        const expected = overWrite ? expectedOverwrittenTxs[index] : expectedTxs[index];
        const res = expected.filter((tx) => tx.nonce >= from && (to === undefined || tx.nonce < to));
        if (tokenType === undefined) {
            return res;
        }

        return res.filter((tx) => tx.tokenType === tokenType);
    }

    sampleTxs.forEach((txs, index) => {
        [
            false,
            true,
        ].forEach((overwrite) => {
            describe(`Txcacher tests with txs at index ${index} and overwriting ${overwrite}`, () => {
                beforeEach(() => {
                    cacher = new TxCacherInstance();
                    cacher.cacheWrapper(txs);

                    if (overwrite) {
                        cacher.cacheOverwriteWrapper(sampleOverwriteTxs[index]);
                    }
                });

                it('Should cache transactions overwriting correctly without specifying tokentype or range', () => {
                    const result = cacher.getCachedTxsWrapper();
                    const expected = getExpected(index, overwrite);

                    // Not available nonces are filled with undefined
                    expect(result).to.deep.equal(expected);
                });

                for (const t of tokenTypes) {
                    describe(`Tests with tokentype ${t}`, () => {
                        it(`Should cache transactions without overwriting correctly with specifying tokentype ${t}`, () => {
                            const expected = getExpected(index, overwrite, t);
                            const result = cacher.getCachedTxsWrapper(t);

                            expect(result).to.deep.equal(expected);
                        });

                        it(`Should cache transactions without overwriting correctly with specifying range with specifying tokentype ${t}`, () => {
                            const expected = getExpected(index, overwrite, t, 1, 5);
                            const result = cacher.getCachedTxsWrapper(t, 1, 5);

                            expect(result).to.deep.equal(expected);
                        });

                        it(`Should cache transactions without overwriting correctly with no lower range with specifying tokentype ${t}`, () => {
                            const expected = getExpected(index, overwrite, t, 0, 5);
                            const result = cacher.getCachedTxsWrapper(t, undefined, 5);

                            expect(result).to.deep.equal(expected);
                        });

                        it(`Should cache transactions without overwriting correctly with no upper range with specifying tokentype ${t}`, () => {
                            const expected = getExpected(index, overwrite, t, 1);
                            const result = cacher.getCachedTxsWrapper(t, 1);

                            expect(result).to.deep.equal(expected);
                        });

                        it(`Should cache transactions without overwriting correctly with empty range with specifying tokentype ${t}`, () => {
                            const expected: ElusivTransaction[] = [];
                            const result = cacher.getCachedTxsWrapper(t, 0, 0);

                            expect(result).to.deep.equal(expected);
                        });
                    });
                }
            });
        });
    });
});
