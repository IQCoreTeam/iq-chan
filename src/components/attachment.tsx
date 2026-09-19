"use client";

import { useEffect, useState } from "react";
import { ALLWEBS_PAGE, ALLWEBS_MEDIA } from "../lib/attachment";
import { safePostUrl } from "../lib/format";

/** The on-chain img field also accepts direct video URLs; approved provider pages are resolved by the server. */
export default function Attachment({ url, name, isOp }: { url: string; name: string; isOp?: boolean }) {
    const [failed, setFailed] = useState(false);
    const [placeholderFailed, setPlaceholderFailed] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const safeUrl = safePostUrl(url);
    const [resolved, setResolved] = useState<string | null>(null);
    const providerPage = !!safeUrl && ALLWEBS_PAGE.test(safeUrl);
    useEffect(() => {
        if (!providerPage || !safeUrl) return;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(`/attachment?url=${encodeURIComponent(safeUrl)}`, { signal: controller.signal })
                .then(response => response.ok ? response.json() : null)
                .then(data => {
                    if (!controller.signal.aborted && typeof data?.url === "string" && ALLWEBS_MEDIA.test(data.url)) setResolved(data.url);
                }).catch(() => { /* Keep the original file link when resolution fails. */ });
        }, 300);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [providerPage, safeUrl]);
    if (!safeUrl) return null;
    if (providerPage && !resolved) return null;
    const source = resolved || safeUrl;
    const path = new URL(source).pathname;
    const video = /\.(mp4|webm|mov|m4v|ogv)$/i.test(path);
    const audio = /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(path);
    if (placeholderFailed || (failed && (video || audio))) return null;
    if (audio) return <audio className="attachmentAudio" src={source} controls preload="none" aria-label={name} onError={() => setFailed(true)} />;
    if (video) return <div className="attachmentVideo">
        <video src={source} controls playsInline preload="metadata" aria-label={name} onError={() => setFailed(true)} />
    </div>;
    return <a className={`fileThumb${expanded ? " fileThumbExpanded" : ""}`} href={safeUrl}
        onClick={(event) => { if (!failed) { event.preventDefault(); setExpanded(value => !value); } }}
        aria-label={failed ? name : `${expanded ? "Collapse" : "Expand"} ${name}`}>
        <img src={failed ? "/404.webp" : safeUrl} alt={failed ? "Image unavailable" : name} loading="lazy" onError={() => failed ? setPlaceholderFailed(true) : setFailed(true)}
            style={expanded ? { maxWidth: "100%", maxHeight: "none" } : { maxWidth: isOp ? 250 : 125, maxHeight: isOp ? 250 : 125 }} />
        <div className="mFileInfo mobile">{expanded && <div className="mFileName">{name}</div>}</div>
    </a>;
}
