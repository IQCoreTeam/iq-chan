"use client";

import { useState, useEffect } from "react";
import HashLink from "../hash-link";
import { DB_ROOT_KEY } from "../../lib/constants";
import { useBoards } from "../../hooks/use-boards";
import { getFeedPda } from "../../lib/board";
import { fetchAllTableRows } from "../../lib/gateway";
import type { BoardMeta, Post } from "../../lib/types";
import "../../app/home.css";

interface PopularThread {
    boardId: string;
    boardTitle: string;
    threadPda: string;
    sub: string;
    com: string;
    name: string;
    img?: string;
}

function useHomeData(boards: BoardMeta[]) {
    const [totalPosts, setTotalPosts] = useState<number | null>(null);
    const [totalThreads, setTotalThreads] = useState<number | null>(null);
    const [popular, setPopular] = useState<PopularThread[]>([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const feedResults = await Promise.all(
                    boards.map((b) => fetchAllTableRows(getFeedPda(DB_ROOT_KEY, b.id).toBase58()).then((rows) => ({ boardId: b.id, rows }))),
                );
                if (cancelled) return;

                const allRows = feedResults.flatMap((r) => r.rows);
                const threadMap = new Map<string, { boardId: string; op: Post | null; count: number; lastActivity: number }>();

                for (const { boardId, rows } of feedResults) {
                    for (const row of rows) {
                        const post = row as Post;
                        if (!post.threadPda) continue;
                        const time = post.time ?? 0;
                        const existing = threadMap.get(post.threadPda);
                        if (existing) {
                            existing.count++;
                            existing.lastActivity = Math.max(existing.lastActivity, time);
                            if (post.threadSeed && !existing.op) existing.op = post;
                        } else {
                            threadMap.set(post.threadPda, {
                                boardId,
                                op: post.threadSeed ? post : null,
                                count: 1,
                                lastActivity: time,
                            });
                        }
                    }
                }

                setTotalPosts(allRows.length);
                setTotalThreads(threadMap.size);

                const now = Date.now();
                const sorted = [...threadMap.entries()]
                    .filter(([, t]) => t.op?.img)
                    .sort(([, a], [, b]) => {
                        const ageA = (now - a.lastActivity) / 60000 + 5;
                        const ageB = (now - b.lastActivity) / 60000 + 5;
                        return (b.count / ageB) - (a.count / ageA);
                    })
                    .slice(0, 8)
                    .map(([pda, t]) => {
                        const board = boards.find((b) => b.id === t.boardId);
                        return {
                            boardId: t.boardId,
                            boardTitle: board?.title ?? t.boardId,
                            threadPda: pda,
                            sub: t.op!.sub || "",
                            com: t.op!.com || "",
                            name: t.op!.name || "",
                            img: t.op!.img,
                        };
                    });

                setPopular(sorted);
            } catch {}
        }

        load();
        return () => { cancelled = true; };
    }, [boards]);

    return { totalPosts, totalThreads, popular };
}

export default function HomePage() {
    const { boards } = useBoards();
    const { totalPosts, totalThreads, popular } = useHomeData(boards);

    return (
        <div className="fp-wrap">
            <div className="fp-logo">
                <HashLink href="/" title="Home">
                    <img alt="BlockChan" src="/blockchan.webp" width="300" height="120" />
                </HashLink>
            </div>

            <div className="box-outer" id="announce">
                <div className="box-inner">
                    <div className="boxbar">
                        <h2>What is BlockChan?</h2>
                    </div>
                    <div className="boxcontent">
                        <p>
                            BlockChan is a simple on-chain bulletin board where anyone can post
                            comments and share images. There are boards dedicated to a variety
                            of topics, from business and finance to technology, anime, and
                            shitposting. Users do not need to register an account before
                            participating in the community. Just connect a Solana wallet and
                            jump right in!
                        </p>
                        <br />
                        <p>
                            Every post is a Solana transaction. Every thread is an on-chain
                            table. Nothing can be taken down. Feel free to click on a board
                            below that interests you and start posting!
                        </p>
                    </div>
                </div>
            </div>

            <div className="box-outer top-box" id="boards">
                <div className="box-inner">
                    <div className="boxbar">
                        <h2>Boards</h2>
                    </div>
                    <div className="boxcontent">
                        <div className="column">
                            <h3>General</h3>
                            <ul>
                                {boards.map((b) => (
                                    <li key={b.id}>
                                        <HashLink href={`/${b.id}`} className="boardlink">
                                            {b.title}
                                        </HashLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <br className="clear-bug" />
                    </div>
                </div>
            </div>

            <div className="box-outer top-box" id="popular-threads">
                <div className="box-inner">
                    <div className="boxbar">
                        <h2>Popular Threads</h2>
                    </div>
                    <div className="boxcontent">
                        <div id="c-threads">
                            {popular.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "10px", color: "#89a", fontSize: "12px" }}>
                                    No threads yet
                                </div>
                            ) : popular.map((t) => (
                                <div key={t.threadPda} className="c-thread">
                                    <div className="c-board">{t.boardTitle}</div>
                                    <HashLink href={`/${t.boardId}/${t.threadPda}`} className="boardlink">
                                        <img alt="" className="c-thumb" src={t.img} width="150" height="150" style={{ objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).src = "/404.webp"; }} />
                                    </HashLink>
                                    <div className="c-teaser">
                                        {t.name && t.name !== "Anonymous" && <><b className="name">{t.name}</b>: </>}
                                        {t.sub && <b>{t.sub} </b>}
                                        {t.com.slice(0, 120)}{t.com.length > 120 ? "..." : ""}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="box-outer top-box" id="site-stats">
                <div className="box-inner">
                    <div className="boxbar">
                        <h2>Stats</h2>
                    </div>
                    <div className="boxcontent">
                        <div className="stat-cell">
                            <b>Total Posts:</b> {totalPosts !== null ? totalPosts.toLocaleString() : "..."}
                        </div>
                        <div className="stat-cell">
                            <b>Active Threads:</b> {totalThreads !== null ? totalThreads.toLocaleString() : "..."}
                        </div>
                        <div className="stat-cell">
                            <b>Boards:</b> {boards.length}
                        </div>
                    </div>
                </div>
            </div>

            <div id="ft">
                <ul>
                    <li className="fill"></li>
                    <li><HashLink href="/">Home</HashLink></li>
                    <li><a href="https://iqlabs.dev" target="_blank" rel="noopener noreferrer">IQ Labs</a></li>
                    <li><a href="https://x.com/IQLabsOfficial" target="_blank" rel="noopener noreferrer">Twitter</a></li>
                    <li><a href="https://t.me/IQLabsPortal" target="_blank" rel="noopener noreferrer">Telegram</a></li>
                    <li><a href="https://github.com/IQCoreTeam" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                </ul>
                <br className="clear-bug" />
                <div id="copyright">
                    <HashLink href="/about">About</HashLink>
                    {" \u2022 "}
                    <HashLink href="/feedback">Feedback</HashLink>
                    <br /><br />
                    All trademarks and copyrights on this page are owned by their respective parties.
                    Images uploaded are the responsibility of the Poster. All posts are Solana transactions. Powered by IQ Labs.
                </div>
            </div>
        </div>
    );
}
