import { useState, useEffect, useCallback, useMemo } from "react";

import { fetchAllTableRows, fetchThread, type Row } from "../lib/gateway";
import { mergeInstructions } from "../lib/parse";
import { deriveInstructionTablePda, resolveBoardSeed, DB_ROOT_KEY } from "../lib/constants";
import { getFeedPda, isMoreLikelyOp } from "../lib/board";
import type { Post, Reply } from "../lib/types";

export function usePaginatedReplies(
    threadPda: string,
    boardId?: string,
) {
    const [allRows, setAllRows] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch via gateway /thread compound endpoint when we have a boardId
    // (gateway picks the OP server-side). Fall back to thread-table scan for
    // legacy or detached contexts. In both cases, instruction table is merged
    // separately to apply edits/deletes.
    useEffect(() => {
        if (!threadPda) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                let rows: Post[];
                let op: Post | null = null;

                if (boardId) {
                    const feedPda = getFeedPda(DB_ROOT_KEY, resolveBoardSeed(boardId));
                    const thread = await fetchThread(feedPda.toBase58(), threadPda);
                    if (cancelled) return;
                    op = thread.op;
                    rows = thread.op ? [thread.op, ...(thread.replies as Post[])] : (thread.replies as Post[]);
                } else {
                    const tableRows = await fetchAllTableRows(threadPda);
                    if (cancelled) return;
                    op = tableRows
                        .filter((r) => !!r.threadSeed)
                        .reduce<Post | undefined>((best, r) => isMoreLikelyOp(best, r) ? r : best, undefined)
                        ?? null;
                    rows = tableRows as Post[];
                }

                let merged: Post[] = rows;
                if (op?.threadSeed) {
                    const instrPda = deriveInstructionTablePda(op.threadSeed);
                    const instrRows = await fetchAllTableRows(instrPda);
                    if (cancelled) return;
                    if (instrRows.length > 0) {
                        merged = mergeInstructions(rows as Row[], instrRows) as Post[];
                    }
                }

                if (!cancelled) setAllRows(merged);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [threadPda, boardId, refreshKey]);

    const op = useMemo<Post | null>(
        () => allRows
            .filter((r) => !!r.threadSeed)
            .reduce<Post | undefined>((best, r) => isMoreLikelyOp(best, r) ? r : best, undefined)
            ?? null,
        [allRows],
    );

    const replies: Reply[] = useMemo(
        () => allRows
            .filter((r) => r.__txSignature !== op?.__txSignature)
            .sort((a, b) => a.time - b.time),
        [allRows, op],
    );

    const totalReplies = replies.length;

    const refresh = useCallback(() => {
        setRefreshKey((k) => k + 1);
    }, []);

    return {
        op,
        replies,
        totalReplies,
        loading,
        error,
        refresh,
    };
}
