"use client";

import type { Post as PostType, Reply } from "../lib/types";
import Post from "./post";

export default function ThreadDetail({
    thread,
    replies,
    page,
    totalPages,
    totalReplies,
    onPageChange,
    onNextPage,
    onPrevPage,
    onRefresh,
    loading,
}: {
    thread?: PostType;
    replies: Reply[];
    page: number;
    totalPages: number;
    totalReplies: number;
    onPageChange: (page: number) => void;
    onNextPage: () => void;
    onPrevPage: () => void;
    onRefresh: () => void;
    loading: boolean;
}) {
    return (
        <div>
            {/* ─── OP ─────────────────────────────────────────────── */}
            {thread && (
                <>
                    <Post
                        txSig={thread.__txSignature ?? ""}
                        sub={thread.sub}
                        com={thread.com}
                        name={thread.name}
                        time={thread.time}
                        img={thread.img}
                    />
                    <hr className="border-gray-300" />
                </>
            )}

            {/* ─── Replies ────────────────────────────────────────── */}
            {loading && replies.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                    Loading replies...
                </div>
            ) : (
                replies.map((reply, i) => (
                    <div key={reply.__txSignature ?? i}>
                        <Post
                            txSig={reply.__txSignature ?? ""}
                            com={reply.com}
                            name={reply.name}
                            time={reply.time}
                            img={reply.img}
                        />
                        {i < replies.length - 1 && (
                            <hr className="border-gray-300" />
                        )}
                    </div>
                ))
            )}

            {/* ─── Pagination ─────────────────────────────────────── */}
            {totalPages > 1 && (
                <nav className="mt-4 flex items-center gap-2 px-2 py-2 border-t border-gray-300">
                    <button
                        onClick={onPrevPage}
                        disabled={page === 0 || loading}
                        className="text-sm text-blue-700 hover:underline disabled:opacity-40"
                    >
                        Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => onPageChange(i)}
                            disabled={loading}
                            className={`text-sm ${
                                i === page
                                    ? "font-bold underline"
                                    : "text-blue-700 hover:underline"
                            }`}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        onClick={onNextPage}
                        disabled={page === totalPages - 1 || loading}
                        className="text-sm text-blue-700 hover:underline disabled:opacity-40"
                    >
                        Next
                    </button>

                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="ml-auto text-sm text-blue-700 hover:underline disabled:opacity-40"
                    >
                        Refresh
                    </button>

                    <span className="text-xs text-gray-500">
                        {totalReplies} replies
                    </span>
                </nav>
            )}
        </div>
    );
}
