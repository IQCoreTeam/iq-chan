// Adapter loader. Resolves the active network once and dynamically imports the
// matching adapter, so a Solana visitor never downloads EVM code and vice
// versa (the import() is the bundle-split boundary). The result is cached per
// resolved network id.

import type { ChainReadAdapter } from "./types";
import { resolveNetwork } from "./resolve";

export { resolveNetwork, resolveNetworkId } from "./resolve";
export type { NetworkDescriptor, ChainReadAdapter } from "./types";

let cached: { id: string; adapter: Promise<ChainReadAdapter> } | null = null;

export function getChain(): Promise<ChainReadAdapter> {
    const net = resolveNetwork();
    if (cached && cached.id === net.id) return cached.adapter;
    const adapter = loadAdapter();
    cached = { id: net.id, adapter };
    return adapter;
}

async function loadAdapter(): Promise<ChainReadAdapter> {
    const net = resolveNetwork();
    if (net.family === "svm") {
        const { createSolanaReadAdapter } = await import("./solana/read");
        return createSolanaReadAdapter(net);
    }
    const { createEvmReadAdapter } = await import("./evm/read");
    return createEvmReadAdapter(net);
}
