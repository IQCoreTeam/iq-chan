"use client";

import Link from "next/link";
import Post from "./post";
import { ThreadEntry } from "../lib/board";

const PREVIEW_LENGTH = 200;

export default function ThreadList({
    threads,
    boardId,
}: {
    threads: ThreadEntry[];
    boardId: string;
}) {
    return (
        <div className="divide-y divide-gray-300">
            {threads.map((thread) => {
                const op = thread.opData;
                if (!op) return null;

                const com = (op.com as string) ?? "";
                const truncated =
                    com.length > PREVIEW_LENGTH
                        ? com.slice(0, PREVIEW_LENGTH) + "..."
                        : com;

                return (
                    <Link
                        key={thread.threadPda}
                        href={`/${boardId}/${thread.threadPda}`}
                        className="block hover:bg-[#eef0f7] transition-colors"
                    >
                        <Post
                            txSig={op.__txSignature as string ?? thread.threadPda}
                            com={truncated}
                            name={op.name as string}
                            time={op.time as number}
                            sub={op.sub as string | undefined}
                            img={op.img as string | undefined}
                            disableLinks
                        />
                    </Link>
                );
            })}
        </div>
    );
}
