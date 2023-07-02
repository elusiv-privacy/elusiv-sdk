import { Commitment, IncompleteCommitment } from '@elusiv/cryptojs';

export class GeneralSet<T> {
    private map: Map<string, T>;

    private getId: (a: T) => string;

    constructor(getId: (a: T) => string) {
        this.map = new Map();
        this.getId = getId;
    }

    public add(item: T): void {
        this.map.set(this.getId(item), item);
    }

    public addArr(item: readonly T[]): void {
        item.forEach((i) => this.add(i));
    }

    public values(): IterableIterator<T> {
        return this.map.values();
    }

    public delete(item: T) {
        return this.map.delete(this.getId(item));
    }

    public toArray(): T[] {
        return Array.from(this.map.values());
    }

    public size(): number {
        return this.map.size;
    }
}

export function buildCommitmentSet(): GeneralSet<IncompleteCommitment | Commitment> {
    return new GeneralSet<IncompleteCommitment>((c) => c.getCommitmentHashBigInt().toString());
}

export function commitmentArrToSet(comms: (IncompleteCommitment | Commitment)[]): GeneralSet<IncompleteCommitment | Commitment> {
    const set = buildCommitmentSet();
    set.addArr(comms);
    return set;
}
