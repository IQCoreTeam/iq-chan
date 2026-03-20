import { useState, useEffect, useCallback, useMemo } from "react";

import { fetchAllTableRows } from "../lib/gateway";
import { mergeInstructions } from "../lib/parse";
import { deriveInstructionTablePda } from "../lib/constants";
import type { Post, Reply } from "../lib/types";

const PAGE_SIZE_DEFAULT = 20;

export function usePaginatedReplies(
    threadPda: string,
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

                // Find OP to get threadSeed for instruction table
                const op = rows.find((r) => !!r.threadSeed);
                const threadSeed = (op as Post)?.threadSeed;

                let merged = rows;
                if (threadSeed) {
                    const instrPda = deriveInstructionTablePda(threadSeed);
                    const instrRows = await fetchAllTableRows(instrPda);
                    if (cancelled) return;
                    if (instrRows.length > 0) {
                        merged = mergeInstructions(rows, instrRows);
                    }
                }

                if (!cancelled) {
                    setAllRows(merged as Post[]);
                    setPage(0);
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

    // Separate OP and replies
    const op = useMemo(
        () => allRows.find((r) => !!r.threadSeed) ?? null,
        [allRows],
    );

    const allReplies = useMemo(
        () => allRows
            .filter((r) => !r.threadSeed)
            .sort((a, b) => a.time - b.time),
        [allRows],
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
    };
}
