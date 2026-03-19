"use client";

import Link from "next/link";
import { ThreadEntry } from "../lib/board";
import Post from "./post";

export default function ThreadList({
    threads,
    boardId,
}: {
    threads: ThreadEntry[];
    boardId: string;
}) {
    return (
        <div className="board">
            {threads.map((thread) => {
                const op = thread.opData;
                if (!op) return null;

                const omitted = Math.max(0, thread.replyCount - thread.lastReplies.length);

                return (
                    <div key={thread.threadPda}>
                        <div className="thread" id={`t${(op.__txSignature ?? "").slice(0, 8)}`}>
                            <Post
                                txSig={op.__txSignature ?? thread.threadPda}
                                sub={op.sub}
                                com={op.com}
                                name={op.name}
                                time={op.time}
                                img={op.img}
                                isOp
                                replyLink={`/${boardId}/${thread.threadPda}`}
                            />

                            {omitted > 0 && (
                                <span className="summary">
                                    {omitted} {omitted === 1 ? "reply" : "replies"} omitted.{" "}
                                    <Link href={`/${boardId}/${thread.threadPda}`} className="replylink">
                                        Click here
                                    </Link>{" "}
                                    to view.
                                </span>
                            )}

                            {thread.lastReplies.map((reply, i) => (
                                <Post
                                    key={reply.__txSignature ?? i}
                                    txSig={reply.__txSignature ?? ""}
                                    com={reply.com}
                                    name={reply.name}
                                    time={reply.time}
                                    img={reply.img}
                                />
                            ))}
                        </div>
                        <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />
                    </div>
                );
            })}
        </div>
    );
}
