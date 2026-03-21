"use client";

import { useState, useCallback } from "react";
import { hashHref } from "../hooks/use-hash-router";
import HashLink from "./hash-link";
import { ThreadEntry } from "../lib/board";
import Post from "./post";
import QuickReply from "./quick-reply";
import { usePost } from "../hooks/use-post";
import { formatDate } from "../lib/time";

export default function ThreadList({
    threads,
    boardId,
    onRefresh,
}: {
    threads: ThreadEntry[];
    boardId: string;
    onRefresh?: () => void;
}) {
    const [hidden, setHidden] = useState<Set<string>>(new Set());
    const [qrThread, setQrThread] = useState<{ pda: string; seed: string; opSig: string } | null>(null);
    const { postReply, loading: postLoading, status: postStatus } = usePost();

    const handleQuoteOnBoard = useCallback((threadPda: string, threadSeed: string, opSig: string) => (_txSig: string) => {
        setQrThread({ pda: threadPda, seed: threadSeed, opSig });
    }, []);

    return (
        <div className="board">
            {threads.map((thread) => {
                const op = thread.opData;
                if (!op) return null;

                const isHidden = hidden.has(thread.threadPda);
                const omitted = Math.max(0, thread.replyCount - thread.lastReplies.length);
                const threadHref = hashHref(`/${boardId}/${thread.threadPda}`);

                return (
                    <div key={thread.threadPda}>
                        <div className="thread" id={`t${op.__txSignature ?? ""}`}>
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
                                <div className="postInfo desktop" style={{ display: "inline" }}>
                                    {op.sub && <span className="subject">{op.sub}</span>}
                                    {" "}
                                    <span className="nameBlock">
                                        <span className="name">{op.name}</span>
                                        {" "}
                                    </span>
                                    {" "}
                                    <span className="dateTime" data-utc={op.time}>
                                        {formatDate(op.time)}
                                    </span>
                                    {" "}
                                    <span className="postNum desktop">
                                        <a href={threadHref} title="Link to this post">No.</a>
                                        <a href={threadHref} title="Reply to this post">{(op.__txSignature ?? "").slice(0, 8)}</a>
                                    </span>
                                    {" "}
                                    <span style={{ fontSize: 12, color: "#707070" }}>
                                        ({thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"})
                                    </span>
                                </div>
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
                                        replyLink={threadHref}
                                        onQuote={handleQuoteOnBoard(thread.threadPda, op.threadSeed ?? "", op.__txSignature ?? thread.threadPda)}
                                    />

                                    {omitted > 0 && (
                                        <span className="summary">
                                            {omitted} {omitted === 1 ? "reply" : "replies"} omitted.{" "}
                                            <HashLink href={`/${boardId}/${thread.threadPda}`} className="replylink">
                                                Click here
                                            </HashLink>{" "}
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
                                            replyLink={`${threadHref}:p${reply.__txSignature ?? ""}`}
                                            onQuote={handleQuoteOnBoard(thread.threadPda, op.threadSeed ?? "", op.__txSignature ?? thread.threadPda)}
                                        />
                                    ))}
                                </>
                            )}
                        </div>
                        <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />
                    </div>
                );
            })}
            {qrThread && (
                <QuickReply
                    threadSig={qrThread.opSig}
                    initialQuote={qrThread.opSig}
                    onSubmit={(data) =>
                        postReply(qrThread.seed, qrThread.pda, boardId, data).then(() => { setQrThread(null); onRefresh?.(); })
                    }
                    loading={postLoading}
                    statusText={postStatus}
                    onClose={() => setQrThread(null)}
                />
            )}
        </div>
    );
}
