"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePaginatedReplies } from "../../../hooks/use-paginated-replies";
import { usePost } from "../../../hooks/use-post";
import { BOARDS } from "../../../lib/constants";
import ThreadDetail from "../../../components/thread-detail";
import PostForm from "../../../components/post-form";
import QuickReply from "../../../components/quick-reply";
import { FooterNav } from "../../../components/board-nav";

const BACKOFF = [10, 15, 20, 30, 60, 90, 120];

export default function ThreadPage() {
    const params = useParams<{ boardId: string; threadId: string }>();
    const boardId = params.boardId;
    const threadPda = params.threadId;
    const [qrOpen, setQrOpen] = useState(false);
    const [qrQuote, setQrQuote] = useState<string | undefined>();
    const [autoUpdate, setAutoUpdate] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const prevCount = useRef(0);

    const {
        op,
        replies,
        page,
        totalReplies,
        loading,
        error,
        refresh,
    } = usePaginatedReplies(threadPda);

    const { postReply, loading: postLoading } = usePost();

    const boardMeta = BOARDS.find((b) => b.id === boardId);
    const boardTitle = boardMeta ? `/${boardId}/ - ${boardMeta.title}` : `/${boardId}/`;
    const threadSeed = op?.threadSeed ?? "";

    // Track reply count changes to reset backoff
    const backoffIdx = useRef(0);

    useEffect(() => {
        if (totalReplies > prevCount.current && prevCount.current > 0) {
            backoffIdx.current = 0;
        }
        prevCount.current = totalReplies;
    }, [totalReplies]);

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
    }, [autoUpdate, refresh]);

    const manualUpdate = useCallback(() => {
        refresh();
        backoffIdx.current = 0;
        setCountdown(BACKOFF[0]);
    }, [refresh]);

    // Refresh after posting — retry once at 3s if first attempt didn't pick it up
    const refreshAfterPost = useCallback(() => {
        const before = prevCount.current;
        setTimeout(() => {
            refresh();
            setTimeout(() => {
                if (prevCount.current <= before) refresh();
            }, 3000);
        }, 1000);
    }, [refresh]);

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
                    onSubmit={(data: { com: string; name: string; img?: string }) =>
                        postReply(threadSeed, threadPda, boardId, data).then(refreshAfterPost)
                    }
                    loading={postLoading}
                />
            )}

            <hr className="desktop" id="op" style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div className="navLinks desktop" style={{ display: "flex", alignItems: "center" }}>
                <div>
                    [<Link href={`/${boardId}`} accessKey="a">Return</Link>]
                    {" "}
                    [<a href="#bottom">Bottom</a>]
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
                    <span className="ts-page" title="Page">{page + 1}</span>
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
                    [<Link href={`/${boardId}`} accessKey="a">Return</Link>]
                    {" "}
                    [<a href="#top">Top</a>]
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
                    <span className="ts-page" title="Page">{page + 1}</span>
                </div>
            </div>

            <FooterNav />

            <div id="bottom"></div>

            {qrOpen && threadSeed && (
                <QuickReply
                    threadSig={op?.__txSignature ?? threadPda}
                    onSubmit={(data) => postReply(threadSeed, threadPda, boardId, data).then(refreshAfterPost)}
                    loading={postLoading}
                    onClose={() => setQrOpen(false)}
                    initialQuote={qrQuote}
                />
            )}
        </>
    );
}
