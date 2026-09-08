// The network registry. Adding a chain is a single entry here plus (when it
// gets its own site) one HOSTNAME_MAP line and its theme assets. No adapter
// code changes — the EVM adapter is network-agnostic and reads these values.
//
// Contract addresses / chainIds mirror @iqlabs-official/ethereum-sdk's
// networks.ts; the SDK resolves them from `sdkMode` via setNetwork(), so they
// are duplicated here only for the wallet network-switch prompt and explorer
// links, not for signing.

import type { NetworkDescriptor } from "./types";

export const NETWORKS: Record<string, NetworkDescriptor> = {
    // ── Solana (original surface, blockchan.sol.site) ────────────────────────
    solana: {
        id: "solana",
        family: "svm",
        currency: "SOL",
        explorerTxUrl: "https://solscan.io/tx/",
        explorerName: "Solscan",
        // no gatewayNetworkParam: Solana is the gateway default
        theme: {
            siteName: "BlockChan",
            chainLabel: "Solana",
            accent: "#800000",
            logo: "/blockchan.webp",
            ogImage: "/og-image.webp",
        },
    },

    // ── Robinhood Chain (launch EVM target, hoodchan.xyz) ────────────────────
    // Mainnet contract live + Blockscout-verified. No testnet exists, so EVM
    // development/testing happens on monadTestnet (see below).
    robinhood: {
        id: "robinhood",
        family: "evm",
        currency: "ETH",
        explorerTxUrl: "https://robinhoodchain.blockscout.com/tx/",
        explorerName: "Blockscout",
        gatewayNetworkParam: "robinhood",
        sdkMode: "robinhood",
        chainId: 4663,
        rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
        theme: {
            siteName: "HoodChan",
            chainLabel: "Robinhood Chain",
            accent: "#00c805",
            logo: "/hoodchan.webp",
            ogImage: "/hoodchan.webp",
            favicon: "/hoodchan/favicon.png",
            appleIcon: "/hoodchan/apple-icon.png",
        },
    },

    // ── Monad testnet (EVM dev/test target — free faucet) ────────────────────
    monadTestnet: {
        id: "monadTestnet",
        family: "evm",
        currency: "MON",
        explorerTxUrl: "https://testnet.monadexplorer.com/tx/",
        explorerName: "Monad Explorer",
        gatewayNetworkParam: "monadTestnet",
        sdkMode: "monadTestnet",
        chainId: 10143,
        rpcUrl: "https://testnet-rpc.monad.xyz",
        theme: {
            siteName: "MonChan (testnet)",
            chainLabel: "Monad Testnet",
            accent: "#836EF9",
        },
    },

    // ── Ready but no dedicated site yet (no HOSTNAME_MAP entry) ───────────────
    // Reachable only via ?NEXT_PUBLIC_NETWORK build override until they get a
    // domain. Proves the registry-not-code claim: these needed zero adapter work.
    monad: {
        id: "monad",
        family: "evm",
        currency: "MON",
        explorerTxUrl: "https://monadexplorer.com/tx/",
        explorerName: "Monad Explorer",
        gatewayNetworkParam: "monad",
        sdkMode: "monad",
        chainId: 143,
        rpcUrl: "https://rpc.monad.xyz",
        theme: {
            siteName: "MonChan",
            chainLabel: "Monad",
            accent: "#836EF9",
        },
    },
    sepolia: {
        id: "sepolia",
        family: "evm",
        currency: "ETH",
        explorerTxUrl: "https://sepolia.etherscan.io/tx/",
        explorerName: "Etherscan",
        gatewayNetworkParam: "sepolia",
        sdkMode: "sepolia",
        chainId: 11155111,
        rpcUrl: "https://rpc.sepolia.org",
        theme: {
            siteName: "SepoliaChan",
            chainLabel: "Ethereum Sepolia",
            accent: "#627eea",
        },
    },
};

// hostname (lowercased, no port) → network id. www. prefix is stripped before
// lookup. Anything unmapped falls back to DEFAULT_NETWORK_ID.
export const HOSTNAME_MAP: Record<string, string> = {
    "blockchan.sol.site": "solana",
    "hoodchan.xyz": "robinhood",
};

export const DEFAULT_NETWORK_ID = "solana";
