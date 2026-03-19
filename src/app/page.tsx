"use client";

import { BOARDS } from "../lib/constants";
import BoardList from "../components/board-list";

const BOARD_META: Record<string, { title: string; description: string }> = {
    po: { title: "Politically Incorrect", description: "Political discussion" },
    biz: { title: "Business & Finance", description: "Business and finance discussion" },
    a: { title: "Anime & Manga", description: "Anime and manga discussion" },
    g: { title: "Technology", description: "Technology discussion" },
};

export default function HomePage() {
    const boards = BOARDS.map((id) => ({
        board_id: id,
        title: BOARD_META[id]?.title ?? `/${id}/`,
        description: BOARD_META[id]?.description ?? "",
    }));

    return <BoardList boards={boards} />;
}
