"use client";

import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import iqlabs from "iqlabs-sdk";
import { DB_ROOT_ID, resolveBoardSeed } from "../lib/constants";
import { gateFromMeta } from "../lib/board";
import type { BoardMeta } from "../lib/types";

type GateInfo = Pick<BoardMeta, "gateMint" | "gateAmount" | "gateType"> & { tableName?: string };

export function useBoardGate(boardId: string): GateInfo {
    const { connection } = useConnection();
    const [gate, setGate] = useState<GateInfo>({});

    useEffect(() => {
        if (!boardId) return;
        iqlabs.reader.fetchTableMeta(connection, iqlabs.contract.PROGRAM_ID, DB_ROOT_ID, resolveBoardSeed(boardId))
            .then((meta) => setGate({ ...gateFromMeta(meta), tableName: (meta as any).name || "" }))
            .catch(() => {});
    }, [boardId, connection]);

    return gate;
}
