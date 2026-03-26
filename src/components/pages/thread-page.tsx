"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import HashLink from "../hash-link";
import { usePaginatedReplies } from "../../hooks/use-paginated-replies";
import { usePost } from "../../hooks/use-post";
import { useThreads } from "../../hooks/use-threads";
import { scrollToPost } from "../../lib/highlight";
import { THREADS_PER_PAGE } from "../../lib/constants";
import { useBoards } from "../../hooks/use-boards";
import { useBoardGate } from "../../hooks/use-board-gate";
import ThreadDetail from "../thread-detail";
import PostForm from "../post-form";
import QuickReply from "../quick-reply";
import { FooterNav } from "../board-nav";

const BACKOFF = [10, 15, 20, 30, 60, 90, 120];

export default function ThreadPage({ boardId, threadId: threadPda, scrollTo }: { boardId: string; threadId: string; scrollTo?: string | null }) {
    const [qrOpen, setQrOpen] = useState(false);
    const [qrQuote, setQrQuote] = useState<string | undefined>();
    const [autoUpdate, setAutoUpdate] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const prevCount = useRef(0);

    const {
        op,
        replies,
        totalReplies,
        loading,
        error,
        refresh,
        addOptimisticRow,
    } = usePaginatedReplies(threadPda, boardId);

    const { postReply, loading: postLoading, status: postStatus, step: postStep, totalSteps: postTotalSteps, clearStatus } = usePost();

    const { threads: boardThreads } = useThreads(boardId);

    const { boards } = useBoards();
    const boardMeta = boards.find((b) => b.id === boardId);
    const gate = useBoardGate(boardId);
    const displayName = boardMeta?.title ?? gate.tableName ?? "";
    const displaySlug = boardMeta?.id ?? (gate.tableName || boardId);
    const boardTitle = displayName ? `/${displaySlug}/ - ${displayName}` : `/${boardId.slice(0, 12)}${boardId.length > 12 ? "..." : ""}/`;
    const threadSeed = op?.threadSeed ?? "";

    // Scroll to a specific post when navigating from board page
    const scrolledRef = useRef(false);
    useEffect(() => {
        if (!scrollTo || scrolledRef.current || loading) return;
        if (document.getElementById(`p${scrollTo}`)) {
            scrolledRef.current = true;
            scrollToPost(scrollTo);
        }
    }, [scrollTo, loading, replies]);

    // Which board page this thread is on (like 4chan's page number in stats)
    const boardPage = (() => {
        const idx = boardThreads.findIndex((t) => t.threadPda === threadPda);
        if (idx < 0) return 1;
        return Math.floor(idx / THREADS_PER_PAGE) + 1;
    })();

    const backoffIdx = useRef(0);

    // Reset backoff when new posts arrive
    useEffect(() => {
        if (totalReplies > prevCount.current && prevCount.current > 0) {
            backoffIdx.current = 0;
        }
        prevCount.current = totalReplies;
    }, [totalReplies]);

    // Bump this to restart the interval (used by manualUpdate)
    const [restartKey, setRestartKey] = useState(0);

    // Auto-update with exponential backoff countdown
    useEffect(() => {
        if (!autoUpdate) { setCountdown(0); backoffIdx.current = 0; return; }
        let seconds = BACKOFF[backoffIdx.current];
        setCountdown(seconds);
        const id = setInterval(() => {
            seconds--;
            if (seconds <= 0) {
                refresh();
                backoffIdx.current = Math.min(backoffIdx.current + 1, BACKOFF.length - 1);
                seconds = BACKOFF[backoffIdx.current];
            }
            setCountdown(seconds);
        }, 1000);
        return () => clearInterval(id);
    }, [autoUpdate, refresh, restartKey]);

    const manualUpdate = useCallback(() => {
        refresh();
        if (autoUpdate) {
            backoffIdx.current = 0;
            setRestartKey((k) => k + 1);
        }
    }, [refresh, autoUpdate]);

    // Add row to UI instantly, then refresh from gateway in background
    const handlePostReply = useCallback(async (data: { com: string; name: string; img?: string; options?: string }) => {
        const row = await postReply(threadSeed, threadPda, boardId, data, totalReplies, gate.gateMint ? { mint: gate.gateMint, amount: gate.gateAmount || 1, gateType: gate.gateType || 0 } : undefined);
        if (row) addOptimisticRow(row);
        refresh();
    }, [postReply, threadSeed, threadPda, boardId, totalReplies, addOptimisticRow, refresh]);

    const onQuote = useCallback((sig: string) => {
        setQrQuote(sig);
        setQrOpen(true);
    }, []);

    return (
        <>
            <div className="boardBanner">
                {boardMeta && (
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

            <div className="navLinks mobile" style={{ textAlign: "center", padding: "5px 0" }}>
                <span className="mobileib button">
                    <HashLink href={`/${boardId}`} accessKey="a">Return</HashLink>
                </span>{" "}
                <span className="mobileib button">
                    <a href="#" onClick={(e) => { e.preventDefault(); document.getElementById("bottom")?.scrollIntoView({ behavior: "smooth" }); }}>Bottom</a>
                </span>
                <div className="btn-row" style={{ display: "inline" }}>
                    <span className="mobileib button">
                        <label onClick={manualUpdate} style={{ cursor: "pointer" }}>Update</label>
                    </span>{" "}
                    <span className="mobileib button">
                        <label><input type="checkbox" checked={autoUpdate} onChange={(e) => setAutoUpdate(e.target.checked)} />Auto</label>
                    </span>
                    {countdown > 0 && <span style={{ marginLeft: 3, fontSize: "10pt" }}>{countdown}</span>}
                </div>
            </div>

            {threadSeed && (
                <>
                    <div id="togglePostFormLink" className="mobile" style={{ textAlign: "center", margin: "10px 0" }}>
                        [<a href="#" onClick={(e) => { e.preventDefault(); setQrOpen(true); setQrQuote(undefined); }}>Post a Reply</a>]
                    </div>
                    <div className="desktopPostForm">
                        <PostForm
                            mode="reply"
                            onSubmit={handlePostReply}
                            loading={postLoading}
                            statusText={postStatus}
                            step={postStep}
                            totalSteps={postTotalSteps}
                            onClearStatus={clearStatus}
                        />
                    </div>
                </>
            )}

            <div className="navLinks desktop threadNav">
                <div>
                    [<HashLink href={`/${boardId}`} accessKey="a">Return</HashLink>]
                    {" "}
                    [<a href="#" onClick={(e) => { e.preventDefault(); document.getElementById("bottom")?.scrollIntoView({ behavior: "smooth" }); }}>Bottom</a>]
                    {" "}
                    [<a href="#" onClick={(e) => { e.preventDefault(); manualUpdate(); }}>Update</a>]
                    {" "}
                    [<label><input
                        type="checkbox"
                        title="Fetch new replies automatically"
                        checked={autoUpdate}
                        onChange={(e) => setAutoUpdate(e.target.checked)}
                    />Auto</label>]
                    {countdown > 0 && <span style={{ marginLeft: 3 }}>{countdown}</span>}
                </div>
                <div className="thread-stats" style={{ marginLeft: "auto" }}>
                    <span className="ts-replies" title="Replies">{totalReplies}</span>
                    {" / "}
                    <span className="ts-images" title="Images">{(op?.img ? 1 : 0) + replies.filter((r) => r.img).length}</span>
                    {" / "}
                    <span className="ts-page" title="Page">{boardPage}</span>
                </div>
            </div>

            <hr className="desktop" style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            {loading && !op ? (
                <div className="loading-text">Loading...</div>
            ) : error ? (
                <div className="loading-text" style={{ color: "#d00" }}>Error: {error.message}</div>
            ) : (
                <ThreadDetail
                    thread={op ?? undefined}
                    replies={replies}
                    loading={loading}
                    onQuote={onQuote}
                />
            )}

            {/* Desktop footer */}
            <div className="navLinks navLinksBot desktop threadNav" style={{ position: "relative" }}>
                <div>
                    [<HashLink href={`/${boardId}`} accessKey="a">Return</HashLink>]
                    {" "}
                    [<a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Top</a>]
                    {" "}
                    [<a href="#" onClick={(e) => { e.preventDefault(); manualUpdate(); }}>Update</a>]
                    {" "}
                    [<label><input
                        type="checkbox"
                        title="Fetch new replies automatically"
                        checked={autoUpdate}
                        onChange={(e) => setAutoUpdate(e.target.checked)}
                    />Auto</label>]
                    {countdown > 0 && <span style={{ marginLeft: 3 }}>{countdown}</span>}
                </div>
                <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: "110%" }}>
                    [<a href="#" onClick={(e) => { e.preventDefault(); setQrOpen(true); }} style={{ color: "#34345c", textDecoration: "none" }}>Post a Reply</a>]
                </div>
                <div className="thread-stats" style={{ marginLeft: "auto" }}>
                    <span className="ts-replies" title="Replies">{totalReplies}</span>
                    {" / "}
                    <span className="ts-images" title="Images">{(op?.img ? 1 : 0) + replies.filter((r) => r.img).length}</span>
                    {" / "}
                    <span className="ts-page" title="Page">{boardPage}</span>
                </div>
            </div>

            {/* Mobile footer */}
            <div className="mobileThreadFooter mobile">
                <div className="mobile center">
                    <a className="mobilePostFormToggle button" href="#" onClick={(e) => { e.preventDefault(); setQrOpen(true); }}>Post a Reply</a>
                </div>

                <div className="navLinks mobile">
                    <span className="mobileib button"><HashLink href={`/${boardId}`} accessKey="a">Return</HashLink></span>
                    {" "}
                    <span className="mobileib button"><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Top</a></span>
                    <div className="btn-row">
                        <span className="mobileib button"><label onClick={manualUpdate}>Update</label></span>
                        {" "}
                        <span className="mobileib button">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={autoUpdate}
                                    onChange={(e) => setAutoUpdate(e.target.checked)}
                                />Auto
                            </label>
                        </span>
                        {countdown > 0 && <span className="mobile-tu-status">{countdown}s</span>}
                    </div>
                </div>

                <div className="thread-stats mobile">
                    <span className="ts-replies" title="Replies">{totalReplies}</span>
                    {" / "}
                    <span className="ts-images" title="Images">{(op?.img ? 1 : 0) + replies.filter((r) => r.img).length}</span>
                    {" / "}
                    <span className="ts-page" title="Page">{boardPage}</span>
                </div>
            </div>

            <FooterNav />

            <div id="bottom"></div>

            {qrOpen && threadSeed && (
                <QuickReply
                    threadSig={op?.__txSignature ?? threadPda}
                    onSubmit={handlePostReply}
                    loading={postLoading}
                    statusText={postStatus}
                    step={postStep}
                    totalSteps={postTotalSteps}
                    onClose={() => setQrOpen(false)}
                    initialQuote={qrQuote}
                    onClearStatus={clearStatus}
                />
            )}
        </>
    );
}
