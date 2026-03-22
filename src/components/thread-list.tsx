"use client";

import { useState, useCallback } from "react";
import { hashHref } from "../hooks/use-hash-router";
import HashLink from "./hash-link";
import { ThreadEntry } from "../lib/board";
import Post from "./post";
import QuickReply from "./quick-reply";
import { usePost } from "../hooks/use-post";

export default function ThreadList({
    threads,
    boardId,
    onRefresh,
}: {
    threads: ThreadEntry[];
    boardId: string;
    onRefresh?: () => void;
}) {
    const [hiddenThreads, setHiddenThreads] = useState<Set<string>>(new Set());
    const [hiddenPosts, setHiddenPosts] = useState<Set<string>>(new Set());
    const [qrThread, setQrThread] = useState<{ pda: string; seed: string; opSig: string } | null>(null);
    const { postReply, loading: postLoading, status: postStatus, step: postStep, totalSteps: postTotalSteps, clearStatus } = usePost();

    const handleQuoteOnBoard = useCallback((threadPda: string, threadSeed: string, opSig: string) => (_txSig: string) => {
        setQrThread({ pda: threadPda, seed: threadSeed, opSig });
    }, []);

    function toggleThread(pda: string) {
        setHiddenThreads((prev) => {
            const next = new Set(prev);
            if (next.has(pda)) next.delete(pda); else next.add(pda);
            return next;
        });
    }

    function togglePost(sig: string) {
        setHiddenPosts((prev) => {
            const next = new Set(prev);
            if (next.has(sig)) next.delete(sig); else next.add(sig);
            return next;
        });
    }

    return (
        <div className="board">
            {threads.map((thread) => {
                const op = thread.opData;
                if (!op) return null;

                const isThreadHidden = hiddenThreads.has(thread.threadPda);
                const omitted = Math.max(0, thread.replyCount - thread.lastReplies.length);
                const threadHref = hashHref(`/${boardId}/${thread.threadPda}`);

                return (
                    <div key={thread.threadPda}>
                        <div className="thread" id={`t${op.__txSignature ?? ""}`}>
                            <span
                                className="threadHideButton"
                                title={isThreadHidden ? "Show thread" : "Hide thread"}
                                onClick={() => toggleThread(thread.threadPda)}
                                style={{ cursor: "pointer", marginRight: 5, fontSize: 12, color: "#34345c" }}
                            >
                                [{isThreadHidden ? "+" : "-"}]
                            </span>

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
                                onHide={() => toggleThread(thread.threadPda)}
                                isHidden={isThreadHidden}
                            />

                            {!isThreadHidden && (
                                <>
                                    <div className="postLink mobile">
                                        <span className="info">
                                            {thread.replyCount} {thread.replyCount === 1 ? "Reply" : "Replies"}
                                            {" / "}
                                            {(op.img ? 1 : 0) + thread.lastReplies.filter((r) => r.img).length} Images
                                        </span>
                                        <HashLink href={`/${boardId}/${thread.threadPda}`} className="button">View Thread</HashLink>
                                    </div>

                                    {omitted > 0 && (
                                        <span className="summary desktop">
                                            {omitted} {omitted === 1 ? "reply" : "replies"} omitted.{" "}
                                            <HashLink href={`/${boardId}/${thread.threadPda}`} className="replylink">
                                                Click here
                                            </HashLink>{" "}
                                            to view.
                                        </span>
                                    )}

                                    {thread.lastReplies.map((reply, i) => {
                                        const sig = reply.__txSignature ?? "";
                                        return (
                                            <Post
                                                key={sig || i}
                                                txSig={sig}
                                                com={reply.com}
                                                name={reply.name}
                                                time={reply.time}
                                                img={reply.img}
                                                replyLink={`${threadHref}:p${sig}`}
                                                onQuote={handleQuoteOnBoard(thread.threadPda, op.threadSeed ?? "", op.__txSignature ?? thread.threadPda)}
                                                onHide={() => togglePost(sig)}
                                                isHidden={hiddenPosts.has(sig)}
                                            />
                                        );
                                    })}
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
                    step={postStep}
                    totalSteps={postTotalSteps}
                    onClose={() => setQrThread(null)}
                    onClearStatus={clearStatus}
                />
            )}
        </div>
    );
}
