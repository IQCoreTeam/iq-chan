"use client";

import { BOARDS } from "../lib/constants";
import BoardList from "../components/board-list";

export default function HomePage() {
    const boards = BOARDS.map((b) => ({ board_id: b.id, title: b.title, description: b.description }));
    return <BoardList boards={boards} />;
}
