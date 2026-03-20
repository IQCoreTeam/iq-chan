"use client";

import { useHashRoute } from "../hooks/use-hash-router";
import HomePage from "../components/pages/home-page";
import BoardPage from "../components/pages/board-page";
import ThreadPage from "../components/pages/thread-page";

export default function App() {
    const { boardId, threadId } = useHashRoute();

    if (boardId && threadId) return <ThreadPage boardId={boardId} threadId={threadId} />;
    if (boardId) return <BoardPage boardId={boardId} />;
    return <HomePage />;
}
