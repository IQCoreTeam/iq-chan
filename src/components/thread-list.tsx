"use client";

import Link from "next/link";
import Post from "./post";

const PREVIEW_LENGTH = 200;

export default function ThreadList({
    threads,
    boardId,
}: {
    threads: Record<string, unknown>[];
    boardId: string;
}) {
    return (
        <div className="divide-y divide-gray-300">
            {threads.map((thread) => {
                const no = thread.no as number;
                const com = thread.com as string;
                const truncated =
                    com.length > PREVIEW_LENGTH
                        ? com.slice(0, PREVIEW_LENGTH) + "..."
                        : com;

                return (
                    <Link
                        key={no}
                        href={`/${boardId}/${no}`}
                        className="block hover:bg-[#eef0f7] transition-colors"
                    >
                        <Post
                            no={no}
                            com={truncated}
                            name={thread.name as string}
                            time={thread.time as number}
                            sub={thread.sub as string | undefined}
                            img={thread.img as string | undefined}
                        />
                    </Link>
                );
            })}
        </div>
    );
}
