"use client";

import { useMemo, useState } from "react";
import type { Post as PostType, Reply } from "../lib/types";
import Post from "./post";


export default function ThreadDetail({
    thread,
    replies,
    loading,
    onQuote,
}: {
    thread?: PostType;
    replies: Reply[];
    loading: boolean;
    onQuote?: (sig: string) => void;
}) {
    const [hiddenPosts, setHiddenPosts] = useState<Set<string>>(new Set());

    function togglePost(sig: string) {
        setHiddenPosts((prev) => {
            const next = new Set(prev);
            if (next.has(sig)) next.delete(sig); else next.add(sig);
            return next;
        });
    }

    const backlinkMap = useMemo(() => {
        const map: Record<string, string[]> = {};
        const allPosts = [...(thread ? [thread] : []), ...replies];
        for (const post of allPosts) {
            const sig = post.__txSignature;
            if (!sig) continue;
            const matches = post.com.match(/>>[A-Za-z0-9]{6,}/g);
            if (!matches) continue;
            for (const match of matches) {
                const targetSig = match.slice(2);
                for (const target of allPosts) {
                    if (target.__txSignature?.startsWith(targetSig)) {
                        if (!map[target.__txSignature]) map[target.__txSignature] = [];
                        if (!map[target.__txSignature].includes(sig)) {
                            map[target.__txSignature].push(sig);
                        }
                    }
                }
            }
        }
        return map;
    }, [thread, replies]);

    return (
        <div className="board">
            <div className="thread">
                {thread && (
                    <Post
                        txSig={thread.__txSignature ?? ""}
                        sub={thread.sub}
                        com={thread.com}
                        name={thread.name}
                        time={thread.time}
                        img={thread.img}
                        isOp
                        backlinks={backlinkMap[thread.__txSignature ?? ""]}
                        onQuote={onQuote}
                    />
                )}
                {loading && replies.length === 0 ? (
                    <div className="loading-text">Loading replies...</div>
                ) : (
                    replies.map((reply, i) => {
                        const sig = reply.__txSignature ?? "";
                        return (
                            <Post
                                key={sig || i}
                                txSig={sig}
                                com={reply.com}
                                name={reply.name}
                                time={reply.time}
                                img={reply.img}
                                backlinks={backlinkMap[sig]}
                                onQuote={onQuote}
                                onHide={() => togglePost(sig)}
                                isHidden={hiddenPosts.has(sig)}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}
