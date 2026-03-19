"use client";

import type { Post as PostType, Reply } from "../lib/types";
import Post from "./post";

export default function ThreadDetail({
    thread,
    replies,
    page,
    totalPages,
    totalReplies,
    onPageChange,
    onNextPage,
    onPrevPage,
    onRefresh,
    loading,
}: {
    thread?: PostType;
    replies: Reply[];
    page: number;
    totalPages: number;
    totalReplies: number;
    onPageChange: (page: number) => void;
    onNextPage: () => void;
    onPrevPage: () => void;
    onRefresh: () => void;
    loading: boolean;
}) {
    return (
        <div className="board">
            <div className="thread">
                {thread && (
                    <Post
                        txSig={thread.__txSignature ?? ""}
                        sub={thread.sub}
                        com={thread.com}
                        name={thread.name}
                        time={thread.time}
                        img={thread.img}
                        isOp
                    />
                )}

                {loading && replies.length === 0 ? (
                    <div className="loading-text">Loading replies...</div>
                ) : (
                    replies.map((reply, i) => (
                        <Post
                            key={reply.__txSignature ?? i}
                            txSig={reply.__txSignature ?? ""}
                            com={reply.com}
                            name={reply.name}
                            time={reply.time}
                            img={reply.img}
                        />
                    ))
                )}
            </div>

            <hr style={{ borderTop: "1px solid #b7c5d9", border: "none", borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "#b7c5d9" }} />

            <div className="navLinksBot">
                [<a href="#" onClick={(e) => { e.preventDefault(); onRefresh(); }}>Update</a>]
                {" "}
                <span className="thread-stats">
                    {totalReplies} replies
                </span>

                {totalPages > 1 && (
                    <div className="pagination">
                        <button onClick={onPrevPage} disabled={page === 0 || loading}>[Prev]</button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => onPageChange(i)}
                                disabled={loading}
                                className={i === page ? "current" : ""}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button onClick={onNextPage} disabled={page === totalPages - 1 || loading}>[Next]</button>
                    </div>
                )}
            </div>
        </div>
    );
}
