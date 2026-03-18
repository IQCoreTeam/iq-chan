"use client";

import Link from "next/link";
import type { Board } from "../lib/types";

export default function BoardList({
    boards,
}: {
    boards: Board[];
}) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {boards.map((board) => (
                <Link
                    key={board.board_id}
                    href={`/${board.board_id}`}
                    className="block border border-gray-300 bg-[#d6daf0] p-3 rounded hover:bg-[#c9cee8] transition-colors"
                >
                    <div className="font-bold">{board.title}</div>
                    <div className="text-xs text-gray-500">/{board.board_id}/</div>
                    <div className="text-sm mt-1 text-gray-700 line-clamp-2">
                        {board.description}
                    </div>
                </Link>
            ))}
        </div>
    );
}
