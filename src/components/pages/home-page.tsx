"use client";

import { useState, useEffect } from "react";
import HashLink from "../hash-link";
import { DB_ROOT_KEY, getRandomBanner, getNoImagePlaceholders } from "../../lib/constants";
import { resolveNetwork } from "../../lib/chains/resolve";
import { getChain } from "../../lib/chains";
import { useBoards } from "../../hooks/use-boards";
import { getFeedPda, isMoreLikelyOp } from "../../lib/board";
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
    thumbW: number;
    thumbH: number;
}

function ThreadThumbnail({ thread }: { thread: PopularThread }) {
    const [failed, setFailed] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const src = failed ? thread.fallbackImg : thread.img;
    return (
        <span className="c-thumbnail" style={{ width: thread.thumbW, height: thread.thumbH }}>
            <img
                alt=""
                className="c-thumb"
                src={src}
                width={thread.thumbW}
                height={thread.thumbH}
                decoding="async"
                style={{ opacity: loaded ? 1 : 0 }}
                onLoad={() => setLoaded(true)}
                onError={() => {
                    // A missing fallback must not cause an endless error/reload loop.
                    if (src === thread.fallbackImg) setLoaded(true);
                    else { setFailed(true); setLoaded(false); }
                }}
            />
            {!loaded && <span className="c-image-status">Loading image…</span>}
            {loaded && failed && <span className="c-image-status">Image unavailable</span>}
        </span>
    );
}

// Decode the image via a detached Image() and report its natural dimensions.
// Null on failure (timeout, network error, non-image response). One fetch per
// URL — result cached so the later <img> render uses the browser's hot cache.
const imageDims = new Map<string, Promise<{ w: number; h: number } | null>>();
function checkImageDims(url: string): Promise<{ w: number; h: number } | null> {
    const cached = imageDims.get(url);
    if (cached) return cached;
    const p = new Promise<{ w: number; h: number } | null>((resolve) => {
        const img = new Image();
        // Stop waiting for ranking, but let a slow valid image finish downloading.
        // Cancelling it here makes the rendered thumbnail start the request again.
        const t = setTimeout(() => resolve(null), 5000);
        img.onload = () => { clearTimeout(t); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
        img.onerror = () => { clearTimeout(t); resolve(null); };
        img.src = url;
    });
    imageDims.set(url, p);
    return p;
}

// 4chan-parity thumbnail scaling: scale the long side down to `max` and keep
// the natural aspect ratio. Images smaller than max keep their native size.
const THUMB_MAX = 150;
function thumbDims(natW: number, natH: number): { w: number; h: number } {
    const long = Math.max(natW, natH);
    if (long <= THUMB_MAX) return { w: natW, h: natH };
    const ratio = THUMB_MAX / long;
    return { w: Math.round(natW * ratio), h: Math.round(natH * ratio) };
}

function toDisplayThread(
    pda: string,
    t: { boardId: string; op: Post; count: number },
    boards: BoardMeta[],
    fallbackImg: string,
    dims: { w: number; h: number } | null,
): PopularThread {
    const board = boards.find((b) => b.id === t.boardId);
    const scaled = dims ? thumbDims(dims.w, dims.h) : { w: THUMB_MAX, h: THUMB_MAX };
    return {
        boardId: t.boardId,
        boardTitle: board?.title ?? t.boardId,
        threadPda: pda,
        sub: t.op.sub || "",
        com: t.op.com || "",
        name: t.op.name || "",
        img: t.op.img || fallbackImg,
        fallbackImg,
        thumbW: scaled.w,
        thumbH: scaled.h,
    };
}

function useHomeData(boards: BoardMeta[]) {
    const [loading, setLoading] = useState(true);
    const [totalPosts, setTotalPosts] = useState<number | null>(null);
    const [totalThreads, setTotalThreads] = useState<number | null>(null);
    const [popular, setPopular] = useState<PopularThread[]>([]);
    const [trendingCount, setTrendingCount] = useState(0);
    const [allThreads, setAllThreads] = useState<{ boardId: string; threadPda: string }[]>([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                type WithOp = [string, { boardId: string; op: Post; count: number; lastActivity: number }];
                let withOp: WithOp[];
                let totalPostCount = 0;
                let threadCount = 0;

                if (resolveNetwork().family === "svm") {
                    // Solana: aggregate from the feed PDAs (unchanged).
                    const feedResults = await Promise.all(
                        boards.map((b) => fetchAllTableRows(getFeedPda(DB_ROOT_KEY, b.seed).toBase58(), 50).then((rows) => ({ boardId: b.id, rows }))),
                    );
                    if (cancelled) return;

                    const threadMap = new Map<string, { boardId: string; op: Post | null; count: number; lastActivity: number }>();
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
                                if (post.threadSeed && isMoreLikelyOp(existing.op ?? undefined, post)) {
                                    existing.op = post;
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
                    threadCount = threadMap.size;
                    withOp = [...threadMap.entries()].filter(([, t]) => t.op) as WithOp[];
                } else {
                    // EVM: aggregate from the gateway derived feed via the adapter.
                    const chain = await getChain();
                    const perBoard = await Promise.all(
                        boards.map((b) => chain.listThreads(b.id).then((threads) => ({ boardId: b.id, threads })).catch(() => ({ boardId: b.id, threads: [] }))),
                    );
                    if (cancelled) return;

                    withOp = [];
                    for (const { boardId, threads } of perBoard) {
                        for (const t of threads) {
                            if (!t.opData) continue;
                            const count = t.replyCount ?? 0;
                            totalPostCount += count + 1;
                            withOp.push([t.threadPda, {
                                boardId,
                                op: t.opData,
                                count,
                                lastActivity: t.lastActivityTime ?? t.opData.time ?? 0,
                            }]);
                        }
                    }
                    threadCount = withOp.length;
                }

                setTotalPosts(totalPostCount);
                setTotalThreads(threadCount);
                setAllThreads(withOp.map(([pda, t]) => ({ boardId: t.boardId, threadPda: pda })));

                // Fetch natural dimensions for every candidate image. Threads whose
                // image doesn't decode (dead Discord CDN, gallery pages, 404s) get
                // null and are treated as text threads for sort purposes.
                const dimsResults = await Promise.all(
                    withOp.map(async ([pda, t]) => ({
                        pda,
                        dims: t.op.img ? await checkImageDims(t.op.img) : null,
                    })),
                );
                if (cancelled) return;
                const liveImgPdas = new Set(dimsResults.filter((r) => r.dims).map((r) => r.pda));
                const dimsByPda = new Map(dimsResults.filter((r) => r.dims).map((r) => [r.pda, r.dims!]));

                // Hot score: linear reply rate decaying with thread age + mild
                // recency boost. post.time/lastActivity are unix seconds.
                const now = Date.now();
                const hotScore = (t: { op: Post; count: number; lastActivity: number }) => {
                    const ageHours = Math.max(0, (now - t.op.time * 1000) / 3600000);
                    const idleHours = Math.max(0, (now - t.lastActivity * 1000) / 3600000);
                    return t.count / (ageHours + 2) + 0.5 / (idleHours + 1);
                };
                const trending = [...withOp]
                    .sort(([pdaA, a], [pdaB, b]) => {
                        const aImg = liveImgPdas.has(pdaA) ? 1 : 0;
                        const bImg = liveImgPdas.has(pdaB) ? 1 : 0;
                        if (aImg !== bImg) return bImg - aImg;
                        return hotScore(b) - hotScore(a);
                    })
                    .slice(0, 4);

                // Fill remaining slots (up to 8) with recent, live-image-first then by time
                const trendingPdas = new Set(trending.map(([pda]) => pda));
                const recentArr = [...withOp]
                    .filter(([pda]) => !trendingPdas.has(pda))
                    .sort(([pdaA, a], [pdaB, b]) => {
                        const aImg = liveImgPdas.has(pdaA) ? 1 : 0;
                        const bImg = liveImgPdas.has(pdaB) ? 1 : 0;
                        if (aImg !== bImg) return bImg - aImg;
                        return b.lastActivity - a.lastActivity;
                    })
                    .slice(0, 8 - trending.length);

                // Assign unique placeholders to no-image threads first
                const all = [...trending, ...recentArr];
                const shuffled = [...getNoImagePlaceholders()].sort(() => Math.random() - 0.5);
                const noImgIndices = all.map(([, t], i) => t.op.img ? -1 : i).filter((i) => i >= 0);
                const fallbacks: string[] = new Array(all.length).fill(shuffled[0]);
                noImgIndices.forEach((idx, i) => { fallbacks[idx] = shuffled[i % shuffled.length]; });
                // Fill image threads with whatever's left (only used if their URL breaks)
                let fi = noImgIndices.length;
                all.forEach(([, t], i) => { if (t.op.img) fallbacks[i] = shuffled[fi++ % shuffled.length]; });
                const combined = all.map(([pda, t], i) => toDisplayThread(pda, t, boards, fallbacks[i], dimsByPda.get(pda) ?? null));

                setTrendingCount(trending.length);
                setPopular(combined);
            } catch {} finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [boards]);

    return { totalPosts, totalThreads, popular, trendingCount, allThreads, loading };
}

export default function HomePage() {
    const { boards } = useBoards();
    const { totalPosts, totalThreads, popular, trendingCount, allThreads, loading } = useHomeData(boards);
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
                    <img alt={resolveNetwork().theme.siteName} src={resolveNetwork().theme.logo ?? "/blockchan.webp"} width="300" height="120" />
                </HashLink>
            </div>

            {!aboutClosed && <div className="box-outer" id="announce">
                <div className="box-inner">
                    <div className="boxbar">
                        <h2>What is {resolveNetwork().theme.siteName}?</h2>
                        <a href="#" className="closebutton" onClick={(e) => { e.preventDefault(); sessionStorage.setItem("blockchan_about_closed", "1"); setAboutClosed(true); }}>X</a>
                    </div>
                    <div className="boxcontent">
                        <p>
                            {resolveNetwork().theme.siteName} is a simple on-chain bulletin board where anyone can post
                            comments and share images. There are boards dedicated to a variety
                            of topics, from business and finance to technology, anime, and
                            shitposting. Users do not need to register an account before
                            participating in the community. Just connect a wallet and
                            jump right in!
                        </p>
                        <p style={{ marginTop: 8 }}>
                            Every post is a {resolveNetwork().theme.chainLabel} transaction. Every thread is an on-chain
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
                                <img alt="banner" src={bannerSrc} width="600" height="200" />
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
                        <div id="c-threads" aria-busy={loading}>
                            {popular.length === 0 ? (
                                <div className="c-loading" role="status">
                                    {loading ? "Loading threads…" : "No threads yet"}
                                </div>
                            ) : popular.flatMap((t, i) => [
                                ...(i === trendingCount && trendingCount > 0 && trendingCount < popular.length
                                    ? [<div key="divider" className="c-divider">— Recent —</div>]
                                    : []),
                                <div key={t.threadPda} className="c-thread">
                                    <div className="c-board">{t.boardTitle}</div>
                                    <HashLink href={`/${t.boardId}/${t.threadPda}`} className="boardlink">
                                        <ThreadThumbnail key={t.img} thread={t} />
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
                    Images uploaded are the responsibility of the Poster. All posts are {resolveNetwork().theme.chainLabel} transactions. Powered by IQ Labs.
                </div>
            </div>
        </div>
    );
}
