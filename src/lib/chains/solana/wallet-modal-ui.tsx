"use client";

// Solana wallet-selection modal (the win95 panel formerly inline in
// wallet-button). It's Solana-specific — it lists wallet-adapter `wallets` and
// calls select()/adapter.connect() — so it lives in the Solana subtree and is
// rendered by SolanaProviders. On EVM there is no wallet list; connect() just
// requests accounts from the injected provider, so no equivalent is needed.

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "../../wallet-modal";

export default function SolanaWalletModal() {
    const { wallets, select, connecting } = useWallet();
    const { open, closeWalletModal } = useWalletModal();
    const [error, setError] = useState("");

    if (!open) return null;

    async function handleSelect(wallet: (typeof wallets)[number]) {
        setError("");
        try {
            select(wallet.adapter.name);
            // Connect directly on the adapter — bypasses the react state race
            // that causes WalletNotSelectedError when calling the hook's connect()
            // before useWallet's selected state has propagated.
            await wallet.adapter.connect();
            closeWalletModal();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Connection failed");
        }
    }

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.25)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
            onClick={() => closeWalletModal()}
        >
            {/* Win95-style raised panel */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#d6daf0",
                    border: "2px outset #eef2ff",
                    fontFamily: "arial, helvetica, sans-serif",
                    fontSize: "13px",
                    minWidth: 260,
                    boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
                }}
            >
                {/* Title bar */}
                <div
                    style={{
                        background: "linear-gradient(90deg, #3a6ea5, #98b0d7)",
                        padding: "3px 4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span style={{ color: "#fff", fontWeight: "bold", fontSize: "11px", letterSpacing: 0.5 }}>
                        Connect Wallet
                    </span>
                    <button
                        onClick={() => closeWalletModal()}
                        style={{
                            background: "#d6daf0",
                            border: "2px outset #eef2ff",
                            width: 18,
                            height: 18,
                            fontSize: "11px",
                            fontWeight: "bold",
                            lineHeight: "14px",
                            cursor: "pointer",
                            padding: 0,
                            color: "#000",
                        }}
                    >
                        X
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: "10px 12px" }}>
                    <p style={{ color: "#000", fontSize: "11px", marginBottom: 8 }}>
                        Select a wallet to connect:
                    </p>

                    {wallets.length === 0 ? (
                        <div style={{
                            background: "#fff",
                            border: "2px inset #b7c5d9",
                            padding: "12px",
                            textAlign: "center",
                        }}>
                            <p style={{ color: "#000", fontSize: "11px", marginBottom: 6 }}>
                                No wallets detected.
                            </p>
                            <a
                                href="https://phantom.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#0000ff", fontSize: "11px" }}
                            >
                                Get Phantom Wallet
                            </a>
                        </div>
                    ) : (
                        <div style={{
                            background: "#fff",
                            border: "2px inset #b7c5d9",
                            padding: 2,
                        }}>
                            {wallets.map((wallet) => (
                                <button
                                    key={wallet.adapter.name}
                                    onClick={() => handleSelect(wallet)}
                                    disabled={connecting}
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "4px 6px",
                                        background: "transparent",
                                        border: "1px dotted transparent",
                                        cursor: connecting ? "wait" : "pointer",
                                        fontFamily: "arial, helvetica, sans-serif",
                                        fontSize: "11px",
                                        textAlign: "left",
                                        color: "#000",
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.border = "1px dotted #000";
                                        e.currentTarget.style.background = "#3a6ea5";
                                        e.currentTarget.style.color = "#fff";
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.border = "1px dotted transparent";
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#000";
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.border = "1px dotted #000";
                                        e.currentTarget.style.background = "#3a6ea5";
                                        e.currentTarget.style.color = "#fff";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (document.activeElement !== e.currentTarget) {
                                            e.currentTarget.style.border = "1px dotted transparent";
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = "#000";
                                        }
                                    }}
                                >
                                    {wallet.adapter.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {error && (
                        <p style={{ color: "#d00", fontSize: "11px", marginTop: 6 }}>
                            {error}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
