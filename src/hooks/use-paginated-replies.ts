import { useState, useEffect, useRef, useCallback } from "react";
import { Connection } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";

import { fetchTableIndex, fetchTableSlice } from "../lib/gateway";
import { mergeInstructions } from "../lib/parse";
import { repliesTableSeed, deriveTablePda, deriveInstructionTablePda } from "../lib/constants";
import {
    buildSparseTimeMap,
    estimateCandidateRange,
    resolveInstructionsForPage,
    type Instruction,
    type TimeMapEntry,
} from "../lib/instruction-resolver";

const PAGE_SIZE_DEFAULT = 20;

// Tier threshold: if instrSigs <= this, fetch all at once
const EAGER_THRESHOLD = 50;

export interface Reply {
    no: number;
    com: string;
    name: string;
    time: number;
    img?: string;
    __txSignature?: string;
}

export interface UsePaginatedRepliesReturn {
    replies: Reply[];
    page: number;
    totalPages: number;
    totalReplies: number;
    loading: boolean;
    indexLoading: boolean;
    error: Error | null;
    goToPage: (n: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    refresh: () => void;
}

export function usePaginatedReplies(
    boardId: string,
    threadNo: number,
    pageSize: number = PAGE_SIZE_DEFAULT,
): UsePaginatedRepliesReturn {
    // ─── Index state (set once on mount) ────────────────────────────────────
    const [replySigsOldestFirst, setReplySigsOldestFirst] = useState<string[]>([]);
    const [instrSigs, setInstrSigs] = useState<string[]>([]);
    const [indexLoading, setIndexLoading] = useState(true);

    // ─── Page state ─────────────────────────────────────────────────────────
    const [page, setPage] = useState(0);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // ─── Persistent caches (survive page changes, not re-renders) ───────────
    const instrCache = useRef<Map<string, Instruction>>(new Map());
    const timeMap = useRef<TimeMapEntry[]>([]);
    const instrPda = useRef<string>("");
    const repliesPda = useRef<string>("");

    // ─── Refresh counter to force re-mount ──────────────────────────────────
    const [refreshKey, setRefreshKey] = useState(0);

    const totalPages = Math.max(1, Math.ceil(replySigsOldestFirst.length / pageSize));
    const totalReplies = replySigsOldestFirst.length;

    // ─── Phase 1: Index Prefetch ────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function prefetch() {
            setIndexLoading(true);
            setError(null);
            instrCache.current.clear();
            timeMap.current = [];

            try {
                // Derive PDAs
                const seed = repliesTableSeed(boardId, threadNo);
                repliesPda.current = deriveTablePda(seed);
                instrPda.current = deriveInstructionTablePda(seed);

                // Fetch both indexes in parallel
                const [rSigs, iSigs] = await Promise.all([
                    fetchTableIndex(repliesPda.current),
                    fetchTableIndex(instrPda.current),
                ]);

                if (cancelled) return;

                // /index returns newest-first → reverse for oldest-first display
                const reversed = [...rSigs].reverse();
                setReplySigsOldestFirst(reversed);
                setInstrSigs(iSigs);

                // ─── Tier-based instruction prefetch ────────────────────────
                if (iSigs.length > 0 && iSigs.length <= EAGER_THRESHOLD) {
                    // Tier 1: Fetch all instructions eagerly
                    const instrRows = await fetchTableSlice(instrPda.current, iSigs);
                    for (const row of instrRows) {
                        if (row.__txSignature) {
                            instrCache.current.set(row.__txSignature, row as Instruction);
                        }
                    }
                } else if (iSigs.length > EAGER_THRESHOLD) {
                    // Tier 2: Build sparse time map for interpolation search
                    const connection = new Connection(iqlabs.getRpcUrl());
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
    }, [boardId, threadNo, refreshKey]);

    // ─── Phase 2: Per-Page Loading ──────────────────────────────────────────
    useEffect(() => {
        if (indexLoading || replySigsOldestFirst.length === 0) return;

        let cancelled = false;

        async function loadPage() {
            setLoading(true);
            setError(null);

            try {
                // Compute which reply sigs belong to this page
                const start = page * pageSize;
                const end = Math.min(start + pageSize, replySigsOldestFirst.length);
                const pageReplySigs = replySigsOldestFirst.slice(start, end);

                if (pageReplySigs.length === 0) {
                    if (!cancelled) setReplies([]);
                    return;
                }

                // Fetch reply data for this page
                const replyRows = await fetchTableSlice(repliesPda.current, pageReplySigs);
                if (cancelled) return;

                // ─── Resolve instructions for this page ─────────────────────
                let relevantInstructions: Instruction[] = [];

                if (instrSigs.length > 0) {
                    const pageReplySet = new Set(pageReplySigs);

                    if (instrSigs.length <= EAGER_THRESHOLD) {
                        // Tier 1: All instructions already cached — just filter
                        for (const instr of instrCache.current.values()) {
                            if (instr.target && pageReplySet.has(instr.target)) {
                                relevantInstructions.push(instr);
                            }
                        }
                    } else {
                        // Tier 2: Interpolation search
                        // Get T_oldest from reply data (the `time` field of oldest reply on page)
                        const times = replyRows
                            .map((r) => r.time as number | undefined)
                            .filter((t): t is number => typeof t === "number" && t > 0);
                        const T_oldest = times.length > 0 ? Math.min(...times) : 0;

                        if (T_oldest > 0) {
                            const rangeEnd = estimateCandidateRange(
                                timeMap.current,
                                instrSigs.length,
                                T_oldest,
                            );
                            relevantInstructions = await resolveInstructionsForPage(
                                instrSigs,
                                rangeEnd,
                                pageReplySet,
                                instrCache.current,
                                instrPda.current,
                            );
                        } else {
                            // Fallback: can't determine time, fetch all candidates
                            relevantInstructions = await resolveInstructionsForPage(
                                instrSigs,
                                instrSigs.length - 1,
                                pageReplySet,
                                instrCache.current,
                                instrPda.current,
                            );
                        }
                    }
                }

                if (cancelled) return;

                // Merge instructions into replies
                const merged = instrSigs.length > 0
                    ? mergeInstructions(replyRows, relevantInstructions)
                    : replyRows;

                // Maintain oldest-first order matching pageReplySigs
                const sigOrder = new Map(pageReplySigs.map((s, i) => [s, i]));
                merged.sort((a, b) => {
                    const aIdx = sigOrder.get(a.__txSignature as string) ?? 999;
                    const bIdx = sigOrder.get(b.__txSignature as string) ?? 999;
                    return aIdx - bIdx;
                });

                if (!cancelled) setReplies(merged as unknown as Reply[]);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadPage();
        return () => { cancelled = true; };
    }, [page, pageSize, indexLoading, replySigsOldestFirst, instrSigs]);

    // ─── Navigation ─────────────────────────────────────────────────────────
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
