import { useState, useEffect, useCallback, useMemo } from "react";

import { fetchAllTableRows, type Row } from "../lib/gateway";
import { mergeInstructions } from "../lib/parse";
import { deriveInstructionTablePda, resolveBoardSeed, DB_ROOT_KEY } from "../lib/constants";
import { getFeedPda } from "../lib/board";
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
                // Replies in the feed also carry threadSeed (bump rows). Prefer rows with
                // !!sub (OPs hardcode a subject; replies hardcode "" per use-post.ts).
                // Fall back to earliest-by-time in case an OP ever has empty sub.
                const pickOp = (candidates: Row[]): Row | undefined =>
                    candidates.find((r) => !!r.sub) ?? candidates.reduce<Row | undefined>(
                        (a, b) => !a || (b.time as number) < (a.time as number) ? b : a,
                        undefined,
                    );
                let opRow: Row | undefined;
                if (boardId) {
                    const feedPda = getFeedPda(DB_ROOT_KEY, resolveBoardSeed(boardId));
                    const feedRows = await fetchAllTableRows(feedPda.toBase58(), 100);
                    if (cancelled) return;
                    opRow = pickOp(feedRows.filter((r) => r.threadPda === threadPda && !!r.threadSeed));
                }
                if (!opRow) opRow = pickOp(rows.filter((r) => !!r.threadSeed));
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

                if (!cancelled) {
                    // Preserve optimistic rows not yet in gateway response
                    setAllRows((prev) => {
                        const sigs = new Set(merged.map((r) => (r as Post).__txSignature));
                        const optimistic = prev.filter((r) => r.__txSignature && !sigs.has(r.__txSignature));
                        return [...(merged as Post[]), ...optimistic];
                    });
                }
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [threadPda, refreshKey]);

    // OP = earliest post with threadSeed; everything else is a reply
    const op = useMemo(
        () => {
            const withSeed = allRows.filter((r) => !!r.threadSeed);
            if (withSeed.length === 0) return null;
            return withSeed.reduce((a, b) => a.time <= b.time ? a : b);
        },
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

    const addOptimisticRow = useCallback((row: Post) => {
        setAllRows((prev) => {
            if (prev.some((r) => r.__txSignature === row.__txSignature)) return prev;
            return [...prev, row];
        });
    }, []);

    return {
        op,
        replies,
        totalReplies,
        loading,
        error,
        refresh,
        addOptimisticRow,
    };
}
