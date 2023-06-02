// Wrap fetch to allow for the case that we switch https library later or so
export async function fetchWrapper(
    input: RequestInfo | URL,
    init: RequestInit = {},
): Promise<Response> {
    return fetch(input, init);
}
