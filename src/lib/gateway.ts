import { GATEWAY_URL } from "./config";
import type { Post } from "./types";

const isDev = process.env.NODE_ENV === "development";

export type Row = Post & Record<string, unknown>;

export async function fetchTableRows(
    tablePda: string,
    limit = 50,
    before?: string,
): Promise<{ rows: Row[]; nextCursor?: string }> {
    let url = `${GATEWAY_URL}/table/${tablePda}/rows?limit=${limit}`;
    if (before) url += `&before=${before}`;

    if (isDev) console.log("[gateway] rows →", tablePda.slice(0, 8), limit);
    const res = await fetch(url);
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

export async function fetchTableSlice(
    tablePda: string,
    sigs: string[],
): Promise<Row[]> {
    if (sigs.length === 0) return [];
    if (sigs.length > 50) throw new Error("fetchTableSlice: max 50 sigs");

    const url = `${GATEWAY_URL}/table/${tablePda}/slice?sigs=${sigs.join(",")}`;
    if (isDev) console.log("[gateway] slice →", tablePda.slice(0, 8), sigs.length, "sigs");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetchTableSlice failed: ${res.status}`);
    const data = await res.json();
    const rows = data.rows ?? [];
    if (isDev) console.log("[gateway] slice ←", rows.length);
    return rows;
}
