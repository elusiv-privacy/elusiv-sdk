import {
    Connection,
    LAMPORTS_PER_SOL, Message, PublicKey, SystemProgram, VersionedTransactionResponse,
} from '@solana/web3.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { uint8ArrayToHex } from '@elusiv/serialization';
import { ReprScalar } from '@elusiv/cryptojs';
import { COMMITMENT_METADATA_LENGTH } from 'elusiv-circuits';
import { SeedWrapper } from '../../src/sdk/clientCrypto/SeedWrapper';
import { generateViewingKey, getSendTxWithViewingKey } from '../../src/compliance/ViewingKey';
import { TxHistoryConnectionDriver } from '../helpers/drivers/TxHistoryConnectionDriver';
import { bytesToBs58 } from '../../src/sdk/utils/base58Utils';
import { VIEWING_KEY_VERSION } from '../../src/constants';
import { InitVerificationInstruction } from '../../src/sdk/transactions/instructions/InitVerificationInstruction';
import { FinalizeVerificationInstruction } from '../../src/sdk/transactions/instructions/FinalizeVerificationInstruction';
import { getElusivProgramId } from '../../src/public/WardenInfo';
import { RVKWrapper } from '../../src/sdk/clientCrypto/RVKWrapper';
import { messageToParsedTx } from '../utils';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Seeded Salted encryption/decryption tests', () => {
    let owner: PublicKey;
    const seed = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let rvk: RVKWrapper;
    const nonce = 42;
    let conn: TxHistoryConnectionDriver;
    const sigs = ['abcdef', 'hijklmn'];
    let idKey: PublicKey;

    before(async () => {
        const seedWrapper = new SeedWrapper(seed);
        rvk = seedWrapper.getRootViewingKeyWrapper();
        owner = new PublicKey(new Uint8Array(32).fill(42));
        const encryptedOwner = await rvk.encryptSeededSaltedAES256(owner.toBytes(), nonce);
        const amount = BigInt(10 * LAMPORTS_PER_SOL);
        const fee = BigInt(1000);

        const initVerificationIx = new InitVerificationInstruction(
            10,
            11,
            [12, 112],
            1,
            [new Uint8Array(32).fill(13) as ReprScalar],
            [new Uint8Array(32).fill(14) as ReprScalar],
            new Uint8Array(32).fill(15) as ReprScalar,
            { tokenType: 'LAMPORTS', assocCommIndex: 3 },
            new Uint8Array(COMMITMENT_METADATA_LENGTH).fill(15),
            16,
            amount,
            fee,
            { amount: BigInt(0), collector: SystemProgram.programId },
            false,
            new Uint8Array(32).fill(18) as ReprScalar,
            false,
            false,
        );
        const finalizeIx = new FinalizeVerificationInstruction(
            amount + fee,
            'LAMPORTS',
            21,
            encryptedOwner,
            21,
            new PublicKey(new Uint8Array(32).fill(22)),
        );

        idKey = rvk.getIdentifierKey(nonce);
        const initResponse = ixToTxResponse(initVerificationIx.compile(), idKey);
        const finalizeResponse = ixToTxResponse(finalizeIx.compile(false, 20), idKey);

        conn = new TxHistoryConnectionDriver();
        conn.addNewTxs(
            idKey,
            [{
                fst: messageToParsedTx(finalizeResponse.transaction.message as Message),
                snd: {
                    signature: sigs[0],
                    slot: -1,
                    err: null,
                    memo: null,
                },
            },
            {
                fst: messageToParsedTx(initResponse.transaction.message as Message),
                snd: {
                    signature: sigs[1],
                    slot: -1,
                    err: null,
                    memo: null,
                },
            }],
        );
    });

    it('Correctly computes and decrypts with viewing key', async () => {
        const decryptionKeyHex = uint8ArrayToHex(generateViewingKey(rvk, nonce));
        const idKeyHex = uint8ArrayToHex(idKey.toBytes());
        const parsedSend = await getSendTxWithViewingKey(conn as unknown as Connection, 'devnet', { version: uint8ArrayToHex(new Uint8Array(VIEWING_KEY_VERSION)), idKey: idKeyHex, decryptionKey: decryptionKeyHex });
        expect(parsedSend.owner.equals(owner)).to.be.true;
    });

    it('Throws error if sig is non-existent', async () => {
        const decryptionKeyHex = uint8ArrayToHex(generateViewingKey(rvk, nonce));
        await expect(getSendTxWithViewingKey(conn as unknown as Connection, 'devnet', { version: uint8ArrayToHex(new Uint8Array(VIEWING_KEY_VERSION)), idKey: '0x0', decryptionKey: decryptionKeyHex })).to.be.rejectedWith(Error);
    });

    it('Throws error for wrong version', async () => {
        const decryptionKeyHex = uint8ArrayToHex(generateViewingKey(rvk, nonce));
        const idKeyHex = uint8ArrayToHex(idKey.toBytes());
        await expect(getSendTxWithViewingKey(conn as unknown as Connection, 'devnet', { version: uint8ArrayToHex(new Uint8Array(VIEWING_KEY_VERSION + 1)), idKey: idKeyHex, decryptionKey: decryptionKeyHex })).to.be.rejectedWith(Error);
    });

    it('Decrypts to incorrect owner if viewing key is incorrect', async () => {
        const decryptionKeyHex = uint8ArrayToHex(generateViewingKey(rvk, nonce + 1));
        const idKeyHex = uint8ArrayToHex(idKey.toBytes());
        const parsedSend = await getSendTxWithViewingKey(conn as unknown as Connection, 'devnet', { version: uint8ArrayToHex(new Uint8Array(VIEWING_KEY_VERSION)), idKey: idKeyHex, decryptionKey: decryptionKeyHex });
        expect(parsedSend.owner.equals(owner)).to.be.false;
    });
});

function ixToTxResponse(serializedIx: Uint8Array, idKey: PublicKey): VersionedTransactionResponse {
    const message: Message = new Message(
        {
            header: {
                numRequiredSignatures: -1,
                numReadonlySignedAccounts: -1,
                numReadonlyUnsignedAccounts: -1,
            },
            accountKeys: [getElusivProgramId('devnet'), idKey],
            recentBlockhash: '',
            instructions: [{
                programIdIndex: 0,
                accounts: [1],
                data: bytesToBs58(serializedIx),
            }],
        },
    );
    return {
        slot: -1,
        transaction: {
            message,
            signatures: [],
        },
        meta: null,
    };
}
