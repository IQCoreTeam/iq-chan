"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { fetchBoards } from "../lib/board";
import { DEFAULT_BOARDS } from "../lib/constants";
import type { BoardMeta } from "../lib/types";

const fallbackBoards: BoardMeta[] = Object.entries(DEFAULT_BOARDS).map(([id, m]) => ({
    id, title: m.title, description: m.description, image: m.image,
}));

const BoardsContext = createContext<{
    boards: BoardMeta[];
    creator: string | null;
    loading: boolean;
}>({ boards: fallbackBoards, creator: null, loading: false });

export function BoardsProvider({ children }: { children: React.ReactNode }) {
    const { connection } = useConnection();
    const [boards, setBoards] = useState<BoardMeta[]>(fallbackBoards);
    const [creator, setCreator] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBoards(connection)
            .then(({ boards: b, creator: c }) => { setBoards(b); setCreator(c); })
            .finally(() => setLoading(false));
    }, [connection]);

    return (
        <BoardsContext.Provider value={{ boards, creator, loading }}>
            {children}
        </BoardsContext.Provider>
    );
}

export function useBoards() {
    return useContext(BoardsContext);
}
