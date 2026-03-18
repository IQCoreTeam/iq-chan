import { useState, useEffect, useRef, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

import { fetchTableIndex, fetchTableSlice } from "../lib/gateway";
import { mergeInstructions } from "../lib/parse";
import { deriveInstructionTablePda } from "../lib/constants";
import {
    buildSparseTimeMap,
    estimateCandidateRange,
    resolveInstructionsForPage,
    type Instruction,
    type TimeMapEntry,
} from "../lib/instruction-resolver";
import type { Reply } from "../lib/types";

const PAGE_SIZE_DEFAULT = 20;
const EAGER_THRESHOLD = 50;

export function usePaginatedReplies(
    threadPda: string,
    threadSeed: string,
    pageSize: number = PAGE_SIZE_DEFAULT,
) {
    const { connection } = useConnection();
    const [replySigsOldestFirst, setReplySigsOldestFirst] = useState<string[]>([]);
    const [instrSigs, setInstrSigs] = useState<string[]>([]);
    const [indexLoading, setIndexLoading] = useState(true);

    const [page, setPage] = useState(0);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const instrCache = useRef<Map<string, Instruction>>(new Map());
    const timeMap = useRef<TimeMapEntry[]>([]);
    const instrPdaRef = useRef<string>("");

    const [refreshKey, setRefreshKey] = useState(0);

    const totalPages = Math.max(1, Math.ceil(replySigsOldestFirst.length / pageSize));
    const totalReplies = replySigsOldestFirst.length;

    // ─── Phase 1: Index Prefetch ────────────────────────────────────────────
    useEffect(() => {
        if (!threadPda || !threadSeed) return;
        let cancelled = false;

        async function prefetch() {
            setIndexLoading(true);
            setError(null);
            instrCache.current.clear();
            timeMap.current = [];

            try {
                instrPdaRef.current = deriveInstructionTablePda(threadSeed);

                const [rSigs, iSigs] = await Promise.all([
                    fetchTableIndex(threadPda),
                    fetchTableIndex(instrPdaRef.current),
                ]);

                if (cancelled) return;

                // Filter out OP row — we only want replies
                // OP is the oldest sig (last in newest-first array), but we need to check data
                // For now, reverse to oldest-first, then filter OP when loading pages
                const reversed = [...rSigs].reverse();
                setReplySigsOldestFirst(reversed);
                setInstrSigs(iSigs);

                if (iSigs.length > 0 && iSigs.length <= EAGER_THRESHOLD) {
                    const instrRows = await fetchTableSlice(instrPdaRef.current, iSigs);
                    for (const row of instrRows) {
                        if (row.__txSignature) {
                            instrCache.current.set(row.__txSignature, row as Instruction);
                        }
                    }
                } else if (iSigs.length > EAGER_THRESHOLD) {
                    timeMap.current = await buildSparseTimeMap(connection, iSigs);
                }

                setPage(0);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
            } finally {
                if (!cancelled) setIndexLoading(false);
            }
        }

        prefetch();
        return () => { cancelled = true; };
    }, [threadPda, threadSeed, refreshKey]);

    // ─── Phase 2: Per-Page Loading ──────────────────────────────────────────
    useEffect(() => {
        if (indexLoading || replySigsOldestFirst.length === 0) return;

        let cancelled = false;

        async function loadPage() {
            setLoading(true);
            setError(null);

            try {
                const start = page * pageSize;
                const end = Math.min(start + pageSize, replySigsOldestFirst.length);
                const pageReplySigs = replySigsOldestFirst.slice(start, end);

                if (pageReplySigs.length === 0) {
                    if (!cancelled) setReplies([]);
                    return;
                }

                const replyRows = await fetchTableSlice(threadPda, pageReplySigs);
                if (cancelled) return;

                // Filter out OP row (sub is non-empty)
                const replyOnly = replyRows.filter(
                    (r) => !r.sub || (r.sub as string).length === 0,
                );

                let relevantInstructions: Instruction[] = [];

                if (instrSigs.length > 0) {
                    const pageReplySet = new Set(pageReplySigs);

                    if (instrSigs.length <= EAGER_THRESHOLD) {
                        for (const instr of instrCache.current.values()) {
                            if (instr.target && pageReplySet.has(instr.target)) {
                                relevantInstructions.push(instr);
                            }
                        }
                    } else {
                        const times = replyOnly
                            .map((r) => r.time as number | undefined)
                            .filter((t): t is number => typeof t === "number" && t > 0);
                        const T_oldest = times.length > 0 ? Math.min(...times) : 0;

                        if (T_oldest > 0) {
                            const rangeEnd = estimateCandidateRange(
                                timeMap.current, instrSigs.length, T_oldest,
                            );
                            relevantInstructions = await resolveInstructionsForPage(
                                instrSigs, rangeEnd, pageReplySet,
                                instrCache.current, instrPdaRef.current,
                            );
                        } else {
                            relevantInstructions = await resolveInstructionsForPage(
                                instrSigs, instrSigs.length - 1, pageReplySet,
                                instrCache.current, instrPdaRef.current,
                            );
                        }
                    }
                }

                if (cancelled) return;

                const merged = instrSigs.length > 0
                    ? mergeInstructions(replyOnly, relevantInstructions)
                    : replyOnly;

                const sigOrder = new Map(pageReplySigs.map((s, i) => [s, i]));
                merged.sort((a, b) => {
                    const aIdx = sigOrder.get(a.__txSignature as string) ?? 999;
                    const bIdx = sigOrder.get(b.__txSignature as string) ?? 999;
                    return aIdx - bIdx;
                });

                if (!cancelled) setReplies(merged as Reply[]);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadPage();
        return () => { cancelled = true; };
    }, [page, pageSize, indexLoading, replySigsOldestFirst, instrSigs]);

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
        replies,
        page,
        totalPages,
        totalReplies,
        loading: loading || indexLoading,
        indexLoading,
        error,
        goToPage,
        nextPage,
        prevPage,
        refresh,
    };
}
