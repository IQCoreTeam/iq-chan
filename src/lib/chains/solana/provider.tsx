"use client";

// Solana subtree. Mounts the wallet-adapter stack and fills the two chain
// contexts (wallet + writer) plus the wallet-select modal, so everything above
// the boundary is chain-agnostic.

import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { RPC_ENDPOINT } from "../../config";
import { WalletModalProvider, useWalletModal } from "../../wallet-modal";
import { ChainWalletContext, WriterContext, type ChainWallet } from "../context";
import { useSolanaWriter } from "./writer";
import SolanaWalletModal from "./wallet-modal-ui";

function SolanaWiring({ children }: { children: React.ReactNode }) {
    const wallet = useWallet();
    const { openWalletModal } = useWalletModal();
    const writer = useSolanaWriter();

    const chainWallet: ChainWallet = {
        address: wallet.publicKey?.toBase58() ?? null,
        connecting: wallet.connecting,
        connect: openWalletModal,
        disconnect: () => { void wallet.disconnect(); },
        family: "svm",
    };

    return (
        <ChainWalletContext.Provider value={chainWallet}>
            <WriterContext.Provider value={writer}>
                <SolanaWalletModal />
                {children}
            </WriterContext.Provider>
        </ChainWalletContext.Provider>
    );
}

export default function SolanaProviders({ children }: { children: React.ReactNode }) {
    return (
        <ConnectionProvider endpoint={RPC_ENDPOINT}>
            <WalletProvider wallets={[]} autoConnect>
                <WalletModalProvider>
                    <SolanaWiring>{children}</SolanaWiring>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
