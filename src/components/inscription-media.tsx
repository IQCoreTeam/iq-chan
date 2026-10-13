"use client";
import { useEffect, useRef, useState } from "react";
import { gwFetch } from "../lib/gateway";
import { readResponseBytes } from "../lib/read-response";
import { resolveNetwork } from "../lib/chains/resolve";
import InscriptionImage from "./inscription-image";

// Extend the existing inscription image path with passive media. Its image/render
// fallback and the enclosing badge/guide remain shared with the inventory UI.
export default function InscriptionMedia({ sig, alt, style, className, onClick }: {
    sig: string; alt?: string; style?: React.CSSProperties;
    className?: string; onClick?: () => void;
}) {
    const net = resolveNetwork();
    const inscription = `/media/${sig}?network=${encodeURIComponent(sig.startsWith("0x") ? net.gatewayNetworkParam || net.id : "solana")}`;
    const preview = useRef<HTMLSpanElement>(null);
    const [media, setMedia] = useState<{path: string; src?: string; mime?: string; error?: boolean} | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        let objectUrl: string | undefined;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        let started = false;
        const load = () => {
            if (started || controller.signal.aborted) return;
            started = true;
            observer?.disconnect();
            timeout = setTimeout(() => { setMedia({path: inscription, error: true}); controller.abort(); }, 15000);
            gwFetch(inscription, {signal: controller.signal})
                .then(async response => {
                    if (controller.signal.aborted || !response.ok) { await response.body?.cancel(); throw new Error("Media unavailable"); }
                    const mime = response.headers.get("content-type")?.split(";")[0] || "";
                    if (!/^(image\/(png|jpeg|gif|webp|avif)|audio\/(mpeg|mp3|wav|x-wav|ogg|mp4|aac|flac)|video\/(mp4|webm|ogg))$/.test(mime)) { await response.body?.cancel(); throw new Error("Unsupported media"); }
                    const bytes = await readResponseBytes(response, 6 * 1024 * 1024);
                    if (controller.signal.aborted) throw new Error("Media unavailable");
                    const blob = new Blob([Uint8Array.from(bytes)], {type: mime});
                    objectUrl = URL.createObjectURL(blob);
                    setMedia({path: inscription, src: objectUrl, mime});
                })
                .catch(() => {if (!controller.signal.aborted) setMedia({path: inscription, error: true});})
                .finally(() => clearTimeout(timeout));
        };
        const observer = typeof window.IntersectionObserver === "function" && preview.current
            ? new window.IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) load();
            }, {rootMargin: "200px"}) : null;
        if (observer) observer.observe(preview.current!);
        else load();
        return () => { observer?.disconnect(); clearTimeout(timeout); controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [inscription]);

    const loaded = media?.path === inscription ? media : null;
    if (loaded?.error) return <InscriptionImage sig={sig} alt={alt} style={style} className={className} onClick={onClick}/>;
    if (!loaded?.src) return <span ref={preview} role="status">Loading inscribed media...</span>;
    if (loaded.mime?.startsWith("audio/")) return <audio src={loaded.src} controls preload="none" aria-label={alt} onError={()=>setMedia({path:inscription,error:true})}/>;
    if (loaded.mime?.startsWith("video/")) return <video src={loaded.src} controls playsInline preload="metadata" aria-label={alt} style={style} onError={()=>setMedia({path:inscription,error:true})}/>;
    return <img src={loaded.src} alt={alt} className={className} style={style} onClick={onClick} onError={()=>setMedia({path:inscription,error:true})}/>;
}
