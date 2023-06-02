import { TxTypes } from './public/TxTypes.js';

/**
 * The message to sign to deterministically and portably generate the elusiv seed
 * used for instantiating the Elusiv instance.
 * Seed = ed25519.sign(encodeUTF8(SEED_MESSAGE), privateKey)
 */
export const SEED_MESSAGE = 'Sign this message to generate the Elusiv seed. This allows the application to decrypt your private assets so you can spend them privately.\n\nIMPORTANT: Only sign this message if you trust this application.';

// Data structure constants
export const MERKLE_TREE_HEIGHT = 20;
export const MAX_MT_COUNT = 2;
export const STORAGE_MT_VALUES_PER_ACCOUNT = 83887;
export const STORAGE_MT_CHUNK_COUNT = 25;
export const HISTORY_ARRAY_COUNT = 100;

// Transaction fetching constant
export const DEFAULT_FETCH_BATCH_SIZE = 10;

// Computation constants
export const SEND_ARITY = 4;
export const BASE_TX_PER_HASH = 2;
export const MAX_BATCHING_RATE = 4;
export const ADD_MIXED_COST = 22_000;
export const ADD_COST = 30_000;
export const MAX_COMPUTE_UNIT_LIMIT = 1_400_000;
export const COMPUTE_UNIT_PADDING = 70_000;
export const MAX_CUS = MAX_COMPUTE_UNIT_LIMIT - COMPUTE_UNIT_PADDING;
export const MIN_TOPUP_BALANCE = 0;

// Program info
export const BASE_COMMITMENT_BUFFER_ACC_SEED = 'BaseCommitmentBuffer';
export const BASE_COMMITMENT_HASH_ACC_SEED = 'BaseCommitmentHashing';
export const POOL_ACC_SEED = 'Pool';
export const GOVERNOR_ACC_SEED = 'Governor';
export const STORAGE_ACC_SEED = 'Storage';
export const FEE_ACC_SEED = 'Fee';
export const FEE_COLLECTOR_SEED = 'FeeCollector';
export const METADATA_ACC_SEED = 'Metadata';
export const SEND_PUBLIC_INPUT_IX_CODE = 0;
export const STORE_BASE_COMM_IX_CODE = 0;
export const COMPUTE_COMM_HASH_IX_CODE = 1;
export const INIT_VERIFICATION_IX_CODE = 7;
export const FINALIZE_VERIFICATION_IX_CODE = 11;

// Misc. Info
export const HKDF_DIGEST_NAME = 'sha256';
export const APA_KEY = 'agsWhfJ5PPGjmzMieWY8BR5o1XRVszUBQ5uFz4CtDiJ';
export const MAX_UINT32 = 4294967295;
// Our tree currently has height 20
export const MAX_UINT20 = 1048575;
export const MAX_UINT64 = BigInt('18446744073709551615');
export const VIEWING_KEY_VERSION = 1;

// Error messages

// Size errors
export const INVALID_SIZE = (inputName: string, size: number, expectedSize: number) => `Input: ${inputName} has size ${size}, expected size ${expectedSize}`;
export const TOO_LARGE_SIZE = (inputName: string, size: number, expectedSize: number) => `Input: ${inputName} has size ${size}, maximum size is ${expectedSize}`;
export const TOO_SMALL_SIZE = (inputName: string, size: number, expectedSize: number) => `Input: ${inputName} has size ${size}, minimum size is ${expectedSize}`;
export const TOO_LARGE_FOR_NUMBER = 'Value too large for number type';

// Timeout errors
export const TIMEOUT_ERR = (operationName: string) => `Operation ${operationName} timed out`;

// Invalid format errors
export const INVALID_ACC_FORMAT = 'Invalid Account Format Schema';
export const INVALID_TX_DATA = (txType: TxTypes) => `Invalid data for transaction type: ${txType}`;
export const FAILED_TO_PARSE = (paramName: string) => `Failed to parse ${paramName}`;

// Invalid param type errors
export const INVALID_TX_TYPE = 'Invalid transaction type';
export const INVALID_TOKEN_TYPE = 'Invalid token type';
export const INVALID_CACHE_VALUE = 'Trying to cache invalid value';
export const INVALID_SCALAR_TYPE = 'Invalid Scalar type';
export const INVALID_CONVERSION_RATE = 'Invalid converstion rate';

// Misc errors
export const COULD_NOT_FIND_ACCOUNT = (address: string) => `Could not find account with address ${address}`;
export const COULD_NOT_FIND_COMMITMENT = 'Could not find commitment in merkle tree';
export const INVALID_READ = 'Attempted to read invalid account';
export const INVALID_ACCESS = (val: string) => `Attempted to access invalid value: ${val}`;
export const INVALID_WARDEN_RESPONSE = 'Invalid warden response';
export const METHOD_NOT_IMPLEMENTED = 'Method not implemented';
export const INDEX_OUT_OF_BOUNDS = 'Index out of bounds';
export const NOT_ENOUGH_PRECISION_FOR_NUMBER = 'Number type does not have enough precision to represent';
export const FAILED_TX_SEND = (txType: TxTypes) => `Failed to send transaction of type: ${txType}`;
export const COULD_NOT_FETCH_DATA = (dataName: string) => `Could not fetch data: ${dataName}`;
export const MERGE_NEEDED = 'Merge needed';
