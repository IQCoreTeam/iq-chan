"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { DB_ROOT_KEY } from "../lib/constants";
import { getFeedPda, fetchFeedThreads, ThreadEntry } from "../lib/board";

export function useThreads(boardId: string) {
    const { connection } = useConnection();
    const [threads, setThreads] = useState<ThreadEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [cursor, setCursor] = useState<string | undefined>();
    const [hasMore, setHasMore] = useState(true);

    const load = useCallback(async (before?: string) => {
        setLoading(true);
        setError(null);

        try {
            const feedPda = getFeedPda(DB_ROOT_KEY, boardId);
            const result = await fetchFeedThreads(connection, feedPda, before);

            if (before) {
                // Append to existing (next page)
                setThreads((prev) => {
                    const existing = new Set(prev.map((t) => t.threadPda));
                    const newThreads = result.threads.filter((t) => !existing.has(t.threadPda));
                    return [...prev, ...newThreads];
                });
            } else {
                setThreads(result.threads);
            }

            setCursor(result.nextCursor);
            setHasMore(result.threads.length > 0 && !!result.nextCursor);
        } catch (e) {
            setError(e instanceof Error ? e : new Error(String(e)));
        } finally {
            setLoading(false);
        }
    }, [boardId, connection]);

    useEffect(() => {
        load();
    }, [load]);

    const loadMore = useCallback(() => {
        if (!loading && hasMore && cursor) {
            load(cursor);
        }
    }, [loading, hasMore, cursor, load]);

    const refresh = useCallback(() => {
        setCursor(undefined);
        setHasMore(true);
        load();
    }, [load]);

    return { threads, loading, error, hasMore, loadMore, refresh };
}
