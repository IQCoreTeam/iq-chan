import { useState, useEffect, useCallback } from "react";

import { getChain } from "../lib/chains";
import type { Post, Reply } from "../lib/types";

export function usePaginatedReplies(
    threadPda: string,
    boardId?: string,
) {
    const [op, setOp] = useState<Post | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [totalReplies, setTotalReplies] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // The adapter fetches the thread (gateway compound endpoint when we have a
    // boardId, table scan otherwise), merges edit/delete instructions, and
    // returns the resolved OP + time-sorted replies.
    useEffect(() => {
        if (!threadPda) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const chain = await getChain();
                const result = await chain.getThread(boardId, threadPda);
                if (cancelled) return;
                setOp(result.op);
                setReplies(result.replies);
                setTotalReplies(result.totalReplies);
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

    return {
        op,
        replies,
        totalReplies,
        loading,
        error,
        refresh,
    };
}
