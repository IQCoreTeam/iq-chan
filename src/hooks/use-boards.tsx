"use client";

import { createContext, useContext } from "react";
import { DEFAULT_BOARDS } from "../lib/constants";
import type { BoardMeta } from "../lib/types";

const boards: BoardMeta[] = Object.entries(DEFAULT_BOARDS).map(([slug, m]) => ({
    id: slug, seed: m.seed, title: m.title, description: m.description, image: m.image,
}));

const BoardsContext = createContext<{
    boards: BoardMeta[];
}>({ boards });

export function BoardsProvider({ children }: { children: React.ReactNode }) {
    return (
        <BoardsContext.Provider value={{ boards }}>
            {children}
        </BoardsContext.Provider>
    );
}

export function useBoards() {
    return useContext(BoardsContext);
}
