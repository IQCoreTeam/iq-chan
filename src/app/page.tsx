"use client";

import Link from "next/link";
import { BOARDS } from "../lib/constants";
import "./home.css";

export default function HomePage() {
    return (
        <div className="fp-wrap">
            <div className="fp-logo">
                <Link href="/" title="Home">iqchan</Link>
            </div>

            <div className="box-outer" id="announce">
                <div className="box-inner">
                    <div className="boxbar">
                        <h2>What is iqchan?</h2>
                    </div>
                    <div className="boxcontent">
                        <p>
                            iqchan is a simple on-chain bulletin board where anyone can post
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
                                        <Link href={`/${b.id}`} className="boardlink">
                                            {b.title}
                                        </Link>
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
                        <h2>Popular Boards</h2>
                    </div>
                    <div className="boxcontent">
                        <div id="c-threads">
                            {BOARDS.map((b) => (
                                <div key={b.id} className="c-thread">
                                    <div className="c-board">/{b.id}/</div>
                                    <Link href={`/${b.id}`} className="boardlink">
                                        <img
                                            alt=""
                                            className="c-thumb"
                                            src={b.image}
                                            width="150"
                                            height="150"
                                        />
                                    </Link>
                                    <div className="c-teaser">
                                        <b>{b.title}</b>: {b.description}
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
                        <div className="stat-cell"><b>Network:</b> Solana Mainnet</div>
                        <div className="stat-cell"><b>Contract:</b> IQ Labs DB</div>
                        <div className="stat-cell"><b>Storage:</b> Fully On-Chain</div>
                    </div>
                </div>
            </div>

            <div id="ft">
                <ul>
                    <li><Link href="/">Home</Link></li>
                    <li><a href="https://iqlabs.dev" target="_blank" rel="noopener noreferrer">IQ Labs</a></li>
                    <li><a href="https://x.com/IQLabsOfficial" target="_blank" rel="noopener noreferrer">Twitter</a></li>
                    <li><a href="https://t.me/IQLabsPortal" target="_blank" rel="noopener noreferrer">Telegram</a></li>
                    <li><a href="https://github.com/IQCoreTeam" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                </ul>
                <br className="clear-bug" />
                <div id="copyright">
                    <a href="https://iqlabs.dev" target="_blank" rel="noopener noreferrer">About</a>
                    {" \u2022 "}
                    <a href="https://x.com/IQLabsOfficial" target="_blank" rel="noopener noreferrer">Feedback</a>
                    {" \u2022 "}
                    <a href="https://github.com/IQCoreTeam" target="_blank" rel="noopener noreferrer">Source</a>
                    <br /><br /><br />
                    Copyright &copy; 2025-2026 IQ Labs. All posts are on-chain.
                </div>
            </div>
        </div>
    );
}
