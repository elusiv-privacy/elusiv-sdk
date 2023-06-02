import { SendTxData } from './SendTxData.js';
import { TopupTxData } from './TopupTxData.js';

/**
 * Tx Data returned by building Elusiv tx. Meant to be passed forward to the send elusiv method.
 */
export type ElusivTxData = SendTxData | TopupTxData;
