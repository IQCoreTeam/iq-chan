"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./wallet-button";
import { BoardList } from "./board-nav";

export default function Header() {
    const pathname = usePathname();
    if (pathname === "/") return null;

    return (
        <div id="boardNavDesktop">
            <BoardList />
            <span id="navtopright">
                <WalletButton />
                {" "}
                [<Link href="/">Home</Link>]
            </span>
        </div>
    );
}
