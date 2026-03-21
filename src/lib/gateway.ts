import { getGatewayUrl, GATEWAY_FALLBACK } from "./config";
import type { Post } from "./types";

const isDev = process.env.NODE_ENV === "development";

export type Row = Post & Record<string, unknown>;

/** Fetch with fallback - tries primary gateway, falls back to gateway.iqlabs.dev on failure. */
async function gwFetch(path: string): Promise<Response> {
    const primary = getGatewayUrl();
    try {
        const res = await fetch(`${primary}${path}`, { cache: "no-store" });
        if (res.ok || res.status === 404) return res;
    } catch {}
    if (primary !== GATEWAY_FALLBACK) {
        return fetch(`${GATEWAY_FALLBACK}${path}`, { cache: "no-store" });
    }
    throw new Error("gateway unreachable");
}

async function fetchTableRows(
    tablePda: string,
    limit = 50,
    before?: string,
): Promise<{ rows: Row[]; nextCursor?: string }> {
    let path = `/table/${tablePda}/rows?limit=${limit}`;
    if (before) path += `&before=${before}`;

    if (isDev) console.log("[gateway] rows →", tablePda.slice(0, 8), limit);
    const res = await gwFetch(path);
    if (!res.ok) {
        if (res.status === 404) return { rows: [] };
        throw new Error(`fetchTableRows failed: ${res.status}`);
    }
    const data = await res.json();
    const rows: Row[] = data.rows ?? [];
    if (isDev) console.log("[gateway] rows ←", rows.length);
    return { rows, nextCursor: data.nextCursor ?? undefined };
}

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

/** Notify gateway about a new tx so it caches it and invalidates stale rows. */
export async function notifyPost(tablePda: string, txSignature: string, row?: Record<string, unknown>): Promise<void> {
    try {
        await fetch(`${getGatewayUrl()}/table/${tablePda}/notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txSignature, row }),
        });
    } catch {
        // Non-critical — gateway will pick it up on next poll
    }
}

export async function fetchTableSlice(
    tablePda: string,
    sigs: string[],
): Promise<Row[]> {
    if (sigs.length === 0) return [];
    if (sigs.length > 50) throw new Error("fetchTableSlice: max 50 sigs");

    const path = `/table/${tablePda}/slice?sigs=${sigs.join(",")}`;
    if (isDev) console.log("[gateway] slice →", tablePda.slice(0, 8), sigs.length, "sigs");
    const res = await gwFetch(path);
    if (!res.ok) throw new Error(`fetchTableSlice failed: ${res.status}`);
    const data = await res.json();
    const rows = data.rows ?? [];
    if (isDev) console.log("[gateway] slice ←", rows.length);
    return rows;
}
