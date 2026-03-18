"use client";

import { useState, useEffect } from "react";
import { fetchAllTableRows } from "../lib/gateway";
import { deriveTablePda } from "../lib/constants";
import type { Board } from "../lib/types";

export function useBoards() {
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const pda = deriveTablePda("boards");
                const rows = await fetchAllTableRows(pda);
                if (!cancelled) setBoards(rows as unknown as Board[]);
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
