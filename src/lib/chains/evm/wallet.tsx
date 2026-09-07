"use client";

// Minimal EVM wallet on the injected EIP-1193 provider (window.ethereum) +
// ethers v6 BrowserProvider — no wagmi/viem, matching iq-chan's framework-free
// wallet approach and keeping the EVM bundle light. Single injected wallet for
// v1 (EIP-6963 multi-wallet selection can come later).

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrowserProvider, type Signer } from "ethers";
import { resolveNetwork } from "../resolve";
import type { NetworkDescriptor } from "../types";

interface Eip1193 {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

function getInjected(): Eip1193 | undefined {
    if (typeof window === "undefined") return undefined;
    return (window as unknown as { ethereum?: Eip1193 }).ethereum;
}

async function ensureChain(eth: Eip1193, net: NetworkDescriptor): Promise<void> {
    if (!net.chainId) return;
    const hexId = "0x" + net.chainId.toString(16);
    try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (e) {
        // 4902 = chain not added to the wallet yet; add it, then it's selected.
        if ((e as { code?: number }).code === 4902) {
            const explorer = net.explorerTxUrl.replace(/\/tx\/?$/, "");
            await eth.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: hexId,
                    chainName: net.theme.chainLabel,
                    nativeCurrency: { name: net.currency, symbol: net.currency, decimals: 18 },
                    rpcUrls: net.rpcUrl ? [net.rpcUrl] : [],
                    blockExplorerUrls: explorer ? [explorer] : [],
                }],
            });
        } else {
            throw e;
        }
    }
}

interface EvmWalletValue {
    address: string | null;
    connecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    getSigner: () => Promise<Signer>;
}

const EvmWalletContext = createContext<EvmWalletValue | null>(null);

export function EvmWalletProvider({ children }: { children: React.ReactNode }) {
    const net = resolveNetwork();
    const [address, setAddress] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);

    // Pick up an already-authorized account and react to wallet-side changes.
    useEffect(() => {
        const eth = getInjected();
        if (!eth) return;

        eth.request({ method: "eth_accounts" })
            .then((accts) => {
                const list = accts as string[];
                if (list && list.length) setAddress(list[0]);
            })
            .catch(() => {});

        const onAccounts = (...args: unknown[]) => {
            const list = args[0] as string[];
            setAddress(list && list.length ? list[0] : null);
        };
        const onChain = () => { /* re-render; chain switches are handled at connect() */ };

        eth.on?.("accountsChanged", onAccounts);
        eth.on?.("chainChanged", onChain);
        return () => {
            eth.removeListener?.("accountsChanged", onAccounts);
            eth.removeListener?.("chainChanged", onChain);
        };
    }, []);

    const connect = useCallback(async () => {
        const eth = getInjected();
        if (!eth) {
            window.open("https://metamask.io/download/", "_blank");
            return;
        }
        setConnecting(true);
        try {
            const accts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
            await ensureChain(eth, net);
            setAddress(accts && accts.length ? accts[0] : null);
        } finally {
            setConnecting(false);
        }
    }, [net]);

    const disconnect = useCallback(() => {
        // EIP-1193 has no programmatic disconnect; forget locally.
        setAddress(null);
    }, []);

    const getSigner = useCallback(async (): Promise<Signer> => {
        const eth = getInjected();
        if (!eth) throw new Error("No EVM wallet found");
        await ensureChain(eth, net);
        const provider = new BrowserProvider(eth as never);
        return provider.getSigner();
    }, [net]);

    return (
        <EvmWalletContext.Provider value={{ address, connecting, connect, disconnect, getSigner }}>
            {children}
        </EvmWalletContext.Provider>
    );
}

export function useEvmWallet(): EvmWalletValue {
    const ctx = useContext(EvmWalletContext);
    if (!ctx) throw new Error("useEvmWallet must be used within EvmWalletProvider");
    return ctx;
}
