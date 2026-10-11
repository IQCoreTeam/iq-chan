"use client";

import { useState } from "react";
import { getFallbacks } from "../lib/config";
import { resolveNetwork } from "../lib/chains/resolve";
import { inscriptionSrcCandidates } from "../lib/inscription";

// One source for an inscription rendered through the gateway: the <img> walks to
// the next gateway/candidate on error (a dead gateway, or a text/ascii row that
// /img cannot rasterize but /render can) and lands on /404.webp when exhausted.
// The gateway host is assembled here at render time, never stored on chain, so a
// gateway move needs no post rewrite. Used by the post attachment and the
// inventory picker grid.
export default function InscriptionImage({
    sig,
    alt,
    style,
    className,
    onClick,
}: {
    sig: string;
    alt?: string;
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
}) {
    const net = resolveNetwork();
    const candidates = inscriptionSrcCandidates(sig, getFallbacks(), net.gatewayNetworkParam);
    const [idx, setIdx] = useState(0);
    const exhausted = idx >= candidates.length;

    return (
        <img
            src={exhausted ? "/404.webp" : candidates[idx]}
            alt={alt ?? `on-chain inscription ${sig.slice(0, 8)}`}
            loading="lazy"
            className={className}
            onClick={onClick}
            onError={() => setIdx((i) => i + 1)}
            style={style}
        />
    );
}
