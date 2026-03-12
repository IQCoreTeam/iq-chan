"use client";

import { useBoards } from "../hooks/use-boards";
import BoardList from "../components/board-list";

export default function HomePage() {
    const { boards, loading, error } = useBoards();

    if (loading) return <div className="p-4 text-center text-sm text-gray-500">Loading boards...</div>;
    if (error) return <div className="p-4 text-center text-sm text-red-600">Error: {error.message}</div>;

    return <BoardList boards={boards} />;
}
