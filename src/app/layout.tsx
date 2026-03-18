"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import Header from "../components/header";
import { RPC_ENDPOINT } from "../lib/config";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const wallets = useMemo(
        () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
        [],
    );

    return (
        <html lang="en">
            <body className="bg-[#ffffee] text-gray-900 min-h-screen">
                <ConnectionProvider endpoint={RPC_ENDPOINT}>
                    <WalletProvider wallets={wallets} autoConnect>
                        <WalletModalProvider>
                            <Header />
                            <main className="max-w-3xl mx-auto py-4 px-2">
                                {children}
                            </main>
                        </WalletModalProvider>
                    </WalletProvider>
                </ConnectionProvider>
            </body>
        </html>
    );
}
