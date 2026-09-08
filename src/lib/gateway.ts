import { notifyGateway } from "./notify-gateway";
import { getGatewayUrl, getFallbacks } from "./config";
import type { Post, Reply } from "./types";

const isDev = process.env.NODE_ENV === "development";

export type Row = Post & Record<string, unknown>;

/** Fetch with fallback chain: primary → fallbacks in order. 304 counts as a
 *  valid response so callers can honor If-None-Match. Shared transport: the
 *  gateway serves every chain, so the EVM adapter reuses this for its own
 *  (dbRootId, tableName) paths. */
export async function gwFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const primary = getGatewayUrl();
    const tried = new Set<string>();
    const reqInit: RequestInit = { cache: "no-store", ...init };

    tried.add(primary);
    try {
        const res = await fetch(`${primary}${path}`, reqInit);
        if (res.ok || res.status === 404 || res.status === 304) return res;
    } catch {}

    for (const fallback of getFallbacks()) {
        if (tried.has(fallback)) continue;
        tried.add(fallback);
        try {
            const res = await fetch(`${fallback}${path}`, reqInit);
            if (res.ok || res.status === 404 || res.status === 304) return res;
        } catch {}
    }

    throw new Error("all gateways unreachable");
}

// Path-keyed ETag + last-body cache. Lets polling loops (thread-page BACKOFF)
// send If-None-Match; on 304 we return the cached body instead of refetching
// the entire row list.
const rowsEtagCache = new Map<string, { etag: string; data: { rows: Row[]; nextCursor?: string } }>();

async function fetchTableRows(
    tablePda: string,
    limit = 50,
    before?: string,
): Promise<{ rows: Row[]; nextCursor?: string }> {
    let path = `/table/${tablePda}/rows?limit=${limit}`;
    if (before) path += `&before=${before}`;

    const cached = rowsEtagCache.get(path);
    const headers = cached ? { "If-None-Match": cached.etag } : undefined;

    if (isDev) console.log("[gateway] rows →", tablePda.slice(0, 8), limit, cached ? "(etag)" : "");
    const res = await gwFetch(path, headers ? { headers } : {});

    if (res.status === 304 && cached) {
        if (isDev) console.log("[gateway] rows ← 304");
        return cached.data;
    }
    if (!res.ok) {
        if (res.status === 404) return { rows: [] };
        throw new Error(`fetchTableRows failed: ${res.status}`);
    }

    const data = await res.json();
    const result = { rows: (data.rows ?? []) as Row[], nextCursor: data.nextCursor ?? undefined };
    const etag = res.headers.get("etag");
    if (etag) rowsEtagCache.set(path, { etag, data: result });
    if (isDev) console.log("[gateway] rows ←", result.rows.length);
    return result;
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

/** Notify gateway about a new tx so it caches it and invalidates stale rows.
 * `signer` lets the gateway stamp __signer onto the injected row, so clients
 * that render the cache immediately have the fee payer's wallet available. */
export async function notifyPost(
    tablePda: string,
    txSignature: string,
    row?: Record<string, unknown>,
    signer?: string,
): Promise<void> {
    await notifyGateway(`${getGatewayUrl()}/table/${tablePda}/notify`, { txSignature, row, signer });
}

/** Fetch DbRoot data (tableSeeds, globalTableSeeds, creator, tableCreators, tableNames) from gateway. */
export async function fetchDbRoot(): Promise<{
    creator: string | null;
    tableSeeds: string[];
    globalTableSeeds: string[];
    tableCreators: string[];
    tableNames: Record<string, string>;
}> {
    const res = await gwFetch("/table/dbroot");
    if (!res.ok) throw new Error(`fetchDbRoot failed: ${res.status}`);
    return res.json();
}

/** Fetch on-chain Table metadata (name, columns, gate) from gateway. */
export async function fetchTableMeta(pda: string): Promise<{
    name: string;
    columns: string[];
    idCol: string;
    gate: { mint: string; amount: number; gateType: number } | null;
} | null> {
    const res = await gwFetch(`/table/${pda}/meta`);
    if (!res.ok) return null;
    return res.json();
}

/** Fetch a resolved thread (OP + replies) from the gateway compound endpoint.
 *  Replaces the old two-fetch + client-side isMoreLikelyOp dance — the gateway
 *  now picks the OP server-side. */
export async function fetchThread(
    feedPda: string,
    threadPda: string,
    replyLimit = 500,
): Promise<{ op: Post | null; replies: Reply[]; totalReplies: number }> {
    const res = await gwFetch(`/table/${feedPda}/thread/${threadPda}?replyLimit=${replyLimit}`);
    if (!res.ok) throw new Error(`fetchThread failed: ${res.status}`);
    const data = await res.json();
    return { op: data.op ?? null, replies: data.replies ?? [], totalReplies: data.totalReplies ?? 0 };
}

/** Ask the gateway whether `wallet` meets the gate config on `tablePda`.
 *  Replaces client-side getBalance + getAssociatedTokenAddress + getAccount. */
export async function checkGateFor(tablePda: string, wallet: string): Promise<{
    sol: number;
    gate: { mint: string; amount: number; gateType: number } | null;
    tokenBalance: number;
    meetsGate: boolean;
    minSol: number;
}> {
    const res = await gwFetch(`/gate/${tablePda}/check/${wallet}`);
    if (!res.ok) throw new Error(`checkGateFor failed: ${res.status}`);
    return res.json();
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
