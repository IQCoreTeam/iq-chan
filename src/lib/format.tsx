"use client";

import React, { useState, useEffect } from "react";
import { scrollToPost, highlightPost, showPostPreview, hidePostPreview } from "./highlight";

/** Find a post element whose id starts with "p" + sig prefix. */
function findPostId(sig: string): string | null {
    // Try exact match first
    if (document.getElementById(`p${sig}`)) return sig;
    // Try prefix match (quoted short sig matching full sig element)
    const el = document.querySelector(`[id^="p${sig}"]`);
    return el ? el.id.slice(1) : null;
}

function QuoteLink({ sig, display }: { sig: string; display: string }) {
    const [fullId, setFullId] = useState<string | null>(null);

    useEffect(() => {
        setFullId(findPostId(sig));
    }, [sig]);

    if (!fullId) {
        return <span className="quotelink deadlink">{display}</span>;
    }

    return (
        <a
            href={`#p${fullId}`}
            className="quotelink"
            onClick={(e) => { e.preventDefault(); scrollToPost(fullId); }}
            onMouseEnter={(e) => { highlightPost(fullId, true); showPostPreview(fullId, e); }}
            onMouseLeave={() => { highlightPost(fullId, false); hidePostPreview(); }}
        >
            {display}
        </a>
    );
}

function parseMagnetName(uri: string): string {
    const m = uri.match(/[?&]dn=([^&]+)/);
    if (!m) return "torrent";
    try { return decodeURIComponent(m[1].replace(/\+/g, " ")); } catch { return "torrent"; }
}

function parseInfohash(uri: string): string | null {
    const m = uri.match(/xt=urn:btih:([A-Fa-f0-9]{40}|[A-Z2-7]{32})/);
    return m ? m[1].toLowerCase() : null;
}

/**
 * Peel off trailing punctuation that almost certainly doesn't belong to the URL
 * (4chan-parity: "see https://foo.com." → links https://foo.com, leaves "." as text).
 * Also balances parens so "(https://foo.com/bar)" doesn't swallow the ")".
 */
function peelTrail(url: string): { url: string; trail: string } {
    let trail = "";
    // strip trailing .,;:!?'" and closing punct
    while (url.length > 0 && /[.,;:!?'"`)\]}>]/.test(url[url.length - 1])) {
        const ch = url[url.length - 1];
        // keep closing bracket only if opening bracket count > closing count in remaining url
        if (ch === ")" || ch === "]" || ch === "}") {
            const open = ch === ")" ? "(" : ch === "]" ? "[" : "{";
            const opens = (url.match(new RegExp(`\\${open}`, "g")) ?? []).length;
            const closes = (url.match(new RegExp(`\\${ch}`, "g")) ?? []).length;
            if (closes <= opens) break;
        }
        trail = ch + trail;
        url = url.slice(0, -1);
    }
    return { url, trail };
}

const INLINE_RE = /(>>[A-Za-z0-9]{6,}|\bmagnet:\?[^\s<>"]+|\bhttps?:\/\/[^\s<>"]+)/g;

export function formatPostMessage(text: string): React.ReactNode[] {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
        if (i > 0) elements.push(<br key={`br${i}`} />);

        if (line.startsWith(">") && !line.startsWith(">>")) {
            elements.push(<span key={`gt${i}`} className="quote">{line}</span>);
        } else {
            const parts = line.split(INLINE_RE);
            parts.forEach((part, j) => {
                if (part.match(/^>>[A-Za-z0-9]{6,}$/)) {
                    const sig = part.slice(2);
                    elements.push(
                        <QuoteLink key={`ql${i}-${j}`} sig={sig} display={`>>${sig.slice(0, 8)}`} />
                    );
                } else if (part && part.startsWith("magnet:?")) {
                    const { url, trail } = peelTrail(part);
                    const name = parseMagnetName(url);
                    const hash = parseInfohash(url);
                    elements.push(
                        <a
                            key={`mag${i}-${j}`}
                            href={url}
                            className="magnet-link"
                            title={hash ? `infohash ${hash}` : url}
                            rel="noopener noreferrer"
                        >🧲 {name}</a>
                    );
                    if (trail) elements.push(<React.Fragment key={`mt${i}-${j}`}>{trail}</React.Fragment>);
                } else if (part && /^https?:\/\//.test(part)) {
                    const { url, trail } = peelTrail(part);
                    elements.push(
                        <a
                            key={`url${i}-${j}`}
                            href={url}
                            className="external-link"
                            target="_blank"
                            rel="noopener noreferrer"
                        >{url}</a>
                    );
                    if (trail) elements.push(<React.Fragment key={`ut${i}-${j}`}>{trail}</React.Fragment>);
                } else if (part) {
                    elements.push(<React.Fragment key={`t${i}-${j}`}>{part}</React.Fragment>);
                }
            });
        }
    });

    return elements;
}
