"use client";

// Chain-agnostic wallet button. Reads the active wallet from useChainWallet();
// connect() opens the Solana wallet-select modal (rendered by SolanaProviders)
// or requests accounts from the EVM injected provider, depending on the subtree.

import { useChainWallet } from "../lib/chains/context";

export default function WalletButton() {
    const { address, connect, disconnect } = useChainWallet();

    if (address) {
        return (
            <span style={{ fontSize: 12 }}>
                <span className="wallet-addr" style={{ fontFamily: "monospace" }}>
                    {address.slice(0, 4)}...{address.slice(-4)}
                </span>
                {" "}
                <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); disconnect(); }}
                    style={{ color: "#d00", textDecoration: "none" }}
                >
                    Disconnect
                </a>
            </span>
        );
    }

    return (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); connect(); }}
            style={{ color: "#34345c", textDecoration: "none", fontSize: 12 }}
        >
            [Connect Wallet]
        </a>
    );
}
