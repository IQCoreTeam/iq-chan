// Gateway API client for gateway.iqlabs.dev
// Wraps /index and /slice endpoints for table data fetching.

const GATEWAY = "https://gateway.iqlabs.dev";

export type Row = Record<string, unknown> & { __txSignature?: string };

export async function fetchTableIndex(tablePda: string): Promise<string[]> {
    const res = await fetch(`${GATEWAY}/table/${tablePda}/index`);
    if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error(`fetchTableIndex failed: ${res.status}`);
    }
    const data = await res.json();
    return data.signatures ?? [];
}

export async function fetchTableSlice(
    tablePda: string,
    sigs: string[],
): Promise<Row[]> {
    if (sigs.length === 0) return [];
    if (sigs.length > 50) {
        throw new Error("fetchTableSlice: max 50 signatures per request");
    }
    const res = await fetch(
        `${GATEWAY}/table/${tablePda}/slice?sigs=${sigs.join(",")}`,
    );
    if (!res.ok) {
        throw new Error(`fetchTableSlice failed: ${res.status}`);
    }
    const data = await res.json();
    return data.rows ?? [];
}

export async function fetchTableSliceBatched(
    tablePda: string,
    sigs: string[],
): Promise<Row[]> {
    if (sigs.length === 0) return [];
    if (sigs.length <= 50) return fetchTableSlice(tablePda, sigs);

    const batches: string[][] = [];
    for (let i = 0; i < sigs.length; i += 50) {
        batches.push(sigs.slice(i, i + 50));
    }

    const results = await Promise.all(
        batches.map((batch) => fetchTableSlice(tablePda, batch)),
    );
    return results.flat();
}
