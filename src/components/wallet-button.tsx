"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export default function WalletButton() {
    const { publicKey, disconnect } = useWallet();
    const { setVisible } = useWalletModal();

    if (publicKey) {
        const addr = publicKey.toBase58();
        return (
            <span style={{ fontSize: 12 }}>
                <span style={{ fontFamily: "monospace" }}>
                    {addr.slice(0, 4)}...{addr.slice(-4)}
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
            onClick={(e) => { e.preventDefault(); setVisible(true); }}
            style={{ color: "#34345c", textDecoration: "none", fontSize: 12 }}
        >
            [Connect Wallet]
        </a>
    );
}
