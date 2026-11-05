"use client";

import { Children, useId, useState, type ReactNode } from "react";

// Shared disclosure only. Each chain retains its actual wallet buttons and
// provider callbacks; expanding the list never selects or connects a wallet.
export function WalletOptions({ children, disabled }: { children: ReactNode; disabled: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const listId = useId();
    const options = Children.toArray(children);
    const remaining = options.length - 3;

    return (
        <>
            <div id={listId} style={{ maxHeight: "min(40dvh, 280px)", overflowY: "auto", overscrollBehavior: "contain" }}>
                {expanded ? options : options.slice(0, 3)}
            </div>
            {remaining > 0 && (
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={listId}
                    disabled={disabled}
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        display: "block", width: "100%", minHeight: 36, marginTop: 4,
                        background: "#eee", border: "2px outset #fff", color: "#000",
                        padding: "6px 8px", fontFamily: "inherit", fontSize: "12px",
                        textAlign: "left", cursor: disabled ? "wait" : "pointer",
                    }}
                >
                    {expanded ? "Show fewer wallets" : `Show more wallets (${remaining})`}
                </button>
            )}
        </>
    );
}
