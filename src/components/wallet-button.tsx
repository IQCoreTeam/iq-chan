"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export default function WalletButton() {
    const { publicKey, disconnect } = useWallet();
    const { setVisible } = useWalletModal();

    if (publicKey) {
        const addr = publicKey.toBase58();
        return (
            <div className="flex items-center gap-2 text-sm">
                <span className="font-mono">
                    {addr.slice(0, 4)}...{addr.slice(-4)}
                </span>
                <button
                    onClick={() => disconnect()}
                    className="text-red-600 hover:underline"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setVisible(true)}
            className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
        >
            Connect Wallet
        </button>
    );
}
