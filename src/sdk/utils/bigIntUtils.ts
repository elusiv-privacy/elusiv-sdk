export function divCeilBigInt(a: bigint, b: bigint): bigint {
    if (b === BigInt(0)) throw new Error('Division by zero');
    const res = a / b;
    if (res * b < a) return res + BigInt(1);
    return res;
}

export function sumBigInt(arr: bigint[]): bigint {
    let total = BigInt(0);

    for (const val of arr) {
        total += val;
    }

    return total;
}
