// Chain abstraction boundary. Everything above this line (pages, components,
// read hooks) is chain-agnostic and talks only to a `ChainAdapter`. Everything
// chain-specific (Solana PDAs / wallet-adapter, EVM ethereum-sdk / injected
// wallet) lives in chains/solana and chains/evm behind this interface.
//
// The split axis is SVM vs EVM (two code paths). Within EVM, chains differ only
// by NetworkDescriptor values (chainId, contract, currency, theme) — one EVM
// adapter serves robinhood/monad/ethereum. Adding a chain = a networks.ts entry,
// never new adapter code.

import type { ThreadEntry, ThreadResult, BoardGate } from "../types";

export type ChainFamily = "svm" | "evm";

export interface NetworkTheme {
    /** Product name in header/title, e.g. "BlockChan", "HoodChan". */
    siteName: string;
    /** Human chain label for copy, e.g. "Solana", "Robinhood Chain". */
    chainLabel: string;
    /** Primary accent color (CSS value) injected as a custom property. */
    accent: string;
    /** public/ subdirectory for random banners; falls back to default set. */
    bannerDir?: string;
    /** public/ subdirectory for no-image placeholders; falls back to default. */
    placeholderDir?: string;
    /** Logo asset path under public/, if the chain ships a distinct one. */
    logo?: string;
    /** Open Graph / link-preview image under public/ (per chain branding). */
    ogImage?: string;
    /** Browser and home-screen icons for this chain's branding. */
    favicon?: string;
    appleIcon?: string;
}

export interface NetworkDescriptor {
    /** Stable id used in the hostname map, env override, and logs. */
    id: string;
    family: ChainFamily;
    /** Gas/native currency ticker shown in UI copy: "SOL" | "ETH" | "MON". */
    currency: string;
    /** Explorer tx URL prefix; adapter.explorerTx() appends the id. */
    explorerTxUrl: string;
    /** Human label for the explorer link ("Solscan", "Blockscout"). */
    explorerName: string;
    /** EVM only: value for the gateway `?network=` param. Omit for Solana
     *  (Solana is the gateway default and takes no param). */
    gatewayNetworkParam?: string;
    /** EVM only: ethereum-sdk setNetwork() mode. */
    sdkMode?: string;
    /** EVM only: expected chainId (used to prompt wallet network switch). */
    chainId?: number;
    /** EVM only: default RPC for the write path when the wallet has none. */
    rpcUrl?: string;
    theme: NetworkTheme;
}

// The read surface every adapter implements. Each method maps 1:1 to one read
// hook so the hooks carry no chain logic. Writes live in the wallet hook (they
// need React context) and are dispatched separately by family.
export interface ChainReadAdapter {
    readonly net: NetworkDescriptor;

    /** Board feed, phase 1: threads with OPs, no reply previews yet. */
    listThreads(boardId: string): Promise<ThreadEntry[]>;
    /** Board feed, phase 2: fill in one thread's reply previews. */
    getThreadPreviews(entry: ThreadEntry): Promise<ThreadEntry>;
    /** Thread view: OP + replies, with edit/delete instructions already merged. */
    getThread(boardId: string | undefined, threadRef: string): Promise<ThreadResult>;
    /** Token/collection gate config for a board's table. */
    getBoardGate(boardId: string): Promise<BoardGate>;
}
