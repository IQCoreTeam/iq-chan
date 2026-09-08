"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getChain } from "../lib/chains";
import type { Reply, ThreadEntry } from "../lib/types";
import { isConfirmedPost, mergeConfirmedReplies } from "../lib/confirmed-posts";

export function useThreads(boardId: string) {
    const [threads, setThreads] = useState<ThreadEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const requestId = useRef(0);
    const pendingReplies = useRef(new Map<string, Reply[]>());
    const confirmed = useRef<{ board: string; threads: ThreadEntry[] }>({ board: boardId, threads: [] });

    const withPendingReplies = useCallback((thread: ThreadEntry): ThreadEntry => {
        const pending = pendingReplies.current.get(thread.threadPda) ?? [];
        const lastReplies = mergeConfirmedReplies(thread.lastReplies, pending);
        return { ...thread, lastReplies, replyCount: thread.replyCount + lastReplies.length - thread.lastReplies.length };
    }, []);

    const mergeConfirmed = useCallback((remote: ThreadEntry[]) => {
        const ids = new Set(remote.map((thread) => thread.threadPda));
        return [...confirmed.current.threads.filter((thread) => !ids.has(thread.threadPda)), ...remote].map(withPendingReplies);
    }, [withPendingReplies]);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        const currentRequest = ++requestId.current;

        try {
            const chain = await getChain();

            // Phase 1: show threads immediately.
            const quick = await chain.listThreads(boardId);
            if (requestId.current !== currentRequest) return;
            confirmed.current.threads = confirmed.current.threads.filter((local) => !quick.some((remote) => remote.threadPda === local.threadPda));
            setThreads(mergeConfirmed(quick));
            setLoading(false);

            // Phase 2: Lazy-load reply previews in background (N requests, non-blocking)
            for (const entry of quick) {
                if (requestId.current !== currentRequest) return;
                const updated = await chain.getThreadPreviews(entry);
                if (requestId.current !== currentRequest) return;
                const seen = new Set(updated.lastReplies.map((row) => row.__txSignature));
                pendingReplies.current.set(updated.threadPda, (pendingReplies.current.get(updated.threadPda) ?? []).filter((row) => !seen.has(row.__txSignature)));
                setThreads((prev) =>
                    prev.map((t) => t.threadPda === updated.threadPda ? withPendingReplies(updated) : t),
                );
            }
        } catch (e) {
            if (requestId.current === currentRequest) {
                setError(e instanceof Error ? e : new Error(String(e)));
                setLoading(false);
            }
        }
    }, [boardId, mergeConfirmed, withPendingReplies]);

    useEffect(() => {
        if (confirmed.current.board !== boardId) {
            confirmed.current = { board: boardId, threads: [] };
            pendingReplies.current.clear();
            setThreads([]);
        }
        refresh();
        return () => { requestId.current++; };
    }, [refresh]);

    const addConfirmedThread = useCallback((value: unknown) => {
        if (!isConfirmedPost(value) || !value.threadPda || confirmed.current.board !== boardId) return;
        const entry: ThreadEntry = { threadPda: value.threadPda, opData: value, lastActivityTime: value.time, replyCount: 0, lastReplies: [] };
        if (!confirmed.current.threads.some((thread) => thread.threadPda === entry.threadPda)) confirmed.current.threads.unshift(entry);
        setThreads((prev) => mergeConfirmed(prev));
    }, [boardId, mergeConfirmed]);

    const addConfirmedReply = useCallback((threadPda: string, value: unknown) => {
        if (!isConfirmedPost(value) || confirmed.current.board !== boardId) return;
        pendingReplies.current.set(threadPda, mergeConfirmedReplies(pendingReplies.current.get(threadPda) ?? [], [value]));
        setThreads((prev) => prev.map((thread) => {
            if (thread.threadPda !== threadPda) return thread;
            const lastReplies = mergeConfirmedReplies(thread.lastReplies, [value]);
            return { ...thread, lastReplies, replyCount: thread.replyCount + lastReplies.length - thread.lastReplies.length };
        }));
    }, [boardId]);

    return { threads, loading, error, refresh, addConfirmedThread, addConfirmedReply };
}
