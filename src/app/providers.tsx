"use client";

// Root provider: mounts exactly one chain subtree, chosen by the resolved
// network's family. Each subtree is dynamically imported (ssr:false) so a
// Solana visitor never downloads the EVM wallet/SDK code and vice versa — the
// import() boundary is where the bundle splits. The app is a client-rendered
// hash-routed SPA, so client-only mounting is expected.

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { resolveNetwork } from "../lib/chains/resolve";

const SolanaProviders = dynamic(() => import("../lib/chains/solana/provider"), { ssr: false });
const EvmProviders = dynamic(() => import("../lib/chains/evm/provider"), { ssr: false });

export default function Providers({ children }: { children: React.ReactNode }) {
    const net = resolveNetwork();

    // Tag <html> so per-network CSS (e.g. the Robinhood green theme) can scope
    // to the active chain without touching the static server-rendered markup.
    useEffect(() => {
        document.documentElement.setAttribute("data-net", net.id);
        document.documentElement.setAttribute("data-family", net.family);
    }, [net.id, net.family]);

    const Chain = net.family === "evm" ? EvmProviders : SolanaProviders;
    return <Chain>{children}</Chain>;
}
