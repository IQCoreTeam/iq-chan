"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePaginatedReplies } from "../../../hooks/use-paginated-replies";
import { usePost } from "../../../hooks/use-post";
import { BOARDS } from "../../../lib/constants";
import ThreadDetail from "../../../components/thread-detail";
import PostForm from "../../../components/post-form";
import QuickReply from "../../../components/quick-reply";
import { FooterNav } from "../../../components/board-nav";

export default function ThreadPage() {
    const params = useParams<{ boardId: string; threadId: string }>();
    const boardId = params.boardId;
    const threadPda = params.threadId;
    const [qrOpen, setQrOpen] = useState(false);
    const [qrQuote, setQrQuote] = useState<string | undefined>();

    const {
        op,
        replies,
        page,
        totalPages,
        totalReplies,
        loading,
        error,
        goToPage,
        nextPage,
        prevPage,
        refresh,
    } = usePaginatedReplies(threadPda);

    const { postReply, loading: postLoading } = usePost();

    const boardMeta = BOARDS.find((b) => b.id === boardId);
    const boardTitle = boardMeta ? `/${boardId}/ - ${boardMeta.title}` : `/${boardId}/`;
    const threadSeed = op?.threadSeed ?? "";

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
                        postReply(threadSeed, threadPda, boardId, data)
                    }
                    loading={postLoading}
                />
            )}

            <hr className="desktop" id="op" style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div className="navLinks desktop">
                [<Link href={`/${boardId}`} accessKey="a">Return</Link>]
                {" "}
                [<a href="#bottom">Bottom</a>]
                <div className="thread-stats" style={{ display: "inline", marginLeft: 10 }}>
                    <span data-tip="Replies">{totalReplies}</span>
                    {" / "}
                    <span data-tip="Images">{replies.filter((r) => r.img).length}</span>
                </div>
                {" "}
                [<a href="#" onClick={(e) => { e.preventDefault(); refresh(); }}>Update</a>]
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
                    page={page}
                    totalPages={totalPages}
                    totalReplies={totalReplies}
                    onPageChange={goToPage}
                    onNextPage={nextPage}
                    onPrevPage={prevPage}
                    onRefresh={refresh}
                    loading={loading}
                    onQuote={onQuote}
                />
            )}

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <FooterNav />

            <div id="bottom"></div>

            {qrOpen && threadSeed && (
                <QuickReply
                    threadSig={op?.__txSignature ?? threadPda}
                    onSubmit={(data) => postReply(threadSeed, threadPda, boardId, data)}
                    loading={postLoading}
                    onClose={() => setQrOpen(false)}
                    initialQuote={qrQuote}
                />
            )}
        </>
    );
}
