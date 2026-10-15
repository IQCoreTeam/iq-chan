"use client";

import { useState } from "react";
import { getFallbacks } from "../lib/config";
import { resolveNetwork } from "../lib/chains/resolve";
import { inscriptionViewUrl } from "../lib/inscription";
import InscriptionMedia from "./inscription-media";

// A post attachment whose img field held a bare inscription signature, not a
// url. The gateway render comes from InscriptionImage (assembled at read time,
// cycles on failure). The thumbnail click expands like a normal attachment; the
// "on-chain" badge opens a short guide that confirms the media is on chain and
// offers the explorer and a gateway view. The gateway link stays dynamic (from
// getFallbacks), so a gateway move needs no post rewrite.
export default function InscriptionAttachment({ sig, isOp }: { sig: string; isOp?: boolean }) {
    const net = resolveNetwork();
    const [expanded, setExpanded] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const short = sig.slice(0, 8);
    const accent = net.theme.accent;
    const explorerUrl = `${net.explorerTxUrl}${sig}`;
    const gatewayView = inscriptionViewUrl(sig, getFallbacks()[0], net.gatewayNetworkParam);

    return (
        <span className={`fileThumb${expanded ? " fileThumbExpanded" : ""}`} style={{ position: "relative", display: "inline-block" }}>
            <InscriptionMedia
                sig={sig}
                alt={`on-chain inscription ${short}`}
                onClick={() => setExpanded((v) => !v)}
                style={expanded
                    ? { maxWidth: "100%", maxHeight: "none", cursor: "zoom-out" }
                    : { maxWidth: isOp ? 250 : 125, maxHeight: isOp ? 250 : 125, cursor: "zoom-in" }}
            />
            <button
                type="button"
                title={`View inscription on ${net.theme.chainLabel}`}
                onClick={(e) => { e.stopPropagation(); setShowGuide((v) => !v); }}
                style={{
                    position: "absolute",
                    left: 4,
                    bottom: 4,
                    padding: "1px 5px",
                    fontSize: 10,
                    lineHeight: 1.4,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    color: accent,
                    background: "var(--panel)",
                    border: `1px solid ${accent}`,
                    borderRadius: 2,
                    cursor: "pointer",
                }}
            >on-chain</button>

            {showGuide && (
                <span
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: "absolute",
                        left: 4,
                        bottom: 24,
                        zIndex: 9999,
                        width: 230,
                        padding: "8px 10px",
                        background: "var(--panel)",
                        border: `1px solid ${accent}`,
                        borderRadius: 2,
                        boxShadow: "1px 1px 3px rgba(0,0,0,0.3)",
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: "var(--fg, #000)",
                        textAlign: "left",
                        whiteSpace: "normal",
                        fontWeight: "normal",
                        textTransform: "none",
                        letterSpacing: "normal",
                    }}
                >
                    <div style={{ fontWeight: "bold", marginBottom: 4 }}>On-chain inscription</div>
                    <div style={{ marginBottom: 6 }}>
                        This media is stored on {net.theme.chainLabel}. Confirm the transaction on {net.explorerName}, or open the gateway render.
                    </div>
                    <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "block", marginBottom: 3, color: accent, fontWeight: "bold", textDecoration: "none" }}
                    >
                        View on {net.explorerName}
                    </a>
                    <a
                        href={gatewayView}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "block", color: accent, textDecoration: "none" }}
                    >
                        Open on gateway
                    </a>
                </span>
            )}
        </span>
    );
}
