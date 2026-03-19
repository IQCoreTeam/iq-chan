"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./wallet-button";
import { BOARDS } from "../lib/constants";

export default function Header() {
    const pathname = usePathname();
    const isHome = pathname === "/";

    if (isHome) return null;

    return (
        <div id="boardNavDesktop">
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
            <span id="navtopright">
                <WalletButton />
                {" "}
                [<Link href="/">Home</Link>]
            </span>
        </div>
    );
}
