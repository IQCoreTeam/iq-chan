"use client";

import React, { useState, useEffect } from "react";
import { scrollToPost, highlightPost } from "./highlight";

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
        return (
            <a
                href={`https://solscan.io/tx/${sig}`}
                target="_blank"
                rel="noopener noreferrer"
                className="quotelink"
            >
                {display} →
            </a>
        );
    }

    return (
        <a
            href={`#p${fullId}`}
            className="quotelink"
            onClick={(e) => { e.preventDefault(); scrollToPost(fullId); }}
            onMouseEnter={() => highlightPost(fullId, true)}
            onMouseLeave={() => highlightPost(fullId, false)}
        >
            {display}
        </a>
    );
}

export function formatPostMessage(text: string): React.ReactNode[] {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
        if (i > 0) elements.push(<br key={`br${i}`} />);

        if (line.startsWith(">") && !line.startsWith(">>")) {
            elements.push(<span key={`gt${i}`} className="quote">{line}</span>);
        } else {
            const parts = line.split(/(>>[A-Za-z0-9]{6,})/g);
            parts.forEach((part, j) => {
                if (part.match(/^>>[A-Za-z0-9]{6,}$/)) {
                    const sig = part.slice(2);
                    elements.push(
                        <QuoteLink key={`ql${i}-${j}`} sig={sig} display={`>>${sig.slice(0, 8)}`} />
                    );
                } else if (part) {
                    elements.push(<React.Fragment key={`t${i}-${j}`}>{part}</React.Fragment>);
                }
            });
        }
    });

    return elements;
}
