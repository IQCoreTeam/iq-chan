"use client";

import { createContext, useContext } from "react";
import { OFFICIAL_BOARDS, BOARD_METADATA } from "../lib/constants";
import type { BoardMeta } from "../lib/types";

const officialBoards: BoardMeta[] = OFFICIAL_BOARDS
    .filter((id) => id in BOARD_METADATA)
    .map((id) => {
        const m = BOARD_METADATA[id];
        return { id, seed: m.seed, title: m.title, description: m.description, image: m.image };
    });

function resolveMeta(id: string): BoardMeta | undefined {
    const m = BOARD_METADATA[id];
    if (!m) return undefined;
    return { id, seed: m.seed, title: m.title, description: m.description, image: m.image };
}

const BoardsContext = createContext<{
    boards: BoardMeta[];
    resolveMeta: (id: string) => BoardMeta | undefined;
}>({ boards: officialBoards, resolveMeta });

export function BoardsProvider({ children }: { children: React.ReactNode }) {
    return (
        <BoardsContext.Provider value={{ boards: officialBoards, resolveMeta }}>
            {children}
        </BoardsContext.Provider>
    );
}

export function useBoards() {
    return useContext(BoardsContext);
}
