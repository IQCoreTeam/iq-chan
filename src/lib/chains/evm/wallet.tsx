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

// Public WalletConnect (Reown) project id — client-side, not a secret. Lets
// mobile wallets that don't inject a desktop provider (Robinhood Wallet, etc.)
// connect over QR / deep link. Env override for other deploys.
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "7a1b344e1cb6addd4f946258b44d0b89";

// Synthetic picker entry id for the WalletConnect path. Labeled "Robinhood
// Wallet" on hoodchan so ordinary users pick it without knowing what
// WalletConnect is; it opens the WC QR / deep-link flow underneath.
const WC_OPTION_ID = "walletconnect";

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

// The synthetic WalletConnect entry shown in the picker. On robinhood it reads
// "Robinhood Wallet" (the wallet users will actually scan with); elsewhere it's
// a generic WalletConnect entry. provider is a placeholder — selectWallet routes
// this id to the WC init flow, not the injected request path.
function wcOption(net: NetworkDescriptor): WalletOption {
    const name = net.id === "robinhood" ? "Robinhood Wallet" : "WalletConnect";
    return { id: WC_OPTION_ID, name, provider: {} as Eip1193 };
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

    const wcRef = useRef<{ disconnect: () => Promise<void> } | null>(null);

    // WalletConnect path: lazy-loaded so it stays out of the initial bundle.
    // Opens the WC QR / deep-link modal; the resulting session provider is
    // EIP-1193, so the rest of the app (getSigner, ensureChain) is unchanged.
    const connectWalletConnect = useCallback(async () => {
        setConnecting(true);
        try {
            const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
            const cid = net.chainId ?? 4663;
            const chains: [number, ...number[]] = [cid];
            const origin = typeof window !== "undefined" ? window.location.origin : "https://hoodchan.xyz";
            const wc = await EthereumProvider.init({
                projectId: WC_PROJECT_ID,
                chains,
                optionalChains: chains,
                showQrModal: true,
                rpcMap: net.rpcUrl ? { [cid]: net.rpcUrl } : undefined,
                metadata: {
                    name: net.theme.siteName,
                    description: `${net.theme.siteName} onchain imageboard on ${net.theme.chainLabel}`,
                    url: origin,
                    icons: [origin + (net.theme.logo || "/favicon.ico")],
                },
            });
            await wc.connect();
            const accts = (wc.accounts || []) as string[];
            chosen.current = wc as unknown as Eip1193;
            wcRef.current = wc as unknown as { disconnect: () => Promise<void> };
            setAddress(accts.length ? accts[0] : null);
            setModalOpen(false);
            wc.on?.("accountsChanged", (...a: unknown[]) => {
                const l = a[0] as string[];
                setAddress(l?.length ? l[0] : null);
            });
            wc.on?.("disconnect", () => { setAddress(null); chosen.current = null; wcRef.current = null; });
        } finally {
            setConnecting(false);
        }
    }, [net]);

    const selectWallet = useCallback(async (opt: WalletOption) => {
        if (opt.id === WC_OPTION_ID) { await connectWalletConnect(); return; }
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
    }, [net, connectWalletConnect]);

    const connect = useCallback(() => {
        // EIP-6963 injected wallets (or the legacy slot) plus the WalletConnect
        // entry, which is always offered so mobile wallets work even with no
        // injected provider. One option total -> connect straight away.
        const injected = wallets.length ? wallets : ([legacyInjected()].filter(Boolean) as WalletOption[]);
        const opts = [...injected, wcOption(net)];
        if (opts.length === 1) { void selectWallet(opts[0]); return; }
        setModalOpen(true);
    }, [wallets, selectWallet, net]);

    const disconnect = useCallback(() => {
        void wcRef.current?.disconnect().catch(() => {});
        wcRef.current = null;
        setAddress(null);
        chosen.current = null;
    }, []);

    const getSigner = useCallback(async (): Promise<Signer> => {
        const eth = chosen.current ?? legacyInjected()?.provider;
        if (!eth) throw new Error("No EVM wallet connected");
        await ensureChain(eth, net);
        return new BrowserProvider(eth as never).getSigner();
    }, [net]);

    const closeModal = useCallback(() => setModalOpen(false), []);

    const injectedList = wallets.length ? wallets : ([legacyInjected()].filter(Boolean) as WalletOption[]);
    const pickerWallets = [...injectedList, wcOption(net)];

    return (
        <EvmWalletContext.Provider value={{
            address, connecting, connect, disconnect, getSigner,
            wallets: pickerWallets,
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
