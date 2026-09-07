// Solana read adapter. Pure composition over the existing board.ts / gateway.ts
// / parse.ts helpers — no new on-chain logic. Each method reproduces exactly
// what the corresponding read hook used to do inline, so the live Solana site
// behaves identically; the hooks now just call these.

import { DB_ROOT_KEY, resolveBoardSeed, deriveTablePda, deriveInstructionTablePda } from "../../constants";
import { getFeedPda, fetchFeedThreadsQuick, fetchThreadPreviews, isMoreLikelyOp } from "../../board";
import { fetchThread, fetchAllTableRows, fetchTableMeta, type Row } from "../../gateway";
import { mergeInstructions } from "../../parse";
import type { Post, ThreadEntry, ThreadResult, BoardGate } from "../../types";
import type { ChainReadAdapter, NetworkDescriptor } from "../types";

const NO_GATE_MINT = "11111111111111111111111111111111";

/** OP + replies from a merged row set, derived identically to the old
 *  use-paginated-replies memos (OP = most-likely-OP row, replies = the rest,
 *  time-sorted). */
function toThreadResult(rows: Post[]): ThreadResult {
    const op = rows
        .filter((r) => !!r.threadSeed)
        .reduce<Post | undefined>((best, r) => (isMoreLikelyOp(best, r) ? r : best), undefined)
        ?? null;
    const replies = rows
        .filter((r) => r.__txSignature !== op?.__txSignature)
        .sort((a, b) => a.time - b.time);
    return { op, replies, totalReplies: replies.length };
}

export function createSolanaReadAdapter(net: NetworkDescriptor): ChainReadAdapter {
    return {
        net,

        async listThreads(boardId: string): Promise<ThreadEntry[]> {
            const feedPda = getFeedPda(DB_ROOT_KEY, resolveBoardSeed(boardId));
            return fetchFeedThreadsQuick(feedPda);
        },

        getThreadPreviews(entry: ThreadEntry): Promise<ThreadEntry> {
            return fetchThreadPreviews(entry);
        },

        async getThread(boardId: string | undefined, threadRef: string): Promise<ThreadResult> {
            let rows: Post[];
            let op: Post | null = null;

            if (boardId) {
                const feedPda = getFeedPda(DB_ROOT_KEY, resolveBoardSeed(boardId));
                const thread = await fetchThread(feedPda.toBase58(), threadRef);
                op = thread.op;
                rows = thread.op
                    ? [thread.op, ...(thread.replies as Post[])]
                    : (thread.replies as Post[]);
            } else {
                const tableRows = await fetchAllTableRows(threadRef);
                op = tableRows
                    .filter((r) => !!r.threadSeed)
                    .reduce<Post | undefined>((best, r) => (isMoreLikelyOp(best, r) ? r : best), undefined)
                    ?? null;
                rows = tableRows as Post[];
            }

            let merged: Post[] = rows;
            if (op?.threadSeed) {
                const instrPda = deriveInstructionTablePda(op.threadSeed);
                const instrRows = await fetchAllTableRows(instrPda);
                if (instrRows.length > 0) {
                    merged = mergeInstructions(rows as Row[], instrRows) as Post[];
                }
            }

            return toThreadResult(merged);
        },

        async getBoardGate(boardId: string): Promise<BoardGate> {
            const pda = deriveTablePda(resolveBoardSeed(boardId));
            const meta = await fetchTableMeta(pda);
            if (!meta) return {};
            const mint = meta.gate?.mint ?? "";
            const isGated = !!mint && mint !== NO_GATE_MINT;
            const gate = meta.gate as (typeof meta.gate & { gate_type?: number }) | null;
            return {
                gateMint: isGated ? mint : undefined,
                gateAmount: isGated ? (meta.gate?.amount ?? 1) : undefined,
                gateType: isGated ? (meta.gate?.gateType ?? gate?.gate_type ?? 0) : undefined,
                tableName: meta.name || "",
            };
        },
    };
}
