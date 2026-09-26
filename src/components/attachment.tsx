"use client";

import { useEffect, useState } from "react";
import { ALLWEBS_PAGE, ALLWEBS_MEDIA, inscriptionMediaPath, parseInscription, inscriptionSiteUrl } from "../lib/attachment";
import { safePostUrl } from "../lib/format";
import { gwFetch } from "../lib/gateway";
import { resolveNetwork } from "../lib/chains/resolve";
import { readResponseBytes } from "../lib/read-response";

/** The on-chain img field also accepts direct video URLs; approved provider pages are resolved by the server. */
export default function Attachment({ url, name, isOp }: { url: string; name: string; isOp?: boolean }) {
    const [failed, setFailed] = useState(false);
    const [placeholderFailed, setPlaceholderFailed] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const safeUrl = safePostUrl(url);
    const inscription = inscriptionMediaPath(url, resolveNetwork());
    const [media, setMedia] = useState<{path: string; src?: string; mime?: string; error?: boolean} | null>(null);
    const [resolved, setResolved] = useState<string | null>(null);
    const providerPage = !!safeUrl && ALLWEBS_PAGE.test(safeUrl);
    useEffect(() => {
        setFailed(false); setPlaceholderFailed(false); setExpanded(false);
        if (!inscription) return;
        const controller = new AbortController();
        let objectUrl: string | undefined;
        const timeout = setTimeout(() => { setMedia({path: inscription, error: true}); controller.abort(); }, 15000);
        gwFetch(inscription, {signal: controller.signal})
            .then(async response => {
                if (!response.ok) { await response.body?.cancel(); throw new Error("Media unavailable"); }
                const mime = response.headers.get("content-type")?.split(";")[0] || "";
                if (!/^(image\/(png|jpeg|gif|webp|avif)|audio\/(mpeg|mp3|wav|x-wav|ogg|mp4|aac|flac)|video\/(mp4|webm|ogg))$/.test(mime)) { await response.body?.cancel(); throw new Error("Unsupported media"); }
                const bytes = await readResponseBytes(response, 6 * 1024 * 1024);
                if (controller.signal.aborted) throw new Error("Media unavailable");
                const blob = new Blob([bytes], {type: mime});
                objectUrl = URL.createObjectURL(blob);
                setMedia({path: inscription, src: objectUrl, mime});
            })
            .catch(() => {if (!controller.signal.aborted) setMedia({path: inscription, error: true});})
            .finally(() => clearTimeout(timeout));
        return () => { clearTimeout(timeout); controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [inscription]);
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
    const loaded = media?.path === inscription ? media : null;
    if (inscription && !loaded?.src) return <span role="status">{loaded?.error ? "Inscribed media unavailable." : "Loading inscribed media…"}</span>;
    if (!safeUrl && !inscription) return null;
    if (providerPage && !resolved) return null;
    const reference = parseInscription(url, resolveNetwork());
    const recordUrl = reference && inscriptionSiteUrl(reference.network, reference.id);
    const badge = recordUrl && <a className="inscriptionBadge" href={recordUrl} target="_blank" rel="noopener noreferrer" title="This media is inscribed on the blockchain. View it on IQ.">On-chain · View on IQ</a>;
    const source = (inscription ? loaded?.src : resolved || safeUrl)!;
    const path = new URL(source).pathname;
    const video = inscription ? loaded?.mime?.startsWith("video/") : /\.(mp4|webm|mov|m4v|ogv)$/i.test(path);
    const audio = inscription ? loaded?.mime?.startsWith("audio/") : /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(path);
    if (placeholderFailed || (failed && (video || audio))) return inscription ? <span role="status">Inscribed media unavailable.</span> : null;
    if (audio) return <div className={inscription ? "inscriptionMedia" : undefined}>{badge}<audio className="attachmentAudio" src={source} controls preload="none" aria-label={name} onError={() => setFailed(true)} /></div>;
    if (video) return <div className={inscription ? "attachmentVideo inscriptionMedia" : "attachmentVideo"}>{badge}
        <video src={source} controls playsInline preload="metadata" aria-label={name} onError={() => setFailed(true)} />
    </div>;
    return <div className={inscription ? "inscriptionMedia" : undefined}>{badge}<a className={`fileThumb${expanded ? " fileThumbExpanded" : ""}`} href={safeUrl || source}
        onClick={(event) => { if (!failed) { event.preventDefault(); setExpanded(value => !value); } }}
        aria-label={failed ? name : `${expanded ? "Collapse" : "Expand"} ${name}`}>
        <img src={failed ? "/404.webp" : source} alt={failed ? "Image unavailable" : name} loading="lazy" onError={() => failed ? setPlaceholderFailed(true) : setFailed(true)}
            style={expanded ? { maxWidth: "100%", maxHeight: "none" } : { maxWidth: isOp ? 250 : 125, maxHeight: isOp ? 250 : 125 }} />
        <div className="mFileInfo mobile">{expanded && <div className="mFileName">{name}</div>}</div>
    </a></div>;
}
