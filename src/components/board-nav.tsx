"use client";

import Link from "next/link";
import { BOARDS } from "../lib/constants";

/** Board link list used in header and footer nav bars. */
export function BoardList() {
    return (
        <span className="boardList">
            [
            {BOARDS.map((b, i) => (
                <span key={b.id}>
                    {i > 0 && " / "}
                    <Link href={`/${b.id}`} title={b.title}>{b.id}</Link>
                </span>
            ))}
            ]
        </span>
    );
}

/** Footer with board nav + about links, matching 4chan's bottom section. */
export function FooterNav() {
    return (
        <>
            <div id="boardNavDesktopFoot">
                <BoardList />
                <span id="navbotright" style={{ float: "right" }}>
                    [<Link href="/">Home</Link>]
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
