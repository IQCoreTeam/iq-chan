"use client";

import { useHashRoute } from "../hooks/use-hash-router";
import HashLink from "./hash-link";
import WalletButton from "./wallet-button";
import { BoardList } from "./board-nav";

export default function Header() {
    const { boardId } = useHashRoute();
    if (!boardId) return null;

    return (
        <div id="boardNavDesktop">
            <BoardList />
            <span id="navtopright">
                <WalletButton />
                {" "}
                [<HashLink href="/">Home</HashLink>]
            </span>
        </div>
    );
}
