"use client";

import { useState, useEffect } from "react";
import HashLink from "../hash-link";
import { BOARDS, DB_ROOT_KEY } from "../../lib/constants";
import { getFeedPda } from "../../lib/board";
import { fetchAllTableRows } from "../../lib/gateway";
import "../../app/home.css";

function useSiteStats() {
    const [totalPosts, setTotalPosts] = useState<number | null>(null);
    const [totalThreads, setTotalThreads] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const allRows = await Promise.all(
                    BOARDS.map((b) => fetchAllTableRows(getFeedPda(DB_ROOT_KEY, b.id).toBase58())),
                );
                if (cancelled) return;

                const rows = allRows.flat();
                const threads = new Set<string>();
                for (const r of rows) {
                    if (r.threadPda) threads.add(r.threadPda as string);
                }
                setTotalPosts(rows.length);
                setTotalThreads(threads.size);
            } catch {
                // stats are non-critical, fail silently
            }
        }

        load();
        return () => { cancelled = true; };
    }, []);

    return { totalPosts, totalThreads };
}

export default function HomePage() {
    const { totalPosts, totalThreads } = useSiteStats();

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
                                {BOARDS.map((b) => (
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
                            {BOARDS.map((b) => (
                                <div key={b.id} className="c-thread">
                                    <div className="c-board">{b.title}</div>
                                    <HashLink href={`/${b.id}`} className="boardlink">
                                        {b.image && <img alt="" className="c-thumb" src={b.image} width="150" height="150" />}
                                    </HashLink>
                                    <div className="c-teaser">
                                        <b>/{b.id}/</b>: {b.description}
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
                            <b>Boards:</b> {BOARDS.length}
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
