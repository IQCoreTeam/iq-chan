"use client";

import { useState } from "react";
import { getFallbacks } from "../lib/config";
import { resolveNetwork } from "../lib/chains/resolve";
import { inscriptionSrcCandidates } from "../lib/inscription";

// Renders a post attachment whose img field held a bare inscription signature,
// not a url. The gateway url is assembled here (never stored on chain), so it
// walks to the next gateway on failure and wears an "on-chain" badge that links
// to the tx on this chain's explorer. The thumbnail click expands like a normal
// attachment; the badge is the only navigation.
export default function InscriptionAttachment({ sig, isOp }: { sig: string; isOp?: boolean }) {
    const net = resolveNetwork();
    const candidates = inscriptionSrcCandidates(sig, getFallbacks(), net.gatewayNetworkParam);
    const [idx, setIdx] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const exhausted = idx >= candidates.length;
    const src = exhausted ? "/404.webp" : candidates[idx];
    const short = sig.slice(0, 8);
    const accent = net.theme.accent;

    return (
        <span className={`fileThumb${expanded ? " fileThumbExpanded" : ""}`} style={{ position: "relative", display: "inline-block" }}>
            <img
                src={src}
                alt={exhausted ? "Inscription unavailable" : `on-chain inscription ${short}`}
                loading="lazy"
                onClick={() => { if (!exhausted) setExpanded((v) => !v); }}
                onError={() => setIdx((i) => i + 1)}
                style={expanded
                    ? { maxWidth: "100%", maxHeight: "none", cursor: "zoom-out" }
                    : { maxWidth: isOp ? 250 : 125, maxHeight: isOp ? 250 : 125, cursor: exhausted ? "default" : "zoom-in" }}
            />
            <a
                href={`${net.explorerTxUrl}${sig}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`On-chain inscription, view ${short} on ${net.explorerName}`}
                style={{
                    position: "absolute",
                    left: 4,
                    bottom: 4,
                    padding: "1px 5px",
                    fontSize: 10,
                    lineHeight: 1.4,
                    fontWeight: "bold",
                    textDecoration: "none",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    color: accent,
                    background: "var(--panel)",
                    border: `1px solid ${accent}`,
                    borderRadius: 2,
                }}
            >on-chain</a>
        </span>
    );
}
