"use client";

import { useState, useEffect } from "react";
import { getChain } from "../lib/chains";
import type { BoardGate } from "../lib/types";

export function useBoardGate(boardId: string): BoardGate {
    const [gate, setGate] = useState<BoardGate>({});

    useEffect(() => {
        if (!boardId) return;
        let cancelled = false;

        getChain()
            .then((chain) => chain.getBoardGate(boardId))
            .then((g) => { if (!cancelled) setGate(g); })
            .catch(() => {});

        return () => { cancelled = true; };
    }, [boardId]);

    return gate;
}
