"use client";

import { useState, useEffect } from "react";
import { fetchAllTableRows } from "../../../lib/gateway";
import type { Post } from "../../../lib/types";
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

    // Fetch OP from thread table (sub is non-empty)
    const [op, setOp] = useState<Post | null>(null);
    const [opLoading, setOpLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function loadOp() {
            setOpLoading(true);
            try {
                const rows = await fetchAllTableRows(threadPda, 50);
                if (cancelled) return;
                const opRow = rows.find((r) => r.sub && (r.sub as string).length > 0);
                setOp((opRow as Post) ?? null);
            } catch (e) {
                console.error("[iqchan] Failed to load OP:", e);
            } finally {
                if (!cancelled) setOpLoading(false);
            }
        }
        loadOp();
        return () => { cancelled = true; };
    }, [threadPda]);

    const threadSeed = op?.threadSeed ?? "";

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
    } = usePaginatedReplies(threadPda, threadSeed);

    const { postReply, loading: postLoading } = usePost();

    if (opLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

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
