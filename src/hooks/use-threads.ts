"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DB_ROOT_KEY, resolveBoardSeed } from "../lib/constants";
import { getFeedPda, fetchFeedThreadsQuick, fetchThreadPreviews, ThreadEntry } from "../lib/board";

export function useThreads(boardId: string) {
    const [threads, setThreads] = useState<ThreadEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const cancelRef = useRef(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        cancelRef.current = false;

        try {
            const feedPda = getFeedPda(DB_ROOT_KEY, resolveBoardSeed(boardId));

            // Phase 1: show threads immediately. Merge so optimistic threads
            // added by addOptimisticThread survive until the gateway catches up.
            const quick = await fetchFeedThreadsQuick(feedPda);
            if (cancelRef.current) return;
            setThreads((prev) => {
                const gatewayPdas = new Set(quick.map((t) => t.threadPda));
                const optimistic = prev.filter((t) => !gatewayPdas.has(t.threadPda));
                return [...optimistic, ...quick];
            });
            setLoading(false);

            // Phase 2: Lazy-load reply previews in background (N requests, non-blocking)
            for (const entry of quick) {
                if (cancelRef.current) return;
                const updated = await fetchThreadPreviews(entry);
                if (cancelRef.current) return;
                setThreads((prev) =>
                    prev.map((t) => t.threadPda === updated.threadPda ? updated : t),
                );
            }
        } catch (e) {
            if (!cancelRef.current) {
                setError(e instanceof Error ? e : new Error(String(e)));
                setLoading(false);
            }
        }
    }, [boardId]);

    useEffect(() => {
        cancelRef.current = false;
        load();
        return () => { cancelRef.current = true; };
    }, [load]);

    /** Inject a freshly-created thread so it renders before the gateway catches up. */
    const addOptimisticThread = useCallback((entry: ThreadEntry) => {
        setThreads((prev) => {
            if (prev.some((t) => t.threadPda === entry.threadPda)) return prev;
            return [entry, ...prev];
        });
    }, []);

    return { threads, loading, error, hasMore, loadMore: load, refresh: load, addOptimisticThread };
}
