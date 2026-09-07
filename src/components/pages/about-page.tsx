"use client";

import HashLink from "../hash-link";
import { FooterNav } from "../board-nav";
import { resolveNetwork } from "../../lib/chains/resolve";

export default function AboutPage() {
    const net = resolveNetwork();
    return (
        <>
            <div className="boardBanner">
                <div className="boardTitle">About</div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div style={{ maxWidth: 700, margin: "10px auto", padding: "0 10px", fontSize: 13, lineHeight: 1.5 }}>
                <p>
                    {net.theme.siteName} is a simple on-chain bulletin board where anyone can post
                    comments and share images. There are boards dedicated to a variety
                    of topics, from business and finance to technology, anime, and
                    shitposting. Users do not need to register an account before
                    participating in the community. Just connect a wallet and
                    jump right in!
                </p>
                <br />
                <p>
                    Every post is a {net.theme.chainLabel} transaction. Every thread is an on-chain
                    table. Nothing can be taken down. Feel free to click on a board
                    that interests you and start posting!
                </p>
                <br />
                <h3 style={{ borderBottom: "1px solid #b7c5d9", paddingBottom: 3 }}>Run Your Own</h3>
                <p>
                    BlockChan is fully open source. Run your own frontend, your own gateway, or both.
                    No single server controls the data.
                    anyone can serve it.
                </p>
                <br />
                <p>
                    <a href="https://github.com/IQCoreTeam/iq-chan" target="_blank" rel="noopener noreferrer">Frontend</a>
                    {" — "}clone, <code>npm install</code>, <code>npm run dev</code>. Static Next.js app, deploy anywhere.
                </p>
                <p>
                    <a href="https://github.com/IQCoreTeam/iq-gateway" target="_blank" rel="noopener noreferrer">Gateway</a>
                    {" — "}read-only cache layer. Run your own so you never depend on ours.
                </p>
                <p>
                    <a href="https://github.com/IQCoreTeam/iqlabs-solana-sdk" target="_blank" rel="noopener noreferrer">IQ Labs SDK</a>
                    {" — "}the protocol that powers it all. Build your own apps on-chain.
                </p>
                <br />
                <p style={{ textAlign: "center", fontStyle: "italic", color: "#89a" }}>
                    Made by the IQ community, for the IQ community.
                </p>
                <br />
                <p style={{ textAlign: "center" }}>
                    [<HashLink href="/">Home</HashLink>]
                </p>
            </div>

            <FooterNav />

            <div id="bottom"></div>
        </>
    );
}
