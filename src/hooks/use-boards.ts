"use client";

import { useState, useEffect } from "react";
import { fetchTableIndex, fetchTableSliceBatched } from "../lib/gateway";
import { boardsTableSeed, deriveTablePda } from "../lib/constants";

export function useBoards() {
    const [boards, setBoards] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const pda = deriveTablePda(boardsTableSeed());
                const sigs = await fetchTableIndex(pda);
                if (cancelled) return;
                const rows = await fetchTableSliceBatched(pda, sigs);
                if (!cancelled) setBoards(rows);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, []);

    return { boards, loading, error };
}
