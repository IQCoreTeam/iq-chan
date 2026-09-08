"use client";

// EVM wallet picker (win95 panel, matching the Solana one). Lists every wallet
// discovered via EIP-6963 so the user can pick Robinhood Wallet, MetaMask, etc.
// Rendered by EvmProviders; driven by useEvmWallet() modal state.

import { useState } from "react";
import { useEvmWallet, type WalletOption } from "./wallet";

export default function EvmWalletModal() {
    const { modalOpen, closeModal, wallets, selectWallet, connecting } = useEvmWallet();
    const [error, setError] = useState("");

    if (!modalOpen) return null;

    async function onPick(opt: WalletOption) {
        setError("");
        try {
            await selectWallet(opt);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Connection failed");
        }
    }

    return (
        <div
            style={{
                position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
                background: "rgba(0,0,0,0.25)", zIndex: 9999,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onClick={() => closeModal()}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#d6f0da", border: "2px outset #eefff2",
                    fontFamily: "arial, helvetica, sans-serif", fontSize: "13px",
                    minWidth: 260, boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
                }}
            >
                <div style={{
                    background: "linear-gradient(90deg, #0b7a2f, #57b979)", padding: "3px 4px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <span style={{ color: "#fff", fontWeight: "bold", fontSize: "11px", letterSpacing: 0.5 }}>
                        Connect Wallet
                    </span>
                    <button
                        onClick={() => closeModal()}
                        style={{
                            background: "#d6f0da", border: "2px outset #eefff2", width: 18, height: 18,
                            fontSize: "11px", fontWeight: "bold", lineHeight: "14px", cursor: "pointer",
                            padding: 0, color: "#000",
                        }}
                    >
                        X
                    </button>
                </div>

                <div style={{ padding: "10px 12px" }}>
                    <p style={{ color: "#000", fontSize: "11px", marginBottom: 8 }}>
                        Select a wallet to connect:
                    </p>

                    {wallets.length === 0 ? (
                        <div style={{ background: "#fff", border: "2px inset #b7d9bf", padding: "12px", textAlign: "center" }}>
                            <p style={{ color: "#000", fontSize: "11px", marginBottom: 6 }}>No wallets detected.</p>
                            <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" style={{ color: "#0b7a2f", fontSize: "11px" }}>
                                Get a wallet
                            </a>
                        </div>
                    ) : (
                        <div style={{ background: "#fff", border: "2px inset #b7d9bf", padding: 2 }}>
                            {wallets.map((w) => (
                                <button
                                    key={w.id}
                                    onClick={() => onPick(w)}
                                    disabled={connecting}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                                        padding: "5px 6px", background: "transparent", border: "1px dotted transparent",
                                        cursor: connecting ? "wait" : "pointer",
                                        fontFamily: "arial, helvetica, sans-serif", fontSize: "12px",
                                        textAlign: "left", color: "#000",
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.border = "1px dotted #000"; e.currentTarget.style.background = "#0b7a2f"; e.currentTarget.style.color = "#fff"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.border = "1px dotted transparent"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#000"; }}
                                >
                                    {w.icon && <img src={w.icon} alt="" width={16} height={16} style={{ display: "block" }} />}
                                    <span>
                                        {w.name}
                                        {w.id === "walletconnect" && (
                                            <span style={{ display: "block", fontSize: "10px", opacity: 0.7 }}>
                                                WalletConnect · scan QR with any mobile wallet
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {error && <p style={{ color: "#d00", fontSize: "11px", marginTop: 6 }}>{error}</p>}
                </div>
            </div>
        </div>
    );
}
