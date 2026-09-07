"use client";

// EVM wallet on injected EIP-1193 providers, discovered via EIP-6963 so ALL
// installed wallets (MetaMask, Robinhood Wallet, Rabby, ...) are selectable —
// not just whichever one won the legacy `window.ethereum` slot. connect() opens
// a picker (like the Solana modal); the chosen provider is used for signing.
// ethers v6 BrowserProvider, no wagmi.

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { BrowserProvider, type Signer } from "ethers";
import { resolveNetwork } from "../resolve";
import type { NetworkDescriptor } from "../types";

interface Eip1193 {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    isMetaMask?: boolean;
    isRobinhood?: boolean;
}

export interface WalletOption {
    id: string;      // EIP-6963 rdns, or "injected"
    name: string;
    icon?: string;   // data URI
    provider: Eip1193;
}

interface Eip6963Detail { info: { uuid: string; name: string; icon: string; rdns: string }; provider: Eip1193 }

function legacyInjected(): WalletOption | null {
    if (typeof window === "undefined") return null;
    const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum;
    if (!eth) return null;
    const name = eth.isRobinhood ? "Robinhood Wallet" : eth.isMetaMask ? "MetaMask" : "Injected Wallet";
    return { id: "injected", name, provider: eth };
}

async function ensureChain(eth: Eip1193, net: NetworkDescriptor): Promise<void> {
    if (!net.chainId) return;
    const hexId = "0x" + net.chainId.toString(16);
    try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (e) {
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
    connect: () => void;
    disconnect: () => void;
    getSigner: () => Promise<Signer>;
    // picker
    wallets: WalletOption[];
    modalOpen: boolean;
    closeModal: () => void;
    selectWallet: (opt: WalletOption) => Promise<void>;
}

const EvmWalletContext = createContext<EvmWalletValue | null>(null);

export function EvmWalletProvider({ children }: { children: React.ReactNode }) {
    const net = resolveNetwork();
    const [address, setAddress] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [wallets, setWallets] = useState<WalletOption[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const chosen = useRef<Eip1193 | null>(null);

    // EIP-6963 discovery: ask installed wallets to announce themselves.
    useEffect(() => {
        if (typeof window === "undefined") return;
        const found = new Map<string, WalletOption>();
        const onAnnounce = (ev: Event) => {
            const d = (ev as CustomEvent<Eip6963Detail>).detail;
            if (!d?.info || !d.provider) return;
            found.set(d.info.rdns, { id: d.info.rdns, name: d.info.name, icon: d.info.icon, provider: d.provider });
            setWallets([...found.values()]);
        };
        window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
        window.dispatchEvent(new Event("eip6963:requestProvider"));
        return () => window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
    }, []);

    // Pick up an already-authorized account + react to wallet changes.
    useEffect(() => {
        const eth = legacyInjected()?.provider;
        if (!eth) return;
        eth.request({ method: "eth_accounts" })
            .then((a) => { const l = a as string[]; if (l?.length) { setAddress(l[0]); chosen.current = eth; } })
            .catch(() => {});
        const onAccounts = (...args: unknown[]) => {
            const l = args[0] as string[];
            setAddress(l?.length ? l[0] : null);
        };
        eth.on?.("accountsChanged", onAccounts);
        return () => eth.removeListener?.("accountsChanged", onAccounts);
    }, []);

    const selectWallet = useCallback(async (opt: WalletOption) => {
        setConnecting(true);
        try {
            const accts = (await opt.provider.request({ method: "eth_requestAccounts" })) as string[];
            await ensureChain(opt.provider, net);
            chosen.current = opt.provider;
            setAddress(accts?.length ? accts[0] : null);
            setModalOpen(false);
        } finally {
            setConnecting(false);
        }
    }, [net]);

    const connect = useCallback(() => {
        // Prefer EIP-6963 list; fall back to the legacy injected provider.
        const opts = wallets.length ? wallets : ([legacyInjected()].filter(Boolean) as WalletOption[]);
        if (opts.length === 0) {
            window.open("https://metamask.io/download/", "_blank");
            return;
        }
        if (opts.length === 1) { void selectWallet(opts[0]); return; }
        setModalOpen(true);
    }, [wallets, selectWallet]);

    const disconnect = useCallback(() => { setAddress(null); chosen.current = null; }, []);

    const getSigner = useCallback(async (): Promise<Signer> => {
        const eth = chosen.current ?? legacyInjected()?.provider;
        if (!eth) throw new Error("No EVM wallet connected");
        await ensureChain(eth, net);
        return new BrowserProvider(eth as never).getSigner();
    }, [net]);

    const closeModal = useCallback(() => setModalOpen(false), []);

    return (
        <EvmWalletContext.Provider value={{
            address, connecting, connect, disconnect, getSigner,
            wallets: wallets.length ? wallets : ([legacyInjected()].filter(Boolean) as WalletOption[]),
            modalOpen, closeModal, selectWallet,
        }}>
            {children}
        </EvmWalletContext.Provider>
    );
}

export function useEvmWallet(): EvmWalletValue {
    const ctx = useContext(EvmWalletContext);
    if (!ctx) throw new Error("useEvmWallet must be used within EvmWalletProvider");
    return ctx;
}
