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
import { parseInscriptionRef } from "../../lib/inscription";
import InscriptionImage from "../inscription-image";
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

export function ThreadThumbnail({ thread }: { thread: PopularThread }) {
    const [failed, setFailed] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [dims, setDims] = useState({ w: THUMB_MAX, h: THUMB_MAX });
    const src = failed ? thread.fallbackImg : thread.img;
    const sig = parseInscriptionRef(thread.img);
    const onLoad: React.ReactEventHandler<HTMLImageElement> = event => {
        setDims(thumbDims(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight));
        setLoaded(true);
    };
    return (
        <span className="c-thumbnail" style={{ width: dims.w, height: dims.h }}>
            {sig ? <InscriptionImage key={thread.img} sig={thread.img!} alt="" className="c-thumb"
                onLoad={onLoad} style={{maxWidth: THUMB_MAX, maxHeight: THUMB_MAX, opacity: loaded ? 1 : 0}} /> : <img
                alt=""
                className="c-thumb"
                src={src}
                width={dims.w}
                height={dims.h}
                decoding="async"
                style={{ opacity: loaded ? 1 : 0 }}
                onLoad={onLoad}
                onError={() => {
                    // A missing fallback must not cause an endless error/reload loop.
                    if (src === thread.fallbackImg) setLoaded(true);
                    else { setFailed(true); setLoaded(false); }
                }}
            />}
            {!loaded && <span className="c-image-status">Loading image…</span>}
        </span>
    );
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
): PopularThread {
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
    const [loading, setLoading] = useState(true);
    const [failedBoards, setFailedBoards] = useState(0);
    const [totalPosts, setTotalPosts] = useState<number | null>(null);
    const [totalThreads, setTotalThreads] = useState<number | null>(null);
    const [popular, setPopular] = useState<PopularThread[]>([]);
    const [trendingCount, setTrendingCount] = useState(0);
    const [allThreads, setAllThreads] = useState<{ boardId: string; threadPda: string }[]>([]);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        setFailedBoards(0);
        setTotalPosts(null);
        setTotalThreads(null);
        setPopular([]);
        setAllThreads([]);
        type WithOp = [string, { boardId: string; op: Post; count: number; lastActivity: number }];
        const results = new Map<string, { threads: WithOp[]; posts: number; threadCount: number }>();

        function publish() {
            if (cancelled) return;
            // Keep board order stable even when requests finish out of order.
            const completed = boards.flatMap(b => results.has(b.id) ? [results.get(b.id)!] : []);
            const withOp = completed.flatMap(r => r.threads);
            setTotalPosts(completed.reduce((sum, r) => sum + r.posts, 0));
            setTotalThreads(completed.reduce((sum, r) => sum + r.threadCount, 0));
            setAllThreads(withOp.map(([pda, t]) => ({ boardId: t.boardId, threadPda: pda })));
            // Hot score: linear reply rate decaying with thread age + mild
            // recency boost. post.time/lastActivity are unix seconds.
            const now = Date.now();
            const hotScore = (t: { op: Post; count: number; lastActivity: number }) => {
                const ageHours = Math.max(0, (now - t.op.time * 1000) / 3600000);
                const idleHours = Math.max(0, (now - t.lastActivity * 1000) / 3600000);
                return t.count / (ageHours + 2) + 0.5 / (idleHours + 1);
            };
            const trending = [...withOp]
                .sort(([, a], [, b]) => {
                    const aImg = Boolean(a.op.img) ? 1 : 0;
                    const bImg = Boolean(b.op.img) ? 1 : 0;
                    if (aImg !== bImg) return bImg - aImg;
                    return hotScore(b) - hotScore(a);
                })
                .slice(0, 4);

            // Fill remaining slots (up to 8) with recent, image-first then by time
            const trendingPdas = new Set(trending.map(([pda]) => pda));
            const recentArr = [...withOp]
                .filter(([pda]) => !trendingPdas.has(pda))
                .sort(([, a], [, b]) => {
                    const aImg = Boolean(a.op.img) ? 1 : 0;
                    const bImg = Boolean(b.op.img) ? 1 : 0;
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
            const combined = all.map(([pda, t], i) => toDisplayThread(pda, t, boards, fallbacks[i]));

            setTrendingCount(trending.length);
            setPopular(combined);
        }

        async function load() {
            try {
                const chain = resolveNetwork().family === "svm" ? null : await getChain();
                if (cancelled) return;
                await Promise.all(boards.map(async (board) => {
                    try {
                        let threads: WithOp[];
                        let posts: number;
                        let threadCount: number;
                        if (!chain) {
                            const rows = await fetchAllTableRows(getFeedPda(DB_ROOT_KEY, board.seed).toBase58(), 50);
                            const threadMap = new Map<string, { boardId: string; op: Post | null; count: number; lastActivity: number }>();
                            for (const row of rows) {
                                const post = row as Post;
                                if (!post.threadPda) continue;
                                const existing = threadMap.get(post.threadPda);
                                if (existing) {
                                    existing.count++;
                                    existing.lastActivity = Math.max(existing.lastActivity, post.time ?? 0);
                                    if (post.threadSeed && isMoreLikelyOp(existing.op ?? undefined, post)) existing.op = post;
                                } else {
                                    threadMap.set(post.threadPda, {
                                        boardId: board.id, op: post.threadSeed ? post : null,
                                        count: 1, lastActivity: post.time ?? 0,
                                    });
                                }
                            }
                            posts = rows.length;
                            threadCount = threadMap.size;
                            threads = [...threadMap.entries()].filter(([, t]) => t.op) as WithOp[];
                        } else {
                            const entries = await chain.listThreads(board.id);
                            threads = entries.filter(t => t.opData).map(t => [t.threadPda, {
                                boardId: board.id, op: t.opData!, count: t.replyCount ?? 0,
                                lastActivity: t.lastActivityTime ?? t.opData!.time ?? 0,
                            }]);
                            posts = threads.reduce((sum, [, t]) => sum + t.count + 1, 0);
                            threadCount = threads.length;
                        }
                        if (cancelled) return;
                        results.set(board.id, { threads, posts, threadCount });
                        publish();
                    } catch {
                        if (!cancelled) setFailedBoards(count => count + 1);
                    }
                }));
                if (!cancelled && boards.length === 0) publish();
            } catch {
                if (!cancelled) setFailedBoards(boards.length);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();
        return () => { cancelled = true; };
    }, [boards]);

    return { totalPosts, totalThreads, popular, trendingCount, allThreads, loading, failedBoards };
}

export default function HomePage() {
    const { boards } = useBoards();
    const { totalPosts, totalThreads, popular, trendingCount, allThreads, loading, failedBoards } = useHomeData(boards);
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
                            {failedBoards > 0 && popular.length > 0 && <p role="status">Some boards could not be loaded. Showing available threads.</p>}
                            {popular.length === 0 ? (
                                <div className="c-loading" role="status">
                                    {loading ? "Loading threads…" : failedBoards ? "Unable to load threads" : "No threads yet"}
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
                            <b>{loading || failedBoards ? "Posts loaded:" : "Total Posts:"}</b> {totalPosts !== null ? totalPosts.toLocaleString() : "..."}
                        </div>
                        <div className="stat-cell">
                            <b>{loading || failedBoards ? "Threads loaded:" : "Active Threads:"}</b> {totalThreads !== null ? totalThreads.toLocaleString() : "..."}
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
