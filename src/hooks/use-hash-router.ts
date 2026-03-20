"use client";

import { useState, useEffect } from "react";

function parseHash(): { boardId: string | null; threadId: string | null; scrollTo: string | null } {
    const raw = window.location.hash;
    if (!raw.startsWith("#/")) return { boardId: null, threadId: null, scrollTo: null };
    // Support #/biz/threadPda:pTxSig for scroll-to-post on navigation
    const path = raw.slice(2);
    if (!path) return { boardId: null, threadId: null, scrollTo: null };
    const parts = path.split("/");
    const boardId = parts[0] || null;
    let threadId = parts[1] || null;
    let scrollTo: string | null = null;
    if (threadId && threadId.includes(":p")) {
        const [tid, anchor] = threadId.split(":p");
        threadId = tid;
        scrollTo = anchor || null;
    }
    return { boardId, threadId, scrollTo };
}

export function useHashRoute() {
    const [route, setRoute] = useState<{ boardId: string | null; threadId: string | null; scrollTo: string | null }>({ boardId: null, threadId: null, scrollTo: null });

    useEffect(() => {
        setRoute(parseHash());
        function onHashChange() { setRoute(parseHash()); }
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    return route;
}

export function hashHref(path: string): string {
    return `#${path.startsWith("/") ? path : "/" + path}`;
}
