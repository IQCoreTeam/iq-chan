"use client";

import { useState, useEffect, useCallback } from "react";
import { DB_ROOT_KEY } from "../lib/constants";
import { getFeedPda, fetchFeedThreads, ThreadEntry } from "../lib/board";

export function useThreads(boardId: string) {
    const [threads, setThreads] = useState<ThreadEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [hasMore, setHasMore] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const feedPda = getFeedPda(DB_ROOT_KEY, boardId);
            const result = await fetchFeedThreads(feedPda);
            setThreads(result.threads);
        } catch (e) {
            setError(e instanceof Error ? e : new Error(String(e)));
        } finally {
            setLoading(false);
        }
    }, [boardId]);

    useEffect(() => {
        load();
    }, [load]);

    const refresh = useCallback(() => {
        load();
    }, [load]);

    return { threads, loading, error, hasMore, loadMore: refresh, refresh };
}
