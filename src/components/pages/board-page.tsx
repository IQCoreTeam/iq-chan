"use client";

import { useState, useMemo } from "react";
import HashLink from "../hash-link";
import { useThreads } from "../../hooks/use-threads";
import { usePost } from "../../hooks/use-post";
import { THREADS_PER_PAGE } from "../../lib/constants";
import { useWallet } from "@solana/wallet-adapter-react";
import { useBoards } from "../../hooks/use-boards";
import { useBoardGate } from "../../hooks/use-board-gate";
import { useWalletModal } from "../../lib/wallet-modal";
import ThreadList from "../thread-list";
import PostForm from "../post-form";
import QuickReply from "../quick-reply";
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
    const { publicKey } = useWallet();
    const { openWalletModal } = useWalletModal();
    const { threads, loading, error, hasMore, loadMore, refresh } = useThreads(boardId);
    const { createThread, loading: postLoading, status: postStatus, step: postStep, totalSteps: postTotalSteps, clearStatus } = usePost();
    const [page, setPage] = useState(0);
    const [qrOpen, setQrOpen] = useState(false);

    const { resolveMeta } = useBoards();
    const boardMeta = resolveMeta(boardId);
    const gate = useBoardGate(boardId);
    const displayName = boardMeta?.title ?? gate.tableName ?? "";
    const displaySlug = boardMeta?.id ?? (gate.tableName || boardId);
    const boardTitle = displayName ? `/${displaySlug}/ - ${displayName}` : `/${boardId.slice(0, 12)}${boardId.length > 12 ? "..." : ""}/`;

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
                {boardMeta?.image && (
                    <div className="title" style={{ textAlign: "center" }}>
                        <img alt={boardId} src={boardMeta.image} style={{ maxHeight: 150, display: "block", margin: "0 auto" }} />
                    </div>
                )}
                <div className="boardTitle">{boardTitle}</div>
            </div>

            {gate.gateMint && (
                <div style={{ textAlign: "center", padding: "4px 8px", fontSize: "11px", color: "#789922", background: "#f0e0d6", border: "1px solid #d9bfb7", margin: "4px 0" }}>
                    <div>Token-gated: hold {gate.gateAmount || 1} {gate.gateType === 1 ? "NFT from collection" : "token"} to post</div>
                    <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#707070", marginTop: "2px", wordBreak: "break-all" }}>
                        CA: {gate.gateMint}
                    </div>
                </div>
            )}

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

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
                [<a href="#" onClick={(e) => { e.preventDefault(); if (!publicKey) { openWalletModal(); return; } setQrOpen(true); }}>Start a New Thread</a>]
            </div>
            <div className="desktopPostForm">
                <PostForm
                    mode="thread"
                    onSubmit={(data) =>
                        createThread(
                            boardId,
                            data as { sub: string; com: string; name: string; img?: string },
                            gate.gateMint ? { mint: gate.gateMint, amount: gate.gateAmount || 1, gateType: gate.gateType || 0 } : undefined,
                        )
                    }
                    loading={postLoading}
                    statusText={postStatus}
                    step={postStep}
                    totalSteps={postTotalSteps}
                    onClearStatus={clearStatus}
                />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div className="navLinks desktop">
                [<HashLink href="/">Home</HashLink>]
                {" "}
                [<a href="#" onClick={(e) => { e.preventDefault(); refresh(); setPage(0); }}>Refresh</a>]
                {" "}
                [<a href="#" onClick={(e) => { e.preventDefault(); document.getElementById("bottom")?.scrollIntoView({ behavior: "smooth" }); }}>Bottom</a>]
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            {loading && threads.length === 0 ? (
                <div className="loading-text">Loading threads...</div>
            ) : error ? (
                <div className="loading-text" style={{ color: "#d00" }}>Error: {error.message}</div>
            ) : threads.length === 0 ? (
                <div className="loading-text">No threads yet. Be the first to post!</div>
            ) : (
                <ThreadList threads={pageThreads} boardId={boardId} onRefresh={refresh} />
            )}

            <PageList page={page} totalPages={totalPages} onPage={handlePage} />

            <FooterNav />

            <div id="bottom"></div>

            {qrOpen && (
                <QuickReply
                    threadSig={boardId}
                    mode="thread"
                    onSubmit={(data) =>
                        createThread(
                            boardId,
                            data as { sub: string; com: string; name: string; img?: string },
                            gate.gateMint ? { mint: gate.gateMint, amount: gate.gateAmount || 1, gateType: gate.gateType || 0 } : undefined,
                        )
                    }
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
