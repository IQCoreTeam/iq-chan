"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { RPC_ENDPOINT } from "../lib/config";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ConnectionProvider endpoint={RPC_ENDPOINT}>
            <WalletProvider wallets={[]} autoConnect>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}
