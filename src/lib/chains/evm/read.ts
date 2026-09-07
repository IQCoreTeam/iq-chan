// EVM read adapter. Like the Solana one, all reads go through the IQ Gateway
// over HTTP — no chain SDK here (writes are where ethereum-sdk comes in). Two
// EVM-specific concerns it owns so the rest of the app stays chain-agnostic:
//
//  1. Addressing. EVM tables are keyed by (dbRootId, tableName) strings, not a
//     PDA, so paths are /table/{dbRootId}/{tableName}/... and every request
//     carries ?network=<param> (Solana is the gateway default and takes none).
//  2. Row identity. EVM rows come back stamped __txHash; the app keys posts on
//     __txSignature, so every row is normalized to set __txSignature = __txHash.
//
// Interim note: listThreads sorts by latest-known activity gathered client-side
// (creation order in phase 1, refined by getThreadPreviews). True bump ordering
// is a gateway-derived feed (from DbCodeInEvent) tracked in issue #6; this
// adapter will switch to that endpoint once it lands, with no call-site change.

import { gwFetch } from "../../gateway";
import { DB_ROOT_ID, resolveBoardSeed, THREADS_PER_PAGE } from "../../board-config";
import type { Post, Reply, ThreadEntry, ThreadResult, BoardGate } from "../../types";
import type { ChainReadAdapter, NetworkDescriptor } from "../types";

const NO_GATE_MINT_EVM = "0x0000000000000000000000000000000000000000";
const REPLY_PREVIEW_COUNT = 5;
const enc = encodeURIComponent;

type RawRow = Record<string, unknown>;

/** __txHash -> __txSignature so downstream Post/Reply code is unchanged. */
function normalizeRow(raw: RawRow): Post {
    const txHash = (raw.__txHash ?? raw.__txSignature) as string | undefined;
    return { ...(raw as unknown as Post), __txSignature: txHash };
}

/** OP preference identical to board.ts isMoreLikelyOp, inlined to avoid pulling
 *  the Solana-flavored board.ts (and its SDK import) into the EVM bundle. */
function preferOp(
    current: { sub?: string; time?: number } | undefined,
    candidate: { sub?: string; time?: number },
): boolean {
    if (!current) return true;
    const curHasSub = !!current.sub;
    const candHasSub = !!candidate.sub;
    if (candHasSub !== curHasSub) return candHasSub;
    return (candidate.time ?? 0) < (current.time ?? 0);
}

export function createEvmReadAdapter(net: NetworkDescriptor): ChainReadAdapter {
    const netParam = net.gatewayNetworkParam;

    function withNetwork(params: Record<string, string>): string {
        const q = new URLSearchParams(params);
        if (netParam) q.set("network", netParam);
        return q.toString();
    }

    async function getRows(tableName: string, limit: number, before?: string): Promise<RawRow[]> {
        const params: Record<string, string> = { limit: String(limit) };
        if (before) params.before = before;
        const res = await gwFetch(`/table/${enc(DB_ROOT_ID)}/${enc(tableName)}/rows?${withNetwork(params)}`);
        if (res.status === 404) return [];
        if (!res.ok) throw new Error(`evm getRows failed: ${res.status}`);
        const data = await res.json();
        return (data.rows ?? []) as RawRow[];
    }

    return {
        net,

        async listThreads(boardId: string): Promise<ThreadEntry[]> {
            const rows = await getRows(resolveBoardSeed(boardId), THREADS_PER_PAGE * 3);
            const threads = new Map<string, ThreadEntry>();

            for (const raw of rows) {
                const post = normalizeRow(raw);
                if (!post.threadPda) continue;
                const time = post.time ?? 0;
                const existing = threads.get(post.threadPda);
                if (existing) {
                    if (post.threadSeed && preferOp(existing.opData ?? undefined, post)) existing.opData = post;
                    existing.lastActivityTime = Math.max(existing.lastActivityTime, time);
                } else {
                    threads.set(post.threadPda, {
                        threadPda: post.threadPda,
                        opData: post.threadSeed ? post : null,
                        lastActivityTime: time,
                        replyCount: 0,
                        lastReplies: [],
                    });
                }
            }

            return [...threads.values()]
                .filter((t) => t.opData !== null)
                .sort((a, b) => b.lastActivityTime - a.lastActivityTime);
        },

        async getThreadPreviews(entry: ThreadEntry): Promise<ThreadEntry> {
            const rows = (await getRows(entry.threadPda, 50)).map(normalizeRow);
            const opSig = entry.opData?.__txSignature;
            const replies = rows
                .filter((r) => r.__txSignature !== opSig)
                .sort((a, b) => a.time - b.time);
            const lastReplyTime = replies.length ? replies[replies.length - 1].time : entry.lastActivityTime;
            return {
                ...entry,
                replyCount: replies.length,
                lastReplies: replies.slice(-REPLY_PREVIEW_COUNT) as Reply[],
                lastActivityTime: Math.max(entry.lastActivityTime, lastReplyTime),
            };
        },

        async getThread(boardId: string | undefined, threadRef: string): Promise<ThreadResult> {
            // No instruction-table merge on EVM yet — edit/delete via manageRowData
            // is out of scope for v1 (issue #6). Rows are returned as written.
            if (boardId) {
                const boardSeed = resolveBoardSeed(boardId);
                const res = await gwFetch(
                    `/table/${enc(DB_ROOT_ID)}/${enc(boardSeed)}/thread/${enc(threadRef)}?${withNetwork({ replyLimit: "500" })}`,
                );
                if (!res.ok) throw new Error(`evm getThread failed: ${res.status}`);
                const data = await res.json();
                const op = data.op ? normalizeRow(data.op) : null;
                const replies = ((data.replies ?? []) as RawRow[]).map(normalizeRow) as Reply[];
                return { op, replies, totalReplies: data.totalReplies ?? replies.length };
            }

            const rows = (await getRows(threadRef, 500)).map(normalizeRow);
            const op = rows
                .filter((r) => !!r.threadSeed)
                .reduce<Post | undefined>((best, r) => (preferOp(best, r) ? r : best), undefined)
                ?? null;
            const replies = rows
                .filter((r) => r.__txSignature !== op?.__txSignature)
                .sort((a, b) => a.time - b.time) as Reply[];
            return { op, replies, totalReplies: replies.length };
        },

        async getBoardGate(boardId: string): Promise<BoardGate> {
            const boardSeed = resolveBoardSeed(boardId);
            const res = await gwFetch(`/table/${enc(DB_ROOT_ID)}/${enc(boardSeed)}/meta?${withNetwork({})}`);
            if (!res.ok) return {};
            const meta = await res.json();
            const mint: string = meta.gate?.mint ?? "";
            const isGated = !!mint && mint !== NO_GATE_MINT_EVM;
            return {
                gateMint: isGated ? mint : undefined,
                gateAmount: isGated ? (meta.gate?.amount ?? 1) : undefined,
                gateType: isGated ? (meta.gate?.gateType ?? meta.gate?.gate_type ?? 0) : undefined,
                tableName: meta.name || "",
            };
        },
    };
}
