"use client";

import HashLink from "./hash-link";
import { BOARDS } from "../lib/constants";

export function BoardList() {
    return (
        <span className="boardList">
            [
            {BOARDS.map((b, i) => (
                <span key={b.id}>
                    {i > 0 && " / "}
                    <HashLink href={`/${b.id}`} title={b.title}>{b.id}</HashLink>
                </span>
            ))}
            ]
        </span>
    );
}

export function FooterNav() {
    return (
        <>
            <div id="boardNavDesktopFoot">
                <BoardList />
                <span id="navbotright" style={{ float: "right" }}>
                    [<HashLink href="/">Home</HashLink>]
                </span>
            </div>
            <div id="absbot">
                <span className="absBotDisclaimer">
                    All trademarks and copyrights on this page are owned by their respective parties.
                    Images uploaded are the responsibility of the Poster. All posts are Solana transactions. Powered by IQ Labs.
                </span>
                <div id="footer-links">
                    <a href="https://iqlabs.dev" target="_blank" rel="noopener noreferrer">About</a>
                    {" \u2022 "}
                    <a href="https://x.com/IQLabsOfficial" target="_blank" rel="noopener noreferrer">Feedback</a>
                    {" \u2022 "}
                    <a href="https://github.com/IQCoreTeam" target="_blank" rel="noopener noreferrer">Source</a>
                </div>
            </div>
        </>
    );
}
