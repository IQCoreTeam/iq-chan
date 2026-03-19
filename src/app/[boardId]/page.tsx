"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useThreads } from "../../hooks/use-threads";
import { usePost } from "../../hooks/use-post";
import { BOARDS } from "../../lib/constants";
import ThreadList from "../../components/thread-list";
import PostForm from "../../components/post-form";

export default function BoardPage({
    params,
}: {
    params: { boardId: string };
}) {
    const { boardId } = params;
    const [search, setSearch] = useState("");
    const { threads, loading, error, hasMore, loadMore, refresh } = useThreads(boardId);
    const { createThread, loading: postLoading } = usePost();

    const boardMeta = BOARDS.find((b) => b.id === boardId);
    const boardTitle = boardMeta ? `/${boardId}/ - ${boardMeta.title}` : `/${boardId}/`;

    const filteredThreads = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return threads;
        return threads.filter((t) => {
            const op = t.opData;
            if (!op) return false;
            return (op.sub?.toLowerCase().includes(q)) || op.com.toLowerCase().includes(q);
        });
    }, [threads, search]);

    return (
        <>
            <div className="boardBanner">
                <div className="boardTitle">{boardTitle}</div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div className="navLinks">
                [<Link href="/">Home</Link>]
                {" "}
                [<a href="#" onClick={(e) => { e.preventDefault(); refresh(); }}>Refresh</a>]
            </div>

            <div id="ctrl-top" style={{ fontSize: 12, margin: "5px 0" }}>
                <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />
                <input
                    type="text"
                    id="search-box"
                    placeholder="Search OPs\u2026"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ fontSize: 12, padding: "1px 4px", border: "1px solid #aaa", marginRight: 5 }}
                />
            </div>

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

            {loading && filteredThreads.length === 0 ? (
                <div className="loading-text">Loading threads...</div>
            ) : error ? (
                <div className="loading-text" style={{ color: "#d00" }}>Error: {error.message}</div>
            ) : filteredThreads.length === 0 ? (
                <div className="loading-text">No threads yet. Be the first to post!</div>
            ) : (
                <>
                    <ThreadList threads={filteredThreads} boardId={boardId} />
                    {hasMore && (
                        <div style={{ textAlign: "center", padding: 10 }}>
                            <button
                                onClick={loadMore}
                                disabled={loading}
                                style={{ color: "#34345c", background: "none", border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
                            >
                                {loading ? "Loading..." : "[Load More]"}
                            </button>
                        </div>
                    )}
                </>
            )}

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div className="navLinksBot">
                [<Link href="/">Home</Link>]
                {" "}
                [<a href="#top">Top</a>]
            </div>

            <div id="absbot">
                All trademarks and copyrights on this page are owned by their respective parties.
                Images uploaded are the responsibility of the Poster.
                <br />
                <a href="https://iqlabs.dev" target="_blank" rel="noopener noreferrer">About</a>
                {" \u2022 "}
                <a href="https://x.com/IQLabsOfficial" target="_blank" rel="noopener noreferrer">Feedback</a>
                {" \u2022 "}
                <a href="https://github.com/IQCoreTeam" target="_blank" rel="noopener noreferrer">Source</a>
            </div>
        </>
    );
}
