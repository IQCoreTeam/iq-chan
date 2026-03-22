"use client";

import { useHashRoute } from "../hooks/use-hash-router";
import { BOARDS } from "../lib/constants";
import ErrorBoundary from "../components/error-boundary";
import HomePage from "../components/pages/home-page";
import BoardPage from "../components/pages/board-page";
import ThreadPage from "../components/pages/thread-page";
import AboutPage from "../components/pages/about-page";
import FeedbackPage from "../components/pages/feedback-page";
import NotFoundPage from "../components/pages/not-found-page";

const VALID_BOARD_IDS = new Set(BOARDS.map((b) => b.id));
const STATIC_ROUTES = new Set(["about", "feedback"]);

function AppRouter() {
    const { boardId, threadId, scrollTo } = useHashRoute();

    if (boardId === "about") return <AboutPage />;
    if (boardId === "feedback") return <FeedbackPage />;
    if (boardId && !STATIC_ROUTES.has(boardId) && !VALID_BOARD_IDS.has(boardId)) return <NotFoundPage />;
    if (boardId && threadId) return <ThreadPage boardId={boardId} threadId={threadId} scrollTo={scrollTo} />;
    if (boardId) return <BoardPage boardId={boardId} />;
    return <HomePage />;
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppRouter />
        </ErrorBoundary>
    );
}
