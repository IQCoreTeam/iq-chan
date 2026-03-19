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

            {/* What is iqchan */}
            <div className="box-outer">
                <div className="boxbar">
                    <h2>What is iqchan?</h2>
                </div>
                <div className="boxcontent">
                    <p>
                        iqchan is a fully on-chain imageboard built on Solana. Every post is a
                        transaction, every thread is its own on-chain table. No accounts needed
                        &mdash; just connect your wallet and post. All data lives on Solana, powered
                        by the <a href="https://iqlabs.dev" target="_blank" rel="noopener noreferrer">IQ Labs</a> DB
                        contract.
                    </p>
                    <br />
                    <p>
                        Click on a board below that interests you and jump right in!
                    </p>
                </div>
            </div>

            {/* Boards */}
            <div className="box-outer">
                <div className="boxbar">
                    <h2>Boards</h2>
                </div>
                <div className="boxcontent">
                    <div className="board-columns">
                        <div className="column">
                            <h3>General</h3>
                            <ul>
                                {BOARDS.map((b) => (
                                    <li key={b.id}>
                                        <Link href={`/${b.id}`}>{b.title}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="box-outer">
                <div className="boxbar">
                    <h2>Stats</h2>
                </div>
                <div className="boxcontent">
                    <div className="stat-cell"><b>Network:</b> Solana Mainnet</div>
                    <div className="stat-cell"><b>Contract:</b> IQ Labs DB</div>
                    <div className="stat-cell"><b>Storage:</b> Fully On-Chain</div>
                </div>
            </div>

            {/* Footer */}
            <div className="fp-footer">
                <ul>
                    <li><Link href="/">Home</Link></li>
                    <li><a href="https://iqlabs.dev" target="_blank" rel="noopener noreferrer">IQ Labs</a></li>
                    <li><a href="https://x.com/IQLabsOfficial" target="_blank" rel="noopener noreferrer">Twitter</a></li>
                    <li><a href="https://t.me/IQLabsPortal" target="_blank" rel="noopener noreferrer">Telegram</a></li>
                    <li><a href="https://github.com/IQCoreTeam" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                </ul>
                <div className="fp-copyright">
                    Powered by <a href="https://iqlabs.dev" target="_blank" rel="noopener noreferrer">IQ Labs</a> on Solana
                </div>
            </div>
        </div>
    );
}
