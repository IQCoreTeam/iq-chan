import { useState, useEffect, useCallback, useMemo } from "react";

import { fetchAllTableRows, type Row } from "../lib/gateway";
import { mergeInstructions } from "../lib/parse";
import { deriveInstructionTablePda, resolveBoardSeed, DB_ROOT_KEY } from "../lib/constants";
import { getFeedPda } from "../lib/board";
import type { Post, Reply } from "../lib/types";

const PAGE_SIZE_DEFAULT = 500;

export function usePaginatedReplies(
    threadPda: string,
    boardId?: string,
    pageSize: number = PAGE_SIZE_DEFAULT,
) {
    const [allRows, setAllRows] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [page, setPage] = useState(0);
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
                // Always fetch from feed to find it reliably.
                let opRow: Row | undefined;
                if (boardId) {
                    const feedPda = getFeedPda(DB_ROOT_KEY, resolveBoardSeed(boardId));
                    const feedRows = await fetchAllTableRows(feedPda.toBase58(), 100);
                    if (cancelled) return;
                    opRow = feedRows.find((r) => r.threadPda === threadPda && !!r.threadSeed);
                }
                if (!opRow) opRow = rows.find((r) => !!r.threadSeed);
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

    const allReplies = useMemo(
        () => allRows
            .filter((r) => r.__txSignature !== op?.__txSignature)
            .sort((a, b) => a.time - b.time),
        [allRows, op],
    );

    // Client-side pagination
    const totalReplies = allReplies.length;
    const totalPages = Math.max(1, Math.ceil(totalReplies / pageSize));

    const replies: Reply[] = useMemo(() => {
        const start = page * pageSize;
        return allReplies.slice(start, start + pageSize);
    }, [allReplies, page, pageSize]);

    const goToPage = useCallback((n: number) => {
        setPage(Math.max(0, Math.min(n, totalPages - 1)));
    }, [totalPages]);

    const nextPage = useCallback(() => {
        setPage((p) => Math.min(p + 1, totalPages - 1));
    }, [totalPages]);

    const prevPage = useCallback(() => {
        setPage((p) => Math.max(p - 1, 0));
    }, []);

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
        page,
        totalPages,
        totalReplies,
        loading,
        error,
        goToPage,
        nextPage,
        prevPage,
        refresh,
        addOptimisticRow,
    };
}
