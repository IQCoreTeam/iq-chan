"use client";

import HashLink from "./hash-link";
import { useBoards } from "../hooks/use-boards";
import { resolveNetwork } from "../lib/chains/resolve";
import { BOARD_CATEGORIES, CATEGORY_OF } from "../lib/board-config";

function BoardGroup({ boards }: { boards: { id: string; title: string }[] }) {
    return (
        <>
            [
            {boards.map((b, i) => (
                <span key={b.id}>
                    {i > 0 && " / "}
                    <HashLink href={`/${b.id}`} title={b.title}>{b.id}</HashLink>
                </span>
            ))}
            ]
        </>
    );
}

export function BoardList() {
    const { boards } = useBoards();
    const general = boards.filter((b) => !CATEGORY_OF[b.id]);
    const categorized = BOARD_CATEGORIES
        .map((c) => ({ category: c.category, boards: boards.filter((b) => c.boards.includes(b.id)) }))
        .filter((c) => c.boards.length > 0);
    return (
        <span className="boardList">
            <BoardGroup boards={general} />
            {categorized.map((c) => (
                <span key={c.category}> {c.category}: <BoardGroup boards={c.boards} /></span>
            ))}
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
                    Images uploaded are the responsibility of the Poster. All posts are {resolveNetwork().theme.chainLabel} transactions. Powered by IQ Labs.
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
