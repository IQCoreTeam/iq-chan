"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useThreads } from "../../hooks/use-threads";
import { usePost } from "../../hooks/use-post";
import { BOARDS } from "../../lib/constants";
import ThreadList from "../../components/thread-list";
import PostForm from "../../components/post-form";
import { FooterNav } from "../../components/board-nav";

export default function BoardPage() {
    const { boardId } = useParams<{ boardId: string }>();
    const { threads, loading, error, hasMore, loadMore, refresh } = useThreads(boardId);
    const { createThread, loading: postLoading } = usePost();

    const boardMeta = BOARDS.find((b) => b.id === boardId);
    const boardTitle = boardMeta ? `/${boardId}/ - ${boardMeta.title}` : `/${boardId}/`;

    return (
        <>
            <div className="boardBanner">
                {boardMeta && (
                    <div className="title" style={{ textAlign: "center" }}>
                        <img alt={boardId} src={boardMeta.image} style={{ maxHeight: 100, display: "block", margin: "0 auto" }} />
                    </div>
                )}
                <div className="boardTitle">{boardTitle}</div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <PostForm
                mode="thread"
                onSubmit={(data) =>
                    createThread(
                        boardId,
                        data as { sub: string; com: string; name: string; img?: string },
                    )
                }
                loading={postLoading}
            />

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div className="navLinks desktop">
                [<Link href="/">Home</Link>]
                {" "}
                [<a href="#" onClick={(e) => { e.preventDefault(); refresh(); }}>Refresh</a>]
                {" "}
                [<a href="#bottom">Bottom</a>]
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            {loading && threads.length === 0 ? (
                <div className="loading-text">Loading threads...</div>
            ) : error ? (
                <div className="loading-text" style={{ color: "#d00" }}>Error: {error.message}</div>
            ) : threads.length === 0 ? (
                <div className="loading-text">No threads yet. Be the first to post!</div>
            ) : (
                <>
                    <ThreadList threads={threads} boardId={boardId} />
                    {hasMore && (
                        <div className="pagelist" style={{ textAlign: "center", padding: 10, fontSize: 13 }}>
                            <button
                                onClick={loadMore}
                                disabled={loading}
                                style={{ color: "#34345c", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
                            >
                                {loading ? "Loading..." : "[Next]"}
                            </button>
                        </div>
                    )}
                </>
            )}

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <FooterNav />

            <div id="bottom"></div>
        </>
    );
}
