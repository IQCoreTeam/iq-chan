"use client";

// EVM subtree. Mounts the injected-wallet provider and fills the two chain
// contexts, mirroring SolanaProviders so the app above the boundary is identical.

import { EvmWalletProvider, useEvmWallet } from "./wallet";
import { useEvmWriter } from "./writer";
import { ChainWalletContext, WriterContext, type ChainWallet } from "../context";

function EvmWiring({ children }: { children: React.ReactNode }) {
    const w = useEvmWallet();
    const writer = useEvmWriter();

    const chainWallet: ChainWallet = {
        address: w.address,
        connecting: w.connecting,
        connect: () => { void w.connect(); },
        disconnect: w.disconnect,
        family: "evm",
    };

    return (
        <ChainWalletContext.Provider value={chainWallet}>
            <WriterContext.Provider value={writer}>
                {children}
            </WriterContext.Provider>
        </ChainWalletContext.Provider>
    );
}

export default function EvmProviders({ children }: { children: React.ReactNode }) {
    return (
        <EvmWalletProvider>
            <EvmWiring>{children}</EvmWiring>
        </EvmWalletProvider>
    );
}
