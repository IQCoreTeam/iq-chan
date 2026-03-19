"use client";

import React, { useState, useEffect } from "react";
import { scrollToPost, highlightPost } from "./highlight";

function QuoteLink({ sig, display }: { sig: string; display: string }) {
    const short = sig.slice(0, 8);
    const [onPage, setOnPage] = useState(false);

    useEffect(() => {
        setOnPage(!!document.getElementById(`p${short}`));
    }, [short]);

    if (!onPage) {
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
            href={`#p${short}`}
            className="quotelink"
            onClick={(e) => { e.preventDefault(); scrollToPost(short); }}
            onMouseEnter={() => highlightPost(short, true)}
            onMouseLeave={() => highlightPost(short, false)}
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
