import { MessageHeader } from '@solana/web3.js';
import { SendPublicInputsSerializedJSON } from './borshTypes/SendPublicInputsBorsh';

export type DataSerialized<T> = [[number], ...T[]];
export type CommitmentMetadataSerialized = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
];
export type U256Serialized = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
];
export type SignatureSerialized = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
];

export type TransactionSerialized = [{
    signatures: DataSerialized<number[]>;
    message: TxMessageSerialized;
}];

export type TxMessageSerialized = {
    header: TxHeaderSerialized;
    accountKeys: number[][];
    recentBlockhash: number[];
    instructions: DataSerialized<TxInstructionSerialized>;
};
export type TxHeaderSerialized = MessageHeader;
export type TxInstructionSerialized = {
    programIdIndex: number;
    accounts: DataSerialized<number>;
    data: DataSerialized<number>;
};

export type RawG1A = {
    x: U256Serialized;
    y: U256Serialized;
    infinity: boolean;
};
export type RawG2A = {
    x: [U256Serialized, U256Serialized];
    y: [U256Serialized, U256Serialized];
    infinity: boolean;
};
export type RawProof = {
    a: RawG1A;
    b: RawG2A;
    c: RawG1A;
};

export type SendProofSerialized = [
    // Groth16 proof
    RawProof,
    // Public Inputs
    SendPublicInputsSerializedJSON,
    // Recipient
    U256Serialized,
    // Identifier
    U256Serialized,
    // IV
    U256Serialized,
    // Encrypted Owner
    U256Serialized,
    // Solana Pay Id
    U256Serialized,
    // Memo
    string | null,
];

export type AirdropParams = [
    string,
    number,
    U256Serialized,
]

/** Start Warden method definitions */

export type GetCircuitCall = 'get_circuit'

export type GetZkeyCall = 'get_zkey'

export type AirdropCall = 'airdrop'

export type TxCall = 'elusiv_store' | 'elusiv_send';

export type WardenMethod = GetCircuitCall | GetZkeyCall | AirdropCall | TxCall;

/** Start Warden param definitions */

export type WardenParams = SendProofSerialized | TransactionSerialized | AirdropParams;

export type WardenRequest<T extends WardenMethod> = {
    jsonrpc: string;
    id: string;
    version: string;
    method: T;
}

export type ParamedWardenRequest<T extends WardenMethod, V extends WardenParams> = WardenRequest<T> & { params: V }

export type SendJSON = ParamedWardenRequest<'elusiv_send', SendProofSerialized>;

export type StoreJSON = ParamedWardenRequest<'elusiv_store', TransactionSerialized>;

export type AirdropJSON = ParamedWardenRequest<AirdropCall, AirdropParams>;

export type WardenMessage = SendJSON | StoreJSON | AirdropJSON | WardenRequest<WardenMethod>;

export type WardenError = {
    code: number;
    message: string;
}

export type JSONRPCResponse = {
    jsonrpc: string;
    id: string;
}

export type WardenResultResponse<T> = JSONRPCResponse & {
    result: T;
}

export type WardenSignatureResponse = WardenResultResponse<SignatureSerialized>;

export type WardenRawDataResponse = WardenResultResponse<number[]>;

export type WardenErrorResponse = JSONRPCResponse & {
    error: WardenError;
}

// Parsed transfer instructions typescript types
export type ParsedLamportTransfer = {
    info: {
        destination: string,
        source: string,
        lamports: number,
    },
    type: 'transfer'
}

export type ParsedSPLTransfer = {
    info: {
        amount: string,
        destination: string,
        multisigAuthority: string,
        signers: string[],
        source: string,
    }
    type: 'transfer',
}
