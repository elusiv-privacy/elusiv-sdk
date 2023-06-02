import {
    ParamedWardenRequest,
    WardenMethod, WardenParams, WardenRequest,
} from '../serializedTypes/types.js';

export function buildWardenRequest<T extends WardenMethod>(method: T): WardenRequest<T>;
export function buildWardenRequest<T extends WardenMethod, V extends WardenParams>(method: T, params: V): ParamedWardenRequest<T, V>;
export function buildWardenRequest<T extends WardenMethod, V extends WardenParams>(method: T, params?: V): WardenRequest<T> | ParamedWardenRequest<T, V> {
    if (params === undefined) {
        return {
            jsonrpc: '2.0',
            id: '1',
            version: '1.0',
            method,
        };
    }

    return {
        jsonrpc: '2.0',
        id: '1',
        version: '1.0',
        method,
        params,
    };
}
