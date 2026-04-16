"use client";

import { useState, useEffect } from "react";
import HashLink from "../hash-link";
import { DB_ROOT_KEY, getRandomBanner, NO_IMAGE_PLACEHOLDERS } from "../../lib/constants";
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
    fallbackImg: string;
}

function toDisplayThread(pda: string, t: { boardId: string; op: Post; count: number }, boards: BoardMeta[], fallbackImg: string): PopularThread {
    const board = boards.find((b) => b.id === t.boardId);
    return {
        boardId: t.boardId,
        boardTitle: board?.title ?? t.boardId,
        threadPda: pda,
        sub: t.op.sub || "",
        com: t.op.com || "",
        name: t.op.name || "",
        img: t.op.img || fallbackImg,
        fallbackImg,
    };
}

function useHomeData(boards: BoardMeta[]) {
    const [totalPosts, setTotalPosts] = useState<number | null>(null);
    const [totalThreads, setTotalThreads] = useState<number | null>(null);
    const [popular, setPopular] = useState<PopularThread[]>([]);
    const [trendingCount, setTrendingCount] = useState(0);
    const [allThreads, setAllThreads] = useState<{ boardId: string; threadPda: string }[]>([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const feedResults = await Promise.all(
                    boards.map((b) => fetchAllTableRows(getFeedPda(DB_ROOT_KEY, b.seed).toBase58(), 50).then((rows) => ({ boardId: b.id, rows }))),
                );
                if (cancelled) return;

                const threadMap = new Map<string, { boardId: string; op: Post | null; count: number; lastActivity: number }>();
                let totalPostCount = 0;

                for (const { boardId, rows } of feedResults) {
                    totalPostCount += rows.length;
                    for (const row of rows) {
                        const post = row as Post;
                        if (!post.threadPda) continue;
                        const time = post.time ?? 0;
                        const existing = threadMap.get(post.threadPda);
                        if (existing) {
                            existing.count++;
                            existing.lastActivity = Math.max(existing.lastActivity, time);
                            // Pick the canonical OP: replies also carry threadSeed (bump rows),
                            // so prefer a candidate with a non-empty sub; if tied, prefer the
                            // earliest time (OP posted before replies).
                            if (post.threadSeed) {
                                const cur = existing.op;
                                const newHasSub = !!post.sub;
                                const curHasSub = !!cur?.sub;
                                if (!cur) {
                                    existing.op = post;
                                } else if (newHasSub && !curHasSub) {
                                    existing.op = post;
                                } else if (newHasSub === curHasSub && post.time < cur.time) {
                                    existing.op = post;
                                }
                            }
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

                setTotalPosts(totalPostCount);
                setTotalThreads(threadMap.size);

                const withOp = [...threadMap.entries()]
                    .filter(([, t]) => t.op) as [string, { boardId: string; op: Post; count: number; lastActivity: number }][];

                setAllThreads(withOp.map(([pda, t]) => ({ boardId: t.boardId, threadPda: pda })));

                // Top 4 trending: image threads first, then by hot score.
                // Hot score: gentle age decay + recency boost. post.time / lastActivity
                // are stored as unix seconds, so convert to hours vs Date.now() (ms).
                //   count / (ageHours + 2)   → linear reply rate, old threads decay
                //   0.5 / (idleHours + 1)    → mild boost for actively-bumped threads
                // Not super aggressive: a popular 3-day-old thread with recent activity
                // still competes with a fresh low-reply thread.
                const now = Date.now();
                const hotScore = (t: { op: Post; count: number; lastActivity: number }) => {
                    const ageHours = Math.max(0, (now - (t.op.time ?? 0) * 1000) / 3600000);
                    const idleHours = Math.max(0, (now - t.lastActivity * 1000) / 3600000);
                    return t.count / (ageHours + 2) + 0.5 / (idleHours + 1);
                };
                const trending = [...withOp]
                    .sort(([, a], [, b]) => {
                        const aImg = a.op.img ? 1 : 0;
                        const bImg = b.op.img ? 1 : 0;
                        if (aImg !== bImg) return bImg - aImg;
                        return hotScore(b) - hotScore(a);
                    })
                    .slice(0, 4);

                // Fill remaining slots (up to 8) with recent, image-first then by time
                const trendingPdas = new Set(trending.map(([pda]) => pda));
                const recentArr = [...withOp]
                    .filter(([pda]) => !trendingPdas.has(pda))
                    .sort(([, a], [, b]) => {
                        const aImg = a.op.img ? 1 : 0;
                        const bImg = b.op.img ? 1 : 0;
                        if (aImg !== bImg) return bImg - aImg;
                        return b.lastActivity - a.lastActivity;
                    })
                    .slice(0, 8 - trending.length);

                // Assign unique placeholders to no-image threads first
                const all = [...trending, ...recentArr];
                const shuffled = [...NO_IMAGE_PLACEHOLDERS].sort(() => Math.random() - 0.5);
                const noImgIndices = all.map(([, t], i) => t.op.img ? -1 : i).filter((i) => i >= 0);
                const fallbacks: string[] = new Array(all.length).fill(shuffled[0]);
                noImgIndices.forEach((idx, i) => { fallbacks[idx] = shuffled[i % shuffled.length]; });
                // Fill image threads with whatever's left (only used if their URL breaks)
                let fi = noImgIndices.length;
                all.forEach(([, t], i) => { if (t.op.img) fallbacks[i] = shuffled[fi++ % shuffled.length]; });
                const combined = all.map(([pda, t], i) => toDisplayThread(pda, t, boards, fallbacks[i]));

                setTrendingCount(trending.length);
                setPopular(combined);
            } catch {}
        }

        load();
        return () => { cancelled = true; };
    }, [boards]);

    return { totalPosts, totalThreads, popular, trendingCount, allThreads };
}

export default function HomePage() {
    const { boards } = useBoards();
    const { totalPosts, totalThreads, popular, trendingCount, allThreads } = useHomeData(boards);
    const [bannerSrc, setBannerSrc] = useState("");
    useEffect(() => { setBannerSrc(getRandomBanner()); }, []);
    const [aboutClosed, setAboutClosed] = useState(false);
    useEffect(() => { if (sessionStorage.getItem("blockchan_about_closed") === "1") setAboutClosed(true); }, []);
    const [luckyHref, setLuckyHref] = useState(`/${boards[0]?.id ?? "po"}`);
    useEffect(() => {
        if (allThreads.length > 0) {
            const t = allThreads[Math.floor(Math.random() * allThreads.length)];
            setLuckyHref(`/${t.boardId}/${t.threadPda}`);
        }
    }, [allThreads]);

    return (
        <div className="fp-wrap">
            <div className="fp-logo">
                <HashLink href="/" title="Home">
                    <img alt="BlockChan" src="/blockchan.webp" width="300" height="120" />
                </HashLink>
            </div>

            {!aboutClosed && <div className="box-outer" id="announce">
                <div className="box-inner">
                    <div className="boxbar">
                        <h2>What is BlockChan?</h2>
                        <a href="#" className="closebutton" onClick={(e) => { e.preventDefault(); sessionStorage.setItem("blockchan_about_closed", "1"); setAboutClosed(true); }}>X</a>
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
                        <p style={{ marginTop: 8 }}>
                            Every post is a Solana transaction. Every thread is an on-chain
                            table. Nothing can be taken down. Feel free to click on a board
                            below that interests you and start posting! Check out the{" "}
                            <HashLink href="/about">About</HashLink> page to learn more, or leave{" "}
                            <HashLink href="/feedback">Feedback</HashLink>.
                        </p>
                    </div>
                </div>
            </div>}

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

            {bannerSrc && (
                <div className="box-outer top-box">
                    <div className="box-inner">
                        <div className="boxbar">
                            <h2>Want to go to a random thread?</h2>
                        </div>
                        <div className="boxcontent fp-banner">
                            <HashLink href={luckyHref}>
                                <img alt="banner" src={bannerSrc} />
                                <div className="fp-lucky">I&apos;m Feeling Lucky</div>
                            </HashLink>
                        </div>
                    </div>
                </div>
            )}

            <div className="box-outer top-box" id="popular-threads">
                <div className="box-inner">
                    <div className="boxbar">
                        <h2>Popular Threads</h2>
                    </div>
                    <div className="boxcontent">
                        <div id="c-threads">
                            {popular.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "10px", color: "#89a", fontSize: "12px" }}>
                                    {totalPosts === null ? "Loading threads..." : "No threads yet"}
                                </div>
                            ) : popular.flatMap((t, i) => [
                                ...(i === trendingCount && trendingCount > 0 && trendingCount < popular.length
                                    ? [<div key="divider" className="c-divider">— Recent —</div>]
                                    : []),
                                <div key={t.threadPda} className="c-thread">
                                    <div className="c-board">{t.boardTitle}</div>
                                    <HashLink href={`/${t.boardId}/${t.threadPda}`} className="boardlink">
                                        <img alt="" className="c-thumb" src={t.img} width="150" height="150" style={{ objectFit: "cover" }} onError={(e) => { const img = e.target as HTMLImageElement; img.src = t.fallbackImg; img.style.objectFit = "contain"; }} />
                                    </HashLink>
                                    <div className="c-teaser">
                                        {t.name && t.name !== "Anonymous" && <><b className="name">{t.name}</b>: </>}
                                        {t.sub && <b>{t.sub} </b>}
                                        {t.com.slice(0, 120)}{t.com.length > 120 ? "..." : ""}
                                    </div>
                                </div>,
                            ])}
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
