"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import HashLink from "../hash-link";
import { usePaginatedReplies } from "../../hooks/use-paginated-replies";
import { usePost } from "../../hooks/use-post";
import { useThreads } from "../../hooks/use-threads";
import { scrollToPost } from "../../lib/highlight";
import { BOARDS, THREADS_PER_PAGE, BUMP_LIMIT } from "../../lib/constants";
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
    } = usePaginatedReplies(threadPda);

    const { postReply, loading: postLoading } = usePost();

    const { threads: boardThreads } = useThreads(boardId);

    const boardMeta = BOARDS.find((b) => b.id === boardId);
    const boardTitle = boardMeta ? `/${boardId}/ - ${boardMeta.title}` : `/${boardId}/`;
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
        const row = await postReply(threadSeed, threadPda, boardId, data, totalReplies);
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
                        <img alt={boardId} src={boardMeta.image} style={{ maxHeight: 100, display: "block", margin: "0 auto" }} />
                    </div>
                )}
                <div className="boardTitle">{boardTitle}</div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            {threadSeed && (
                <PostForm
                    mode="reply"
                    onSubmit={handlePostReply}
                    loading={postLoading}
                />
            )}

            <hr className="desktop" id="op" style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div className="navLinks desktop" style={{ display: "flex", alignItems: "center" }}>
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
                    <span className="ts-images" title="Images">{replies.filter((r) => r.img).length}</span>
                    {" / "}
                    <span className="ts-page" title="Page">{boardPage}</span>
                </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

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

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div className="navLinks navLinksBot desktop" style={{ position: "relative", display: "flex", alignItems: "center" }}>
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
                    <span className="ts-images" title="Images">{replies.filter((r) => r.img).length}</span>
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
                    onClose={() => setQrOpen(false)}
                    initialQuote={qrQuote}
                />
            )}
        </>
    );
}
