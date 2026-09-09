"use client";

import { useEffect, useState } from "react";
import { shareUrl } from "../lib/share";
import { resolveNetwork } from "../lib/chains/resolve";

export default function ShareLink({ board, thread, post }: { board?: string; thread?: string; post?: string }) {
    const [origin, setOrigin] = useState("");
    const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
    useEffect(() => { setOrigin(window.location.origin); }, []);
    const url = origin ? shareUrl(origin, resolveNetwork().id, [board, thread, post].filter((s): s is string => !!s)) : "";
    useEffect(() => { setCopy("idle"); }, [url]);
    if (!origin) return null;
    const kind = post ? "post" : thread ? "thread" : board ? "board" : "site";
    return <span>
        {!post && " ["}
        <button type="button" style={{ border: 0, padding: 0, background: "none", color: post ? "inherit" : "var(--link)", font: "inherit", cursor: "pointer" }} onClick={async () => {
            try {
                await navigator.clipboard.writeText(url);
                setCopy("copied");
            } catch { setCopy("failed"); }
        }}>
            {copy === "copied" ? "Link copied!" : post ? "Copy link to post" : `Share ${kind}`}
        </button>
        {!post && "] "}
        {copy === "failed" && <span role="status" style={{ display: "inline-block", whiteSpace: "normal", width: 200 }}>
            Couldn’t copy. Select the link below:
            <input aria-label={`Link to ${kind}`} readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ width: "100%", boxSizing: "border-box" }} />
        </span>}
    </span>;
}
