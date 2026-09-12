"use client";

import { useState, useMemo, useCallback } from "react";
import HashLink from "../hash-link";
import { useThreads } from "../../hooks/use-threads";
import { usePost } from "../../hooks/use-post";
import { THREADS_PER_PAGE, formatBoardTitle, getRandomBanner } from "../../lib/board-config";
import { useChainWallet } from "../../lib/chains/context";
import { useBoards } from "../../hooks/use-boards";
import { useBoardGate } from "../../hooks/use-board-gate";
import ThreadList from "../thread-list";
import PostForm from "../post-form";
import QuickReply from "../quick-reply";
import { FooterNav } from "../board-nav";
import GateNotice from "../gate-notice";

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
    const { address, connect } = useChainWallet();
    const { threads, loading, error, refresh, addConfirmedThread, addConfirmedReply } = useThreads(boardId);
    const { createThread, loading: postLoading, status: postStatus, step: postStep, totalSteps: postTotalSteps, clearStatus } = usePost();
    const [page, setPage] = useState(0);
    const [qrOpen, setQrOpen] = useState(false);

    const { resolveMeta } = useBoards();
    const boardMeta = resolveMeta(boardId);
    const gate = useBoardGate(boardId);
    const displayName = boardMeta?.title ?? gate.tableName ?? "";
    const displaySlug = boardMeta?.id ?? boardId;
    const [bannerSrc] = useState(() => getRandomBanner());
    const boardTitle = formatBoardTitle(boardId, displaySlug, displayName);

    // Show the confirmed OP even when notification or gateway indexing lags.
    const handleCreateThread = useCallback(async (
        data: { sub: string; com: string; name: string; img?: string },
    ) => {
        const row = await createThread(
            boardId,
            data,
            gate.gateMint ? { mint: gate.gateMint, amount: gate.gateAmount || 1, gateType: gate.gateType || 0 } : undefined,
        );
        addConfirmedThread(row);
        setPage(0);
        refresh();
    }, [createThread, boardId, gate.gateMint, gate.gateAmount, gate.gateType, refresh, addConfirmedThread]);

    const totalPages = Math.max(1, Math.ceil(threads.length / THREADS_PER_PAGE));
    const pageThreads = useMemo(() => {
        const start = page * THREADS_PER_PAGE;
        return threads.slice(start, start + THREADS_PER_PAGE);
    }, [threads, page]);

    function handlePage(n: number) {
        setPage(n);
        window.scrollTo(0, 0);
    }

    return (
        <>
            <div className="boardBanner">
                {(boardMeta?.image || bannerSrc) && (
                    <div className="title" style={{ textAlign: "center" }}>
                        <HashLink href="/" title="Home">
                            <img alt={boardId} src={boardMeta?.image || bannerSrc} style={{ maxHeight: 150, display: "block", margin: "0 auto", cursor: "pointer" }} />
                        </HashLink>
                    </div>
                )}
                <div className="boardTitle">{boardTitle}</div>
            </div>

            {gate.gateMint && <GateNotice gate={gate} />}

            <hr style={{ border: "none", borderTop: "1px solid var(--edge)" }} />

            <div className="navLinks mobile" style={{ textAlign: "center", padding: "5px 0" }}>
                <span className="mobileib button">
                    <HashLink href="/">Return</HashLink>
                </span>{" "}
                <span className="mobileib button">
                    <a href="#" onClick={(e) => { e.preventDefault(); document.getElementById("bottom")?.scrollIntoView({ behavior: "smooth" }); }}>Bottom</a>
                </span>{" "}
                <span className="mobileib button">
                    <label onClick={() => refresh()} style={{ cursor: "pointer" }}>Refresh</label>
                </span>
            </div>

            <div id="togglePostFormLink" className="mobile" style={{ textAlign: "center", margin: "10px 0" }}>
                [<a href="#" onClick={(e) => { e.preventDefault(); if (!address) { connect(); return; } setQrOpen(true); }}>Start a New Thread</a>]
            </div>
            <div className="desktopPostForm">
                <PostForm
                    mode="thread"
                    onSubmit={(data) => handleCreateThread(data as { sub: string; com: string; name: string; img?: string })}
                    loading={postLoading}
                    statusText={qrOpen ? "" : postStatus}
                    step={postStep}
                    totalSteps={postTotalSteps}
                    onClearStatus={clearStatus}
                />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--edge)" }} />

            <div className="navLinks desktop">
                [<HashLink href="/">Home</HashLink>]
                {" "}
                [<a href="#" onClick={(e) => { e.preventDefault(); refresh(); setPage(0); }}>Refresh</a>]
                {" "}
                [<a href="#" onClick={(e) => { e.preventDefault(); document.getElementById("bottom")?.scrollIntoView({ behavior: "smooth" }); }}>Bottom</a>]
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--edge)" }} />

            {error && threads.length > 0 && <p role="status">Could not refresh the board. Showing available posts.</p>}
            {loading && threads.length === 0 ? (
                <div className="loading-text">Loading threads...</div>
            ) : error && threads.length === 0 ? (
                <div className="loading-text" style={{ color: "#d00" }}>Error: {error.message}</div>
            ) : threads.length === 0 ? (
                <div className="loading-text">No threads yet. Be the first to post!</div>
            ) : (
                <ThreadList threads={pageThreads} boardId={boardId} onRefresh={refresh} onConfirmedReply={addConfirmedReply} />
            )}

            <PageList page={page} totalPages={totalPages} onPage={handlePage} />

            <FooterNav />

            <div id="bottom"></div>

            {qrOpen && (
                <QuickReply
                    threadSig={boardId}
                    mode="thread"
                    onSubmit={(data) => handleCreateThread(data as { sub: string; com: string; name: string; img?: string })}
                    loading={postLoading}
                    statusText={postStatus}
                    step={postStep}
                    totalSteps={postTotalSteps}
                    onClose={() => setQrOpen(false)}
                    onClearStatus={clearStatus}
                />
            )}
        </>
    );
}
