"use client";

import { useState, useEffect } from "react";
import { resolveBoardSeed, deriveTablePda } from "../lib/constants";
import { getGatewayUrl } from "../lib/config";
import type { BoardMeta } from "../lib/types";

export function useBoardGate(boardId: string): Pick<BoardMeta, "gateMint" | "gateAmount" | "gateType"> & { tableName?: string } {
    const [gate, setGate] = useState<Pick<BoardMeta, "gateMint" | "gateAmount" | "gateType"> & { tableName?: string }>({});

    useEffect(() => {
        if (!boardId) return;
        const seed = resolveBoardSeed(boardId);
        const pda = deriveTablePda(seed);

        fetch(`${getGatewayUrl()}/table/${pda}/meta`)
            .then((res) => res.ok ? res.json() : null)
            .then((meta) => {
                if (!meta) return;
                const mint: string = meta.gate?.mint ?? "";
                const isGated = mint && mint !== "11111111111111111111111111111111";
                setGate({
                    gateMint: isGated ? mint : undefined,
                    gateAmount: isGated ? (meta.gate?.amount ?? 1) : undefined,
                    gateType: isGated ? (meta.gate?.gateType ?? meta.gate?.gate_type ?? 0) : undefined,
                    tableName: meta.name || "",
                });
            })
            .catch(() => {});
    }, [boardId]);

    return gate;
}
