"use client";

// Solana wallet-selection modal (the win95 panel formerly inline in
// wallet-button). It's Solana-specific — it lists wallet-adapter `wallets` and
// uses provider-managed selection/connection so React observes wallet events.
// Rendered by SolanaProviders; EVM has its own provider picker.

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "../../wallet-modal";

export default function SolanaWalletModal() {
    const { wallets, wallet: selectedWallet, select, connect, connected, connecting } = useWallet();
    const { open, closeWalletModal } = useWalletModal();
    const [error, setError] = useState("");

    useEffect(() => {
        if (connected) closeWalletModal();
    }, [connected, closeWalletModal]);

    useEffect(() => {
        const report = (error: Error) => setError(error.message || "Connection failed. Open your wallet and try again.");
        for (const { adapter } of wallets) adapter.on('error', report);
        return () => { for (const { adapter } of wallets) adapter.off('error', report); };
    }, [wallets]);

    if (!open) return null;

    async function handleSelect(wallet: (typeof wallets)[number]) {
        if (connecting) return;
        setError("");
        if (selectedWallet?.adapter === wallet.adapter) {
            try { await connect(); }
            catch (error) { setError(error instanceof Error ? error.message : "Connection failed"); }
        } else {
            // WalletProvider connects after selection and event listeners are ready.
            select(wallet.adapter.name);
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
                    background: "var(--panel)",
                    border: "2px outset var(--page-bg)",
                    fontFamily: "arial, helvetica, sans-serif",
                    fontSize: "13px",
                    minWidth: 260,
                    boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
                }}
            >
                {/* Title bar */}
                <div
                    style={{
                        background: "linear-gradient(90deg, #3a6ea5, var(--accent))",
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
                            background: "var(--panel)",
                            border: "2px outset var(--page-bg)",
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

                    {connecting && <p role="status" style={{color: "#000", marginBottom: 8}}>Open and unlock your wallet, then approve the connection there.</p>}
                    {wallets.length === 0 ? (
                        <div style={{
                            background: "#fff",
                            border: "2px inset var(--edge)",
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
                            border: "2px inset var(--edge)",
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
                        <p role="alert" style={{ color: "#d00", fontSize: "11px", marginTop: 6 }}>
                            {error} Open your wallet, then select it again to retry.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
