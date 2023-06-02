export class InvalidStoreError extends Error {
    constructor(msg: string) {
        super(msg);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, InvalidStoreError.prototype);
    }
}
