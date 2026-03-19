"use client";

import Link from "next/link";
import { usePaginatedReplies } from "../../../hooks/use-paginated-replies";
import { usePost } from "../../../hooks/use-post";
import { BOARDS } from "../../../lib/constants";
import ThreadDetail from "../../../components/thread-detail";
import PostForm from "../../../components/post-form";

export default function ThreadPage({
    params,
}: {
    params: { boardId: string; threadId: string };
}) {
    const { boardId, threadId: threadPda } = params;

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

    return (
        <>
            <div className="boardBanner">
                <div className="boardTitle">{boardTitle}</div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div className="navLinks">
                [<Link href={`/${boardId}`}>Return</Link>]
                {" "}
                [<a href="#bottom">Bottom</a>]
                {" "}
                [<a href="#" onClick={(e) => { e.preventDefault(); refresh(); }}>Update</a>]
                <span className="thread-stats" style={{ marginLeft: 10 }}>
                    {totalReplies} replies
                </span>
            </div>

            {threadSeed && (
                <PostForm
                    mode="reply"
                    onSubmit={(data: { com: string; name: string; img?: string }) =>
                        postReply(threadSeed, threadPda, boardId, data)
                    }
                    loading={postLoading}
                />
            )}

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
                />
            )}

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div className="navLinksBot">
                [<Link href={`/${boardId}`}>Return</Link>]
                {" "}
                [<a href="#top">Top</a>]
            </div>

            <div id="absbot">
                All posts are Solana transactions. Powered by IQ Labs.
                <br />
                <a href="https://iqlabs.dev" target="_blank" rel="noopener noreferrer">About</a>
                {" \u2022 "}
                <a href="https://x.com/IQLabsOfficial" target="_blank" rel="noopener noreferrer">Feedback</a>
                {" \u2022 "}
                <a href="https://github.com/IQCoreTeam" target="_blank" rel="noopener noreferrer">Source</a>
            </div>

            <div id="bottom"></div>
        </>
    );
}
