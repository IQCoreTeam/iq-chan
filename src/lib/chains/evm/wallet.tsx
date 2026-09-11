"use client";

// EVM wallet on injected EIP-1193 providers, discovered via EIP-6963 so ALL
// installed wallets (MetaMask, Robinhood Wallet, Rabby, ...) are selectable —
// not just whichever one won the legacy `window.ethereum` slot. connect() opens
// a picker (like the Solana modal); the chosen provider is used for signing.
// ethers v6 BrowserProvider, no wagmi.

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { BrowserProvider, type Signer } from "ethers";
import type { EthereumProvider } from "@walletconnect/ethereum-provider";
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
const WALLET_KEY = "iqchan:evm-wallet";

interface Eip1193 {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on?: (event: "accountsChanged" | "disconnect", handler: (...args: unknown[]) => void) => void;
    removeListener?: (event: "accountsChanged" | "disconnect", handler: (...args: unknown[]) => void) => void;
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
    if (Number(await eth.request({ method: "eth_chainId" })) === net.chainId) return;
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
            await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
        } else {
            throw e;
        }
    }
    if (Number(await eth.request({ method: "eth_chainId" })) !== net.chainId) {
        throw new Error(`Switch your wallet to ${net.theme.chainLabel} before posting.`);
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
    const stopListening = useRef<(() => void) | null>(null);
    const attempt = useRef(0);
    const wcRef = useRef<ReturnType<typeof EthereumProvider.init> | null>(null);

    const resetWallet = useCallback(() => {
        attempt.current++;
        stopListening.current?.();
        stopListening.current = null;
        chosen.current = null;
        setAddress(null);
        setConnecting(false);
    }, []);

    // Account changes must come from the selected wallet, not window.ethereum.
    const activateWallet = useCallback((eth: Eip1193, accounts: string[]) => {
        stopListening.current?.();
        chosen.current = eth;
        setAddress(accounts[0] ?? null);
        const onAccounts = (...args: unknown[]) => {
            if (chosen.current === eth) setAddress((args[0] as string[])[0] ?? null);
        };
        const onDisconnect = () => { if (chosen.current === eth) resetWallet(); };
        eth.on?.("accountsChanged", onAccounts);
        eth.on?.("disconnect", onDisconnect);
        stopListening.current = () => {
            eth.removeListener?.("accountsChanged", onAccounts);
            eth.removeListener?.("disconnect", onDisconnect);
        };
    }, [resetWallet]);

    // One lazy initialization, shared by manual connect and saved-session restore.
    const walletConnect = useCallback(() => {
        if (!wcRef.current) wcRef.current = (async () => {
            const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
            const chains: [number, ...number[]] = [net.chainId ?? 4663];
            const origin = window.location.origin;
            return EthereumProvider.init({
                projectId: WC_PROJECT_ID,
                chains,
                optionalChains: chains,
                showQrModal: true,
                rpcMap: net.rpcUrl ? { [chains[0]]: net.rpcUrl } : undefined,
                metadata: {
                    name: net.theme.siteName,
                    description: `${net.theme.siteName} onchain imageboard on ${net.theme.chainLabel}`,
                    url: origin,
                    icons: [origin + (net.theme.logo || "/favicon.ico")],
                },
            });
        })().catch((error) => { wcRef.current = null; throw error; });
        return wcRef.current;
    }, [net]);

    // Restore only the remembered provider: zero wallet RPCs for new visitors,
    // one eth_accounts read for a saved injected wallet, and no polling/prompts.
    useEffect(() => {
        let saved: string | null = null;
        try { saved = window.localStorage.getItem(WALLET_KEY); } catch { /* Storage may be disabled. */ }
        const currentAttempt = ++attempt.current;
        let restoring = false;
        const restore = (eth: Eip1193) => {
            if (restoring || attempt.current !== currentAttempt) return;
            restoring = true;
            void eth.request({ method: "eth_accounts" }).then((accounts) => {
                if (attempt.current === currentAttempt) activateWallet(eth, accounts as string[]);
            }).catch(() => {});
        };
        const found = new Map<string, WalletOption>();
        const onAnnounce = (ev: Event) => {
            const d = (ev as CustomEvent<Eip6963Detail>).detail;
            if (!d?.info || !d.provider) return;
            found.set(d.info.rdns, { id: d.info.rdns, name: d.info.name, icon: d.info.icon, provider: d.provider });
            setWallets([...found.values()]);
            if (d.info.rdns === saved) restore(d.provider);
        };
        window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
        window.dispatchEvent(new Event("eip6963:requestProvider"));
        if (saved === "injected") {
            const legacy = legacyInjected();
            if (legacy) restore(legacy.provider);
        } else if (saved === WC_OPTION_ID) {
            void walletConnect().then((wc) => {
                if (wc.session && attempt.current === currentAttempt) {
                    activateWallet(wc, wc.accounts);
                }
            }).catch(() => {});
        }
        return () => {
            attempt.current++;
            window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
            stopListening.current?.();
        };
    }, [activateWallet, walletConnect, net]);

    const selectWallet = useCallback(async (opt: WalletOption) => {
        const currentAttempt = ++attempt.current;
        setConnecting(true);
        try {
            let accts: string[];
            if (opt.id === WC_OPTION_ID) {
                const wc = await walletConnect();
                if (attempt.current !== currentAttempt) return;
                if (!wc.session) await wc.connect();
                opt = { ...opt, provider: wc };
                accts = wc.accounts;
            } else {
                accts = await opt.provider.request({ method: "eth_requestAccounts" }) as string[];
            }
            if (attempt.current !== currentAttempt) return;
            if (!accts.length) throw new Error("No account selected. Choose an account in your wallet.");
            await ensureChain(opt.provider, net);
            if (attempt.current !== currentAttempt) return;
            activateWallet(opt.provider, accts);
            // Persist the provider identity only; accounts/permissions stay in the wallet.
            try { window.localStorage.setItem(WALLET_KEY, opt.id); } catch { /* Connection still works without storage. */ }
            setModalOpen(false);
        } finally {
            if (attempt.current === currentAttempt) setConnecting(false);
        }
    }, [net, walletConnect, activateWallet]);

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
        resetWallet();
        try { window.localStorage.removeItem(WALLET_KEY); } catch { /* Storage may be disabled. */ }
        void wcRef.current?.then((wc) => wc.disconnect()).catch(() => {});
        wcRef.current = null;
    }, [resetWallet]);

    const getSigner = useCallback(async (): Promise<Signer> => {
        const eth = chosen.current;
        if (!eth || !address) throw new Error("No EVM wallet connected");
        const currentAttempt = attempt.current;
        await ensureChain(eth, net);
        if (chosen.current !== eth || attempt.current !== currentAttempt) throw new Error("Wallet connection changed. Please try again.");
        return new BrowserProvider(eth).getSigner(address);
    }, [net, address]);

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
