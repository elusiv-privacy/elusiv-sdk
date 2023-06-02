/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    CompiledInnerInstruction,
    ConfirmedSignatureInfo, Finality, GetVersionedTransactionConfig, MessageCompiledInstruction, ParsedInnerInstruction, ParsedMessage, ParsedMessageAccount, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey, SignaturesForAddressOptions, Transaction, TransactionError, TransactionResponse, Version, VersionedTransactionResponse,
} from '@solana/web3.js';
import { Pair } from '../../../src/sdk/utils/Pair.js';
import { bytesToBs58 } from '../../../src/sdk/utils/base58Utils.js';
import { pubKeyToParsedMessageAcc } from '../../utils.js';

// Simulates a connection object for testing that provides access to a given tx history
export class TxHistoryConnectionDriver {
    private addressToTx: Map<string, Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo>[]>;

    public constructor() {
        this.addressToTx = new Map<string, Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo>[]>();
    }

    public addNewTxs(sender: PublicKey, txs: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo>[]): void {
        const prev = this.addressToTx.get(sender.toBase58());

        this.addressToTx.set(sender.toBase58(), txs.concat(prev === undefined ? [] : prev));
    }

    public getConfirmedSignaturesForAddress2(address: PublicKey, options?: SignaturesForAddressOptions, commitment?: Finality): Promise<ConfirmedSignatureInfo[]> {
        return this.getSignaturesForAddress(address, options, commitment);
    }

    public getSignaturesForAddress(address: PublicKey, options?: SignaturesForAddressOptions, commitment?: Finality): Promise<ConfirmedSignatureInfo[]> {
        return new Promise((resolve, reject) => {
            if (this.addressToTx.get(address.toBase58()) === undefined) {
                resolve([]);
            }
            let optionsInner = options;
            if (optionsInner === undefined) optionsInner = {};
            let txs = this.addressToTx.get(address.toBase58());

            if (txs === undefined) txs = [];
            const start = optionsInner.before ? TxHistoryConnectionDriver.findSigIndex(optionsInner.before, txs) + 1 : 0;
            let end = optionsInner.until ? TxHistoryConnectionDriver.findSigIndex(optionsInner.until, txs) : txs.length;

            if (start === -1 || end === -1) {
                resolve([]);
            }

            end = optionsInner.limit ? Math.min(end, start + optionsInner.limit) : end;
            const res = txs.slice(start, end).map((tx) => tx.snd);
            resolve(res);
        });
    }

    // Very inefficient, but ok since it's just for driver
    public getParsedTransactions(signatures: string[], rawConfig?: GetVersionedTransactionConfig): Promise<(ParsedTransactionWithMeta | null)[]> {
        const res: (ParsedTransactionWithMeta | null)[] = [];
        // Iterate over all sigs
        for (let i = 0; i < signatures.length; i++) {
            res[i] = this.getTransaction(signatures[i]);
        }

        return Promise.resolve(res);
    }

    public getTransaction(signature: string): ParsedTransactionWithMeta | null {
        // Iterate over all address-associated txs
        for (const txs of this.addressToTx.values()) {
            // Iterate over one batch of txs
            for (const tx of txs) {
                if (tx.snd.signature === signature) {
                    return tx.fst;
                }
            }
        }
        return null;
    }

    public reset(): void {
        this.addressToTx = new Map();
    }

    public static txToParsedTx(tx: Transaction, cpis?: ParsedInnerInstruction[], err: TransactionError | null = null): ParsedTransactionWithMeta {
        return {
            slot: -1,
            transaction: {
                signatures: [],
                message: txToParsedMessage(tx),
            },
            meta: {
                fee: -1,
                err,
                innerInstructions: cpis,
                preBalances: [],
                postBalances: [],
            },
        };
    }

    public static txToTxResponse(tx: Transaction, cpis?: CompiledInnerInstruction[], err: TransactionError | null = null): TransactionResponse {
        return {
            slot: -1,
            transaction: {
                signatures: [],
                message: tx.compileMessage(),
            },
            meta: {
                err,
                fee: -1,
                preBalances: [],
                postBalances: [],
                innerInstructions: cpis,
            },
        };
    }

    private static findSigIndex(sig: string, txs: Pair<ParsedTransactionWithMeta, ConfirmedSignatureInfo>[]): number {
        for (let i = 0; i < txs.length; i++) {
            if (txs[i].snd.signature === sig) return i;
        }

        return -1;
    }
}

function txToParsedMessage(tx: Transaction): ParsedMessage {
    const compiledMessage = tx.compileMessage();
    return messageToParseMessage(compiledMessage.compiledInstructions, compiledMessage.accountKeys);
}

function messageToParseMessage(instructions: MessageCompiledInstruction[], keys: PublicKey[]): ParsedMessage {
    return {
        accountKeys: keys.map(pubKeyToParsedMessageAcc),
        instructions: instructions.map((ix) => msgCompiledIxToPartiallyDecodedInstruction(ix, keys)),
        recentBlockhash: 'blockhash',
    };
}

function msgCompiledIxToPartiallyDecodedInstruction(ix: MessageCompiledInstruction, keys: PublicKey[]): PartiallyDecodedInstruction {
    return {
        programId: keys[ix.programIdIndex],
        accounts: ix.accountKeyIndexes.map((i) => keys[i]),
        data: bytesToBs58(ix.data),
    };
}
