"use client";

import { lazy, Suspense } from "react";
import { useHashRoute } from "../hooks/use-hash-router";
import { BoardsProvider } from "../hooks/use-boards";
import ErrorBoundary from "../components/error-boundary";
import HomePage from "../components/pages/home-page";
import BoardPage from "../components/pages/board-page";
import ThreadPage from "../components/pages/thread-page";
import AboutPage from "../components/pages/about-page";
import FeedbackPage from "../components/pages/feedback-page";

const AddBoardPage = lazy(() => import("../components/pages/addboard-page"));
const AdminPage = lazy(() => import("../components/pages/admin-page"));

function AppRouter() {
    const { boardId, threadId, scrollTo } = useHashRoute();

    if (boardId === "about") return <AboutPage />;
    if (boardId === "feedback") return <FeedbackPage />;
    if (boardId === "addboard") return <Suspense><AddBoardPage /></Suspense>;
    if (boardId === "admin") return <Suspense><AdminPage /></Suspense>;
    if (boardId && threadId) return <ThreadPage boardId={boardId} threadId={threadId} scrollTo={scrollTo} />;
    if (boardId) return <BoardPage boardId={boardId} />;
    return <HomePage />;
}

export default function App() {
    return (
        <ErrorBoundary>
            <BoardsProvider>
                <AppRouter />
            </BoardsProvider>
        </ErrorBoundary>
    );
}
