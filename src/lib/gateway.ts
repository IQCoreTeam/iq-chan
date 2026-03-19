// Gateway API client for gateway.iqlabs.dev
// Uses /rows endpoint (backed by getSignaturesForAddress, real-time)
// instead of /index (backed by collectSignatures, has caching issues).

import { GATEWAY_URL } from "./config";
import type { Post } from "./types";

const isDev = process.env.NODE_ENV === "development";

export type Row = Post & Record<string, unknown>;

// ─── Primary: fetch rows directly via /rows endpoint ─────────────────────────

export async function fetchTableRows(
    tablePda: string,
    limit = 50,
    before?: string,
): Promise<{ rows: Row[]; nextCursor?: string }> {
    let url = `${GATEWAY_URL}/table/${tablePda}/rows?limit=${limit}`;
    if (before) url += `&before=${before}`;

    if (isDev) console.log("[iqchan:gateway] fetchTableRows →", url);
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) {
            if (isDev) console.log("[iqchan:gateway] fetchTableRows → 404, returning empty");
            return { rows: [] };
        }
        console.error("[iqchan:gateway] fetchTableRows → HTTP", res.status);
        throw new Error(`fetchTableRows failed: ${res.status}`);
    }
    const data = await res.json();
    const rows: Row[] = data.rows ?? [];
    const nextCursor: string | undefined = data.nextCursor ?? undefined;
    if (isDev) {
        console.log("[iqchan:gateway] fetchTableRows → got", rows.length, "rows", nextCursor ? `(nextCursor: ${nextCursor.slice(0, 20)}...)` : "(no more)");
        if (rows.length > 0) {
            console.log("[iqchan:gateway] first row:", JSON.stringify(rows[0]).slice(0, 120));
        }
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

// ─── Slice: fetch specific rows by signature ────────────────────────────────

export async function fetchTableSlice(
    tablePda: string,
    sigs: string[],
): Promise<Row[]> {
    if (sigs.length === 0) return [];
    if (sigs.length > 50) {
        throw new Error("fetchTableSlice: max 50 signatures per request");
    }
    const url = `${GATEWAY_URL}/table/${tablePda}/slice?sigs=${sigs.join(",")}`;
    if (isDev) console.log("[iqchan:gateway] fetchTableSlice →", tablePda, "| sigs:", sigs.length);
    const res = await fetch(url);
    if (!res.ok) {
        console.error("[iqchan:gateway] fetchTableSlice → HTTP", res.status);
        const body = await res.text().catch(() => "(no body)");
        console.error("[iqchan:gateway] fetchTableSlice response body:", body);
        throw new Error(`fetchTableSlice failed: ${res.status}`);
    }
    const data = await res.json();
    const rows = data.rows ?? [];
    if (isDev) console.log("[iqchan:gateway] fetchTableSlice → got", rows.length, "rows");
    return rows;
}
