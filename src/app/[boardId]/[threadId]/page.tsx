"use client";

import { usePaginatedReplies } from "../../../hooks/use-paginated-replies";
import { usePost } from "../../../hooks/use-post";
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

    if (loading && !op) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    const threadSeed = op?.threadSeed ?? "";

    return (
        <>
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
            {threadSeed && (
                <PostForm
                    mode="reply"
                    onSubmit={(data: { com: string; name: string; img?: string }) =>
                        postReply(threadSeed, threadPda, boardId, data)
                    }
                    loading={postLoading}
                />
            )}
        </>
    );
}
