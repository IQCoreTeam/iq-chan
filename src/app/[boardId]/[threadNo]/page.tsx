// ThreadPage({ params })
//   Thread page — displays OP post and all replies with pagination.
//
// Input: params.boardId (string), params.threadNo (string) — from URL path

"use client";

import { useThreads } from "../../../hooks/use-threads";
import { usePaginatedReplies } from "../../../hooks/use-paginated-replies";
import { usePost } from "../../../hooks/use-post";
import ThreadDetail from "../../../components/thread-detail";
import PostForm from "../../../components/post-form";

export default function ThreadPage({
    params,
}: {
    params: { boardId: string; threadNo: string };
}) {
    const { boardId, threadNo: threadNoStr } = params;
    const threadNo = Number(threadNoStr);

    const { threads } = useThreads(boardId, "catalog");
    const op = threads.find((t) => (t.no as number) === threadNo);

    const {
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
    } = usePaginatedReplies(boardId, threadNo);

    const { postReply, loading: postLoading } = usePost();

    if (loading && replies.length === 0) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <>
            <ThreadDetail
                thread={op as { no: number; sub?: string; com: string; name: string; time: number; img?: string } | undefined}
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
            <PostForm
                mode="reply"
                onSubmit={(data: { com: string; name: string; img?: string }) =>
                    postReply(boardId, threadNo, data)
                }
                loading={postLoading}
            />
        </>
    );
}
