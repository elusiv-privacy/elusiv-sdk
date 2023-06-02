/**
 * Enum representing the current state of an elusiv transaction.
 * Important to keep in mind: These are NOT the same as the blockchain's transaction statuses and NOT the same as standard blockchain transactions, one elusiv transactions
 * almost always consists of more than one blockchain transaction under the hood.
 *
 * 'PENDING' => The transaction has been sent to the blockchain but has not been processed yet.
 * 'PROCESSED' => The transaction has been processed by the blockchain but has not been confirmed yet (i.e. the commitment that fully finalizes the transaction on-chain is not in yet).
 * 'CONFIRMED' => The transaction has been confirmed by the blockchain (i.e. the commitment that fully finalizes the transaction on-chain has been inserted in the tree)
 *
 * Or, in simpler terms:
 * 'PENDING' => Part of your elusiv transaction has been sent off and included in the blockchain, but the thing it's supposed to do hasn't happened yet.
 * 'PROCESSED' => The thing your elusiv transaction is supposed to do has happened (e.g. money has entered/left your account), but elusiv hasn't fully
 * 'cleaned up' yet, so you can't send another elusiv transaction yet.
 * 'CONFIRMED' => Everything is done, carry on :)
*/
export type TransactionStatus = 'PENDING' | 'PROCESSED' | 'CONFIRMED';
