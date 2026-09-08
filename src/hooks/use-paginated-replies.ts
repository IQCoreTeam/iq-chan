import { useState, useEffect, useCallback, useRef } from "react";

import { getChain } from "../lib/chains";
import type { Reply, ThreadResult } from "../lib/types";
import { isConfirmedPost, mergeConfirmedReplies } from "../lib/confirmed-posts";

export function usePaginatedReplies(
    threadPda: string,
    boardId?: string,
) {
    const [result, setResult] = useState<ThreadResult>({ op: null, replies: [], totalReplies: 0 });
    const confirmed = useRef<{ thread: string; rows: Reply[] }>({ thread: threadPda, rows: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // The adapter fetches the thread (gateway compound endpoint when we have a
    // boardId, table scan otherwise), merges edit/delete instructions, and
    // returns the resolved OP + time-sorted replies.
    useEffect(() => {
        if (confirmed.current.thread !== threadPda) {
            confirmed.current = { thread: threadPda, rows: [] };
            setResult({ op: null, replies: [], totalReplies: 0 });
        }
        if (!threadPda) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const chain = await getChain();
                const result = await chain.getThread(boardId, threadPda);
                if (cancelled) return;
                const seen = new Set(result.replies.map((row) => row.__txSignature));
                confirmed.current.rows = confirmed.current.rows.filter((row) => !seen.has(row.__txSignature));
                const replies = mergeConfirmedReplies(result.replies, confirmed.current.rows);
                setResult({ ...result, replies, totalReplies: result.totalReplies + replies.length - result.replies.length });
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [threadPda, boardId, refreshKey]);

    const refresh = useCallback(() => {
        setRefreshKey((k) => k + 1);
    }, []);

    const addConfirmedReply = useCallback((value: unknown) => {
        if (!isConfirmedPost(value) || confirmed.current.thread !== threadPda) return;
        confirmed.current.rows = mergeConfirmedReplies(confirmed.current.rows, [value]);
        setResult((prev) => {
            const replies = mergeConfirmedReplies(prev.replies, [value]);
            return { ...prev, replies, totalReplies: prev.totalReplies + replies.length - prev.replies.length };
        });
    }, [threadPda]);

    return {
        ...result,
        loading,
        error,
        refresh,
        addConfirmedReply,
    };
}
