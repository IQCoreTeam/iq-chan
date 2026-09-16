"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { dexScreenerEmbed } from "../lib/dexscreener";
import SolanaTrade from "./solana-trade";

export default function SolanaTokenCard({ text }: { text: string }) {
    // Word boundaries prevent matching fragments of signatures or longer IDs.
    const candidate = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/)?.[0];
    let mint: string | undefined;
    try {
        if (candidate) mint = new PublicKey(candidate).toBase58();
    } catch {
        /* Not a public key. */
    }
    const [pair, setPair] = useState<{ mint: string; address: string; symbol: string } | null>(null);

    useEffect(() => {
        setPair(null);
        if (!mint) return;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        fetch(`https://api.dexscreener.com/token-pairs/v1/solana/${mint}`, { signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) throw new Error("Token lookup failed");
                const pairs = await response.json();
                if (!Array.isArray(pairs)) return;
                const best = pairs
                    .filter(
                        (p) =>
                            p.chainId === "solana" &&
                            p.baseToken?.address === mint &&
                            typeof p.pairAddress === "string" &&
                            /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.pairAddress),
                    )
                    .sort((a, b) => (Number(b.liquidity?.usd) || 0) - (Number(a.liquidity?.usd) || 0))[0];
                if (best && !controller.signal.aborted)
                    setPair({
                        mint: mint!,
                        address: best.pairAddress,
                        symbol: typeof best.baseToken.symbol === "string" ? best.baseToken.symbol : "Token",
                    });
            })
            .catch(() => {
                /* Unindexed addresses and outages leave the original post intact. */
            })
            .finally(() => clearTimeout(timeout));
        return () => {
            controller.abort();
            clearTimeout(timeout);
        };
    }, [mint]);

    if (!pair || pair.mint !== mint) return null;
    return (
        <div style={{ border: "1px solid currentColor", margin: "8px 0", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 10px" }}>
                <b style={{ overflowWrap: "anywhere" }}>${pair.symbol}</b>
                <a href={`https://solscan.io/token/${mint}`} target="_blank" rel="noreferrer">
                    {mint.slice(0, 6)}…{mint.slice(-4)}
                </a>
            </div>
            <iframe
                title={`${pair.symbol} price chart`}
                src={dexScreenerEmbed("solana", pair.address)}
                style={{ width: "100%", height: 300, border: 0, display: "block" }}
                loading="lazy"
            />
            <SolanaTrade key={mint} mint={mint} symbol={pair.symbol} />
        </div>
    );
}
