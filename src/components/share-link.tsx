"use client";

import { useEffect, useState } from "react";

export default function ShareLink({ url }: { url: string }) {
    const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
    useEffect(() => { setCopy("idle"); }, [url]);
    return <span>
        <button type="button" style={{ border: 0, padding: 0, background: "none", color: "inherit", font: "inherit", cursor: "pointer" }} onClick={async () => {
            try {
                await navigator.clipboard.writeText(url);
                setCopy("copied");
            } catch { setCopy("failed"); }
        }}>
            {copy === "copied" ? "Link copied!" : "Copy link to post"}
        </button>
        {copy === "failed" && <span role="status" style={{ display: "inline-block", whiteSpace: "normal", width: 200 }}>
            Couldn’t copy. Select the link below:
            <input aria-label="Link to post" readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ width: "100%", boxSizing: "border-box" }} />
        </span>}
    </span>;
}
