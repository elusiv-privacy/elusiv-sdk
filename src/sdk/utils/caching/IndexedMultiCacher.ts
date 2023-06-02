// Each value is identified by a numerical, ascending index. Difference to IndexedCacher is that multiple values can have the same index.
export class IndexedMultiCacher<T> {
    private cached: (T[] | undefined)[];

    private getIndex: (t: T) => number;

    private equal: (t: T, u: T) => boolean;

    constructor(
        getIndex: (t: T) => number,
        equal: (t: T, u: T) => boolean,
    ) {
        this.getIndex = getIndex;
        this.equal = equal;
        this.cached = [];
    }

    public cache(vals: T[]): void {
        return this.cacheInner(vals, false);
    }

    public cacheOverwrite(vals: T[]): void {
        return this.cacheInner(vals, true);
    }

    public isCached(val: T): boolean {
        const cacheSpot = this.cached[this.getIndex(val)];
        return cacheSpot !== undefined && cacheSpot.find((t) => this.equal(t, val)) !== undefined;
    }

    public readAtIndex(index: number): T[] | undefined {
        return this.cached[index];
    }

    private cacheInner(vals: T[], overwritable: boolean): void {
        for (const val of vals) {
            const index = this.getIndex(val);
            if (this.cached[index] === undefined || overwritable) this.cached[index] = [];
            // Add to cache if it's not cached yet. ? operator needed to make tsc shut up.
            if (this.cached[index]?.find((t) => this.equal(t, val)) === undefined) this.cached[index]?.push(val);
        }
    }

    public getCachedValues(): (T[] | undefined)[] {
        return this.cached;
    }
}
