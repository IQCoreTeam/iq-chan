"use client";

import { useState } from "react";
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
    const [hidden, setHidden] = useState<Set<string>>(new Set());

    return (
        <div className="board">
            {threads.map((thread) => {
                const op = thread.opData;
                if (!op) return null;

                const isHidden = hidden.has(thread.threadPda);
                const omitted = Math.max(0, thread.replyCount - thread.lastReplies.length);

                return (
                    <div key={thread.threadPda}>
                        <div className="thread" id={`t${(op.__txSignature ?? "").slice(0, 8)}`}>
                            <span
                                className="threadHideButton"
                                title={isHidden ? "Show thread" : "Hide thread"}
                                onClick={() => {
                                    setHidden((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(thread.threadPda)) next.delete(thread.threadPda);
                                        else next.add(thread.threadPda);
                                        return next;
                                    });
                                }}
                                style={{ cursor: "pointer", marginRight: 5, fontSize: 12, color: "#34345c" }}
                            >
                                [{isHidden ? "+" : "-"}]
                            </span>

                            {isHidden ? (
                                <span style={{ fontSize: 12, color: "#707070" }}>
                                    {op.sub ?? "Thread"} ({thread.replyCount} replies)
                                </span>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                        <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />
                    </div>
                );
            })}
        </div>
    );
}
