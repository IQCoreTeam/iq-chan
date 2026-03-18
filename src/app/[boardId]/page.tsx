"use client";

import { useState } from "react";
import { useThreads } from "../../hooks/use-threads";
import { usePost } from "../../hooks/use-post";
import ThreadList from "../../components/thread-list";
import PostForm from "../../components/post-form";

export default function BoardPage({
    params,
}: {
    params: { boardId: string };
}) {
    const { boardId } = params;
    const [showForm, setShowForm] = useState(false);
    const { threads, loading, error, hasMore, loadMore, refresh } = useThreads(boardId);
    const { createThread, loading: postLoading } = usePost();

    if (loading && threads.length === 0) return <div className="p-4 text-center text-sm text-gray-500">Loading threads...</div>;
    if (error) return <div className="p-4 text-center text-sm text-red-600">Error: {error.message}</div>;

    return (
        <>
            {/* ─── Controls ─────────────────────────────────────── */}
            <div className="flex items-center gap-2 mb-3 text-sm">
                <button
                    onClick={refresh}
                    className="text-blue-700 hover:underline"
                >
                    Refresh
                </button>
            </div>

            {/* ─── New thread form ────────────────────────────────── */}
            <button
                onClick={() => setShowForm((v) => !v)}
                className="bg-[#d6daf0] border border-gray-400 px-4 py-1 text-sm hover:bg-[#c9cee6] mb-2"
            >
                {showForm ? "Close" : "Start a New Thread"}
            </button>
            {showForm && (
                <PostForm
                    mode="thread"
                    onSubmit={(data) =>
                        createThread(
                            boardId,
                            data as { sub: string; com: string; name: string; img?: string },
                        )
                    }
                    loading={postLoading}
                />
            )}

            {/* ─── Thread list ────────────────────────────────────── */}
            <div className="mt-4">
                {threads.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                        No threads yet. Be the first to post!
                    </div>
                ) : (
                    <>
                        <ThreadList threads={threads} boardId={boardId} />
                        {hasMore && (
                            <button
                                onClick={loadMore}
                                disabled={loading}
                                className="w-full py-2 text-sm text-blue-700 hover:underline disabled:opacity-40"
                            >
                                {loading ? "Loading..." : "Load More"}
                            </button>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
