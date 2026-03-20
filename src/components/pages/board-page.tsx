"use client";

import { useState, useMemo } from "react";
import HashLink from "../hash-link";
import { useThreads } from "../../hooks/use-threads";
import { usePost } from "../../hooks/use-post";
import { BOARDS, THREADS_PER_PAGE } from "../../lib/constants";
import ThreadList from "../thread-list";
import PostForm from "../post-form";
import { FooterNav } from "../board-nav";

function PageList({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (n: number) => void }) {
    return (
        <div className="pagelist desktop">
            <div className="prev">
                <span>[{page > 0
                    ? <a href="#" onClick={(e) => { e.preventDefault(); onPage(page - 1); }}>Previous</a>
                    : <span className="muted">Previous</span>
                }]</span>
            </div>
            <div className="pages">
                {Array.from({ length: totalPages }, (_, i) => (
                    <span key={i}>
                        [{i === page
                            ? <strong><a href="#" onClick={(e) => { e.preventDefault(); onPage(i); }}>{i + 1}</a></strong>
                            : <a href="#" onClick={(e) => { e.preventDefault(); onPage(i); }}>{i + 1}</a>
                        }]{" "}
                    </span>
                ))}
            </div>
            <div className="next">
                <span>[{page < totalPages - 1
                    ? <a href="#" onClick={(e) => { e.preventDefault(); onPage(page + 1); }}>Next</a>
                    : <span className="muted">Next</span>
                }]</span>
            </div>
        </div>
    );
}

export default function BoardPage({ boardId }: { boardId: string }) {
    const { threads, loading, error, hasMore, loadMore, refresh } = useThreads(boardId);
    const { createThread, loading: postLoading } = usePost();
    const [page, setPage] = useState(0);

    const boardMeta = BOARDS.find((b) => b.id === boardId);
    const boardTitle = boardMeta ? `/${boardId}/ - ${boardMeta.title}` : `/${boardId}/`;

    const totalPages = Math.max(1, Math.ceil(threads.length / THREADS_PER_PAGE));
    const pageThreads = useMemo(() => {
        const start = page * THREADS_PER_PAGE;
        return threads.slice(start, start + THREADS_PER_PAGE);
    }, [threads, page]);

    function handlePage(n: number) {
        setPage(n);
        if (n >= totalPages - 1 && hasMore) loadMore();
        window.scrollTo(0, 0);
    }

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
                [<HashLink href="/">Home</HashLink>]
                {" "}
                [<a href="#" onClick={(e) => { e.preventDefault(); refresh(); setPage(0); }}>Refresh</a>]
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
                <ThreadList threads={pageThreads} boardId={boardId} />
            )}

            <PageList page={page} totalPages={totalPages} onPage={handlePage} />

            <FooterNav />

            <div id="bottom"></div>
        </>
    );
}
