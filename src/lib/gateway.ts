// Gateway API client for gateway.iqlabs.dev
// Uses /rows endpoint (backed by getSignaturesForAddress, real-time)
// instead of /index (backed by collectSignatures, has caching issues).

const GATEWAY = "https://gateway.iqlabs.dev";

export type Row = Record<string, unknown> & { __txSignature?: string };

// ─── Primary: fetch rows directly via /rows endpoint ─────────────────────────

export async function fetchTableRows(
    tablePda: string,
    limit = 50,
    before?: string,
): Promise<{ rows: Row[]; nextCursor?: string }> {
    let url = `${GATEWAY}/table/${tablePda}/rows?limit=${limit}`;
    if (before) url += `&before=${before}`;

    console.log("[iqchan:gateway] fetchTableRows →", url);
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) {
            console.log("[iqchan:gateway] fetchTableRows → 404, returning empty");
            return { rows: [] };
        }
        console.error("[iqchan:gateway] fetchTableRows → HTTP", res.status);
        throw new Error(`fetchTableRows failed: ${res.status}`);
    }
    const data = await res.json();
    const rows: Row[] = data.rows ?? [];
    const nextCursor: string | undefined = data.nextCursor ?? undefined;
    console.log("[iqchan:gateway] fetchTableRows → got", rows.length, "rows", nextCursor ? `(nextCursor: ${nextCursor.slice(0, 20)}...)` : "(no more)");
    if (rows.length > 0) {
        console.log("[iqchan:gateway] first row:", JSON.stringify(rows[0]).slice(0, 120));
    }
    return { rows, nextCursor };
}

// Fetch all rows by paginating through /rows endpoint
export async function fetchAllTableRows(
    tablePda: string,
    maxRows = 200,
): Promise<Row[]> {
    const allRows: Row[] = [];
    let cursor: string | undefined;

    while (allRows.length < maxRows) {
        const limit = Math.min(50, maxRows - allRows.length);
        const { rows, nextCursor } = await fetchTableRows(tablePda, limit, cursor);
        allRows.push(...rows);
        if (!nextCursor || rows.length === 0) break;
        cursor = nextCursor;
    }

    return allRows;
}

// ─── Legacy: /index + /slice (kept for paginated-replies) ────────────────────

export async function fetchTableIndex(tablePda: string): Promise<string[]> {
    const url = `${GATEWAY}/table/${tablePda}/index`;
    console.log("[iqchan:gateway] fetchTableIndex →", url);
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) {
            console.log("[iqchan:gateway] fetchTableIndex → 404 (table not found), returning []");
            return [];
        }
        console.error("[iqchan:gateway] fetchTableIndex → HTTP", res.status);
        throw new Error(`fetchTableIndex failed: ${res.status}`);
    }
    const data = await res.json();
    const sigs = data.signatures ?? [];
    console.log("[iqchan:gateway] fetchTableIndex → found", sigs.length, "signatures");
    return sigs;
}

export async function fetchTableSlice(
    tablePda: string,
    sigs: string[],
): Promise<Row[]> {
    if (sigs.length === 0) return [];
    if (sigs.length > 50) {
        throw new Error("fetchTableSlice: max 50 signatures per request");
    }
    const url = `${GATEWAY}/table/${tablePda}/slice?sigs=${sigs.join(",")}`;
    console.log("[iqchan:gateway] fetchTableSlice →", tablePda, "| sigs:", sigs.length);
    const res = await fetch(url);
    if (!res.ok) {
        console.error("[iqchan:gateway] fetchTableSlice → HTTP", res.status);
        const body = await res.text().catch(() => "(no body)");
        console.error("[iqchan:gateway] fetchTableSlice response body:", body);
        throw new Error(`fetchTableSlice failed: ${res.status}`);
    }
    const data = await res.json();
    const rows = data.rows ?? [];
    console.log("[iqchan:gateway] fetchTableSlice → got", rows.length, "rows");
    return rows;
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
