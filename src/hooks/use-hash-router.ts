"use client";

import { useState, useEffect } from "react";

function parseHash(): { boardId: string | null; threadId: string | null } {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (!hash) return { boardId: null, threadId: null };
    const parts = hash.split("/");
    return {
        boardId: parts[0] || null,
        threadId: parts[1] || null,
    };
}

export function useHashRoute() {
    const [route, setRoute] = useState<{ boardId: string | null; threadId: string | null }>({ boardId: null, threadId: null });

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
