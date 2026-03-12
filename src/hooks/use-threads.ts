"use client";

import { useState, useEffect } from "react";
import { Connection } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { fetchAllTableRows } from "../lib/gateway";
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

                console.log("[iqchan:useThreads] ──────────────────────────");
                console.log("[iqchan:useThreads] boardId:", boardId, "| mode:", mode);
                console.log("[iqchan:useThreads] threadsTablePda:", pda);

                // Use /rows endpoint (real-time) instead of /index (has caching issues)
                const rows = await fetchAllTableRows(pda);
                if (cancelled) return;

                console.log("[iqchan:useThreads] got", rows.length, "threads from /rows");

                if (rows.length === 0) {
                    console.log("[iqchan:useThreads] ⚠️ No threads → showing 'No threads yet'");
                    if (!cancelled) setThreads([]);
                    return;
                }

                if (mode === "catalog") {
                    // ─── Catalog: creation order (rows already in order) ──
                    if (!cancelled) setThreads(rows);
                } else {
                    // ─── Bump: activity order ─────────────────────────────
                    const feedPda = getFeedPda(getDbRootKey(), boardId);
                    const connection = new Connection(iqlabs.getRpcUrl());
                    console.log("[iqchan:useThreads] bump mode → feedPda:", feedPda.toBase58());
                    const threadNos = await fetchBumpOrderedThreadNos(connection, feedPda);
                    console.log("[iqchan:useThreads] bump threadNos:", threadNos);

                    if (cancelled || threadNos.length === 0) {
                        console.log("[iqchan:useThreads] ⚠️ Feed empty, falling back to creation order");
                        if (!cancelled) setThreads(rows);
                        return;
                    }

                    // Reorder by bump order
                    const byNo = new Map(rows.map((r) => [r.no as number, r]));
                    const ordered = threadNos
                        .map((no) => byNo.get(no))
                        .filter(Boolean) as Record<string, unknown>[];

                    console.log("[iqchan:useThreads] bump → ordered:", ordered.length);
                    if (!cancelled) setThreads(ordered);
                }
            } catch (e) {
                console.error("[iqchan:useThreads] ❌ FAILED:", e);
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
