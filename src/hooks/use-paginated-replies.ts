import { useState, useEffect, useCallback, useMemo } from "react";

import { fetchAllTableRows, type Row } from "../lib/gateway";
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

    // Fetch all rows + instructions via /rows (real-time), apply edits/deletes
    useEffect(() => {
        if (!threadPda) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const rows = await fetchAllTableRows(threadPda);
                if (cancelled) return;

                // OP is written to the board table (Zo's gate flow), not the thread table.
                // Check the feed first (which contains the OP and bump rows), then fall
                // back to scanning this thread's own table for legacy threads.
                let opRow: Row | undefined;
                if (boardId) {
                    const feedPda = getFeedPda(DB_ROOT_KEY, resolveBoardSeed(boardId));
                    const feedRows = await fetchAllTableRows(feedPda.toBase58(), 100);
                    if (cancelled) return;
                    opRow = feedRows
                        .filter((r) => r.threadPda === threadPda && !!r.threadSeed)
                        .reduce<Row | undefined>((best, r) => isMoreLikelyOp(best, r) ? r : best, undefined);
                }
                if (!opRow) {
                    opRow = rows
                        .filter((r) => !!r.threadSeed)
                        .reduce<Row | undefined>((best, r) => isMoreLikelyOp(best, r) ? r : best, undefined);
                }
                if (opRow && !rows.some((r) => r.__txSignature === opRow!.__txSignature)) {
                    rows.unshift(opRow);
                }

                let merged = rows;
                const threadSeedResolved = (opRow as Post)?.threadSeed;
                if (threadSeedResolved) {
                    const instrPda = deriveInstructionTablePda(threadSeedResolved);
                    const instrRows = await fetchAllTableRows(instrPda);
                    if (cancelled) return;
                    if (instrRows.length > 0) {
                        merged = mergeInstructions(rows, instrRows);
                    }
                }

                if (!cancelled) setAllRows(merged as Post[]);
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
