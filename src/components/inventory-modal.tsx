"use client";

import { useEffect, useState } from "react";
import { useChainWallet } from "../lib/chains/context";
import { resolveNetwork } from "../lib/chains/resolve";
import { getChain, type ChainReadAdapter } from "../lib/chains";
import InscriptionImage from "./inscription-image";

// Picker over the connected wallet's code-in inscriptions (the same list
// iqlabs.dev "my inventory" shows). Clicking a thumbnail hands its bare tx
// signature back. Audio/video tiles use the existing row kind without fetching
// payloads; the compose preview loads the selected media with the shared renderer.
export default function InventoryModal({
    onPick,
    onClose,
}: {
    onPick: (sig: string) => void;
    onClose: () => void;
}) {
    const { address } = useChainWallet();
    const net = resolveNetwork();
    const [items, setItems] = useState<Awaited<ReturnType<ChainReadAdapter["listInventory"]>> | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        setItems(null);
        setError("");
        if (!address) return;
        let live = true;
        (async () => {
            try {
                const chain = await getChain();
                const list = await chain.listInventory(address);
                if (live) setItems(list);
            } catch (e) {
                if (live) setError(e instanceof Error ? e.message : "Failed to load inscriptions");
            }
        })();
        return () => { live = false; };
    }, [address]);

    return (
        <div
            style={{
                position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
                background: "rgba(0,0,0,0.25)", zIndex: 10000,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "var(--panel)", border: "2px outset var(--page-bg)",
                    fontFamily: "arial, helvetica, sans-serif", fontSize: 13,
                    width: 360, maxWidth: "92vw", boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
                }}
            >
                <div
                    style={{
                        background: `linear-gradient(90deg, #3a6ea5, ${net.theme.accent})`,
                        padding: "3px 4px", display: "flex",
                        justifyContent: "space-between", alignItems: "center",
                    }}
                >
                    <span style={{ color: "#fff", fontWeight: "bold", fontSize: 11, letterSpacing: 0.5 }}>
                        My inscriptions
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: "var(--panel)", border: "2px outset var(--page-bg)",
                            width: 18, height: 18, fontSize: 11, fontWeight: "bold",
                            lineHeight: "14px", cursor: "pointer", padding: 0, color: "#000",
                        }}
                    >
                        X
                    </button>
                </div>

                <div style={{ padding: "10px 12px" }}>
                    {!address ? <p>Connect your wallet to browse inscriptions.</p> : error ? (
                        <p style={{ color: "#d00", fontSize: 11, margin: 0 }}>{error}</p>
                    ) : items === null ? (
                        <p style={{ color: "#000", fontSize: 11, margin: 0 }}>Loading your inscriptions...</p>
                    ) : items.length === 0 ? (
                        <p style={{ color: "#000", fontSize: 11, margin: 0 }}>
                            No code-in inscriptions found for this wallet. Inscribe one at iqlabs.dev first.
                        </p>
                    ) : (
                        <div style={{
                            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6,
                            maxHeight: "60vh", overflowY: "auto",
                            background: "#fff", border: "2px inset var(--edge)", padding: 6,
                        }}>
                            {items.map(({ signature, kind }) => (
                                <button
                                    key={signature}
                                    type="button"
                                    aria-label={`Select ${kind} inscription ${signature.slice(0, 8)}`}
                                    onClick={() => { onPick(signature); onClose(); }}
                                    style={{ minWidth: 0, padding: 3, cursor: "pointer", border: "1px solid var(--edge)", background: "var(--panel)", color: "var(--fg, #000)", font: "inherit" }}
                                >
                                    {kind === "image" ? <InscriptionImage sig={signature} alt="" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }} /> : (
                                        <span style={{ display: "grid", placeItems: "center", aspectRatio: "1 / 1", fontWeight: "bold", border: "1px inset var(--edge)" }}>
                                            {kind === "audio" ? "Audio" : "Video"}
                                        </span>
                                    )}
                                    <span style={{ display: "block", marginTop: 3, fontSize: 11 }}>{kind} · {signature.slice(0, 6)}…</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {net.inscribeUrl && (
                    <div style={{ padding: "8px 12px", borderTop: "1px solid var(--edge)", textAlign: "center" }}>
                        <a
                            href={net.inscribeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 11, color: net.theme.accent, fontWeight: "bold", textDecoration: "none" }}
                        >
                            Want to make an on-chain attachment? Inscribe one on {net.theme.chainLabel}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
