"use client";

import { useEffect, useState } from "react";
import { shareUrl } from "../lib/share";
import { resolveNetwork } from "../lib/chains/resolve";

export default function ShareLink({ board, thread }: { board?: string; thread?: string }) {
    const [origin, setOrigin] = useState("");
    useEffect(() => { setOrigin(window.location.origin); }, []);
    if (!origin) return null;
    return <span> [<a href={shareUrl(origin, resolveNetwork().id, [board, thread].filter((s): s is string => !!s))}>Share {thread ? "thread" : board ? "board" : "site"}</a>] </span>;
}
