import { AbstractType, Constructor, deserialize } from '@dao-xyz/borsh';
import { Cluster, Connection, PublicKey } from '@solana/web3.js';
import { serializeUint32LE } from '@elusiv/serialization';
import { COULD_NOT_FIND_ACCOUNT } from '../../constants.js';
import { getElusivProgramId } from '../../public/WardenInfo.js';
import { stringToUtf8ByteCodes } from '../utils/stringUtils.js';

// FOr all PDAs: ignore first 3 bytes
// Governor = governor (Program account = contains normal data)
// StorageAcc = storage (Multiaccount =
// after first 3 bytes comes array (length = 25) of PubKeys each 33 bytes
// first byte: is used (or can just check if fully 0))
// Each PublicKey points to a subaccount each has 83887 values
// (except nr 25, has a few less) --> 2^level - 1 + index,
// root is level 0, leaves are level 20 -> index is 256 bit value

export abstract class AccountReader {
    protected connection: Connection;

    public constructor(connection: Connection) {
        this.connection = connection;
    }

    protected async getProgramInfoFromSeeds<T>(classType: Constructor<T> | AbstractType<T>, cluster: Cluster, pdaSeeds: string[]): Promise<T> {
        const readingAccKey = AccountReader.generateElusivPDAFrom(pdaSeeds, getElusivProgramId(cluster))[0];
        return this.getProgramInfo(classType, readingAccKey);
    }

    // General function for reading data from program storage
    protected async getProgramInfo<T>(classType: Constructor<T> | AbstractType<T>, readingAccKey: PublicKey): Promise<T> {
        const accountInfo = await this.connection.getAccountInfo(readingAccKey);
        if (accountInfo === null) {
            throw new Error(COULD_NOT_FIND_ACCOUNT(readingAccKey.toBase58()));
        }
        return deserialize(accountInfo.data, classType);
    }

    public static generateElusivPDAFrom(
        seeds: string[],
        programId: PublicKey,
        offset?: number,
    ): [PublicKey, number] {
        const seedsFormatted = this.formatElusivPDASeed(seeds, offset);
        return PublicKey.findProgramAddressSync(seedsFormatted, programId);
    }

    private static formatElusivPDASeed(seeds: string[], offset?: number): Uint8Array[] {
        const seedsBytes = seeds.map((s) => stringToUtf8ByteCodes(s));
        const offsetBytes = offset === undefined ? [] : [serializeUint32LE(offset)];
        return seedsBytes.concat(offsetBytes);
    }
}
