"use client";

import HashLink from "../hash-link";
import { FooterNav } from "../board-nav";

export default function AboutPage() {
    return (
        <>
            <div className="boardBanner">
                <div className="boardTitle">About</div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div style={{ maxWidth: 700, margin: "10px auto", padding: "0 10px", fontSize: 13, lineHeight: 1.5 }}>
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
                    that interests you and start posting!
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
