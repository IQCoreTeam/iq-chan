"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DB_ROOT_KEY, resolveBoardSeed } from "../lib/constants";
import { getFeedPda, fetchFeedThreadsQuick, fetchThreadPreviews, ThreadEntry } from "../lib/board";

export function useThreads(boardId: string) {
    const [threads, setThreads] = useState<ThreadEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const cancelRef = useRef(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        cancelRef.current = false;

        try {
            const feedPda = getFeedPda(DB_ROOT_KEY, resolveBoardSeed(boardId));

            // Phase 1: show threads immediately.
            const quick = await fetchFeedThreadsQuick(feedPda);
            if (cancelRef.current) return;
            setThreads(quick);
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
        refresh();
        return () => { cancelRef.current = true; };
    }, [refresh]);

    return { threads, loading, error, refresh };
}
