"use client";

import HashLink from "./hash-link";
import { useBoards } from "../hooks/use-boards";

export function BoardList() {
    const { boards } = useBoards();
    return (
        <span className="boardList">
            [
            {boards.map((b, i) => (
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
                    <HashLink href="/about">About</HashLink>
                    {" \u2022 "}
                    <HashLink href="/feedback">Feedback</HashLink>
                </div>
            </div>
        </>
    );
}
