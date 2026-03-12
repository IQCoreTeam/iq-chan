"use client";

import { useState, useEffect } from "react";
import { Connection } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { fetchTableIndex, fetchTableSliceBatched } from "../lib/gateway";
import { threadsTableSeed, deriveTablePda, getDbRootKey } from "../lib/constants";
import { getFeedPda, fetchBumpOrderedThreadNos } from "../lib/board";

export function useThreads(boardId: string, mode: "catalog" | "bump") {
    const [threads, setThreads] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const seed = threadsTableSeed(boardId);
                const pda = deriveTablePda(seed);

                // Check index first — if empty, board has no threads yet
                const sigs = await fetchTableIndex(pda);
                if (cancelled) return;
                if (sigs.length === 0) {
                    if (!cancelled) setThreads([]);
                    return;
                }

                if (mode === "catalog") {
                    // ─── Catalog: creation order ────────────────────────
                    const rows = await fetchTableSliceBatched(pda, sigs);
                    if (!cancelled) setThreads(rows);
                } else {
                    // ─── Bump: activity order ───────────────────────────
                    const feedPda = getFeedPda(getDbRootKey(), boardId);
                    const connection = new Connection(iqlabs.getRpcUrl());
                    const threadNos = await fetchBumpOrderedThreadNos(connection, feedPda);
                    if (cancelled || threadNos.length === 0) {
                        // Feed empty but threads exist — fall back to creation order
                        const rows = await fetchTableSliceBatched(pda, sigs);
                        if (!cancelled) setThreads(rows);
                        return;
                    }

                    // Fetch all thread rows, then reorder by bump order
                    const allRows = await fetchTableSliceBatched(pda, sigs);
                    if (cancelled) return;

                    const byNo = new Map(allRows.map((r) => [r.no as number, r]));
                    const ordered = threadNos
                        .map((no) => byNo.get(no))
                        .filter(Boolean) as Record<string, unknown>[];

                    if (!cancelled) setThreads(ordered);
                }
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [boardId, mode]);

    return { threads, loading, error };
}
