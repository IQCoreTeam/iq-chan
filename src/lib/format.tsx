import React from "react";

// Parse post text into React elements with greentext and quote links
export function formatPostMessage(text: string): React.ReactNode[] {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
        if (i > 0) elements.push(<br key={`br${i}`} />);

        if (line.startsWith(">") && !line.startsWith(">>")) {
            // Greentext
            elements.push(
                <span key={`gt${i}`} className="quote">{line}</span>
            );
        } else {
            // Parse inline >>quotes
            const parts = line.split(/(>>[A-Za-z0-9]{6,})/g);
            parts.forEach((part, j) => {
                if (part.match(/^>>[A-Za-z0-9]{6,}$/)) {
                    const sig = part.slice(2);
                    elements.push(
                        <a
                            key={`ql${i}-${j}`}
                            href={`https://solscan.io/tx/${sig}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="quotelink"
                        >
                            {part}
                        </a>
                    );
                } else if (part) {
                    elements.push(<React.Fragment key={`t${i}-${j}`}>{part}</React.Fragment>);
                }
            });
        }
    });

    return elements;
}
