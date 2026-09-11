import { expect, mock, test } from "bun:test";
import { JSDOM } from "jsdom";
import { act, StrictMode } from "react";
import { EvmWalletProvider, useEvmWallet, type WalletOption } from "../src/lib/chains/evm/wallet";

const ADDRESS = `0x${"1".repeat(40)}`;
const OTHER = `0x${"2".repeat(40)}`;
const KEY = "iqchan:evm-wallet";

function provider(accounts = [ADDRESS]) {
    const calls: string[] = [];
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    return {
        calls, accounts, chainId: "0x1237", rejected: false, unknownChain: false,
        async request({ method }: { method: string; params?: unknown[] }): Promise<unknown> {
            calls.push(method);
            if (method === "eth_requestAccounts" && this.rejected) throw Object.assign(new Error("Rejected"), { code: 4001 });
            if (method === "eth_accounts" || method === "eth_requestAccounts") return this.accounts;
            if (method === "eth_chainId") return this.chainId;
            if (method === "wallet_switchEthereumChain") {
                if (this.unknownChain) throw Object.assign(new Error("Unknown chain"), { code: 4902 });
                this.chainId = "0x1237";
                return null;
            }
            if (method === "wallet_addEthereumChain") { this.unknownChain = false; return null; }
            throw new Error(`Unexpected wallet request: ${method}`);
        },
        on(event: string, fn: (...args: unknown[]) => void) {
            if (!listeners.has(event)) listeners.set(event, new Set());
            listeners.get(event)!.add(fn);
        },
        removeListener(event: string, fn: (...args: unknown[]) => void) { listeners.get(event)?.delete(fn); },
        emit(event: string, value?: unknown) { for (const fn of listeners.get(event) ?? []) fn(value); },
        listenerCount(event: string) { return listeners.get(event)?.size ?? 0; },
    };
}

let wc = {
    ...provider(), session: undefined as object | undefined, connects: 0, disconnects: 0,
    async connect() { this.connects++; this.session = {}; },
    async disconnect() { this.disconnects++; this.session = undefined; this.emit("disconnect"); },
};
let wcInits = 0;
mock.module("@walletconnect/ethereum-provider", () => ({ EthereumProvider: { init: async () => { wcInits++; return wc; } } }));

async function mount({ saved, wallets = [], legacy, blockedStorage = false, strict = false }: {
    saved?: string; wallets?: WalletOption[]; legacy?: WalletOption["provider"]; blockedStorage?: boolean; strict?: boolean;
} = {}) {
    wcInits = 0;
    wc = { ...provider(), session: undefined, connects: 0, disconnects: 0,
        async connect() { this.connects++; this.session = {}; },
        async disconnect() { this.disconnects++; this.session = undefined; this.emit("disconnect"); },
    };
    const dom = new JSDOM('<div id="root"></div>', { url: "https://hoodchan.xyz/" });
    const previous = new Map<string, PropertyDescriptor | undefined>();
    for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
        Event: dom.window.Event, CustomEvent: dom.window.CustomEvent, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true })) {
        previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    if (saved) dom.window.localStorage.setItem(KEY, saved);
    if (blockedStorage) Object.defineProperty(dom.window, "localStorage", { get() { throw new Error("Storage unavailable"); } });
    Object.defineProperty(dom.window, "ethereum", { value: legacy });
    const announce = (wallet: WalletOption) => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
        detail: { info: { rdns: wallet.id, name: wallet.name, uuid: wallet.id, icon: "" }, provider: wallet.provider },
    }));
    dom.window.addEventListener("eip6963:requestProvider", () => wallets.forEach(announce));
    let value!: ReturnType<typeof useEvmWallet>;
    function Consumer() { value = useEvmWallet(); return <div>{value.address ?? "disconnected"}</div>; }
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    let key = 0;
    const remount = async () => { await act(async () => {
        const tree = <EvmWalletProvider key={++key}><Consumer /></EvmWalletProvider>;
        root.render(strict ? <StrictMode>{tree}</StrictMode> : tree);
    }); };
    await remount();
    return {
        get wallet() { return value; }, announce, remount,
        async close() {
            await act(async () => root.unmount());
            dom.window.close();
            for (const [key, descriptor] of previous) {
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else Reflect.deleteProperty(globalThis, key);
            }
        },
    };
}

const option = (p: WalletOption["provider"], id = "io.metamask"): WalletOption => ({ id, name: id, provider: p });

test("first load never calls the default wallet router or asks any wallet to connect", async () => {
    const metamask = provider(), phantom = provider([OTHER]);
    const app = await mount({ legacy: phantom, wallets: [option(metamask), option(phantom, "app.phantom")], strict: true });
    try {
        expect(app.wallet.address).toBeNull();
        expect(app.wallet.modalOpen).toBe(false);
        expect(metamask.calls).toEqual([]);
        expect(phantom.calls).toEqual([]);
        expect(wcInits).toBe(0);
        await expect(app.wallet.getSigner()).rejects.toThrow("No EVM wallet connected");
        expect(phantom.calls).toEqual([]);
    } finally { await app.close(); }
});

test("selected MetaMask survives reload without calling Phantom or requesting permissions again", async () => {
    const metamask = provider(), phantom = provider([OTHER]);
    const meta = option(metamask);
    const app = await mount({ legacy: phantom, wallets: [meta, option(phantom, "app.phantom")] });
    try {
        await act(async () => app.wallet.selectWallet(meta));
        expect(app.wallet.address).toBe(ADDRESS);
        expect(localStorage.getItem(KEY)).toBe("io.metamask");
        expect(metamask.calls).toEqual(["eth_requestAccounts", "eth_chainId"]);
        metamask.calls.length = 0;
        await app.remount();
        expect(app.wallet.address).toBe(ADDRESS);
        expect(metamask.calls).toEqual(["eth_accounts"]);
        expect(phantom.calls).toEqual([]);
        expect(metamask.listenerCount("accountsChanged")).toBe(1);
        await act(async () => phantom.emit("accountsChanged", [OTHER]));
        expect(app.wallet.address).toBe(ADDRESS);
        metamask.accounts = [OTHER];
        await act(async () => metamask.emit("accountsChanged", [OTHER]));
        expect(app.wallet.address).toBe(OTHER);
        const signer = await app.wallet.getSigner();
        expect(await signer.getAddress()).toBe(OTHER);
        expect(phantom.calls).toEqual([]);
        expect(metamask.calls).not.toContain("wallet_switchEthereumChain");
        expect(metamask.calls).not.toContain("eth_requestAccounts");
    } finally { await app.close(); }
    expect(metamask.listenerCount("accountsChanged")).toBe(0);
    expect(metamask.listenerCount("disconnect")).toBe(0);
});

test("late EIP-6963 discovery restores only the saved wallet and ignores duplicate announcements", async () => {
    const metamask = provider(), phantom = provider();
    const app = await mount({ saved: "io.metamask", legacy: phantom, wallets: [option(phantom, "app.phantom")] });
    try {
        expect(phantom.calls).toEqual([]);
        expect(app.wallet.address).toBeNull();
        await act(async () => { app.announce(option(metamask)); app.announce(option(metamask)); });
        expect(app.wallet.address).toBe(ADDRESS);
        expect(metamask.calls).toEqual(["eth_accounts"]);
        expect(app.wallet.wallets.filter(w => w.id === "io.metamask")).toHaveLength(1);
    } finally { await app.close(); }
});

test("locked or revoked accounts stay disconnected without permission prompts", async () => {
    const metamask = provider([]);
    const app = await mount({ saved: "io.metamask", wallets: [option(metamask)] });
    try {
        expect(app.wallet.address).toBeNull();
        expect(metamask.calls).toEqual(["eth_accounts"]);
        await act(async () => metamask.emit("accountsChanged", [ADDRESS]));
        expect(app.wallet.address).toBe(ADDRESS);
        await act(async () => metamask.emit("accountsChanged", []));
        expect(app.wallet.address).toBeNull();
        await expect(app.wallet.getSigner()).rejects.toThrow("No EVM wallet connected");
        expect(metamask.calls).toEqual(["eth_accounts"]);
    } finally { await app.close(); }
});

test("Disconnect clears the preference, removes listeners and prevents reload reconnection", async () => {
    const metamask = provider();
    const app = await mount({ saved: "io.metamask", wallets: [option(metamask)] });
    try {
        await act(async () => app.wallet.disconnect());
        expect(localStorage.getItem(KEY)).toBeNull();
        expect(app.wallet.address).toBeNull();
        expect(metamask.listenerCount("accountsChanged")).toBe(0);
        await act(async () => metamask.emit("accountsChanged", [OTHER]));
        expect(app.wallet.address).toBeNull();
        metamask.calls.length = 0;
        await app.remount();
        expect(metamask.calls).toEqual([]);
        expect(app.wallet.address).toBeNull();
    } finally { await app.close(); }
});

test("a delayed account read cannot reconnect after Disconnect", async () => {
    const metamask = provider();
    let resolve!: (accounts: string[]) => void;
    metamask.request = async () => new Promise<string[]>(r => { resolve = r; });
    const app = await mount({ saved: "io.metamask", wallets: [option(metamask)] });
    try {
        await act(async () => app.wallet.disconnect());
        await act(async () => resolve([ADDRESS]));
        expect(app.wallet.address).toBeNull();
        expect(localStorage.getItem(KEY)).toBeNull();
        expect(metamask.listenerCount("accountsChanged")).toBe(0);
    } finally { await app.close(); }
});

test("switching selected wallets removes the previous wallet's account listeners", async () => {
    const metamask = provider(), phantom = provider([OTHER]);
    const app = await mount({ wallets: [option(metamask), option(phantom, "app.phantom")] });
    try {
        await act(async () => app.wallet.selectWallet(option(metamask)));
        await act(async () => app.wallet.selectWallet(option(phantom, "app.phantom")));
        expect(app.wallet.address).toBe(OTHER);
        expect(metamask.listenerCount("accountsChanged")).toBe(0);
        await act(async () => metamask.emit("accountsChanged", [ADDRESS]));
        expect(app.wallet.address).toBe(OTHER);
        expect(localStorage.getItem(KEY)).toBe("app.phantom");
        await act(async () => phantom.emit("disconnect"));
        expect(app.wallet.address).toBeNull();
    } finally { await app.close(); }
});

test("permission rejection is not persisted, while disabled storage still allows explicit connection", async () => {
    const metamask = provider();
    const app = await mount({ wallets: [option(metamask)], blockedStorage: true });
    try {
        metamask.rejected = true;
        await act(async () => { await expect(app.wallet.selectWallet(option(metamask))).rejects.toThrow("Rejected"); });
        expect(app.wallet.address).toBeNull();
        expect(app.wallet.connecting).toBe(false);
        metamask.rejected = false;
        await act(async () => app.wallet.selectWallet(option(metamask)));
        expect(app.wallet.address).toBe(ADDRESS);
        await act(async () => app.wallet.disconnect());
        expect(app.wallet.address).toBeNull();
    } finally { await app.close(); }
});

test("a different chain switches only on explicit connect, including add-then-switch", async () => {
    const metamask = provider();
    metamask.chainId = "0x1";
    metamask.unknownChain = true;
    const app = await mount({ saved: "io.metamask", wallets: [option(metamask)] });
    try {
        expect(metamask.calls).toEqual(["eth_accounts"]);
        await act(async () => app.wallet.selectWallet(option(metamask)));
        expect(metamask.calls).toEqual(["eth_accounts", "eth_requestAccounts", "eth_chainId", "wallet_switchEthereumChain", "wallet_addEthereumChain", "wallet_switchEthereumChain", "eth_chainId"]);
        expect(app.wallet.address).toBe(ADDRESS);
    } finally { await app.close(); }
});

test("WalletConnect restores an existing session without another pairing request", async () => {
    const app = await mount();
    try {
        await act(async () => app.wallet.selectWallet(app.wallet.wallets.find(w => w.id === "walletconnect")!));
        expect(wc.connects).toBe(1);
        expect(app.wallet.address).toBe(ADDRESS);
        expect(localStorage.getItem(KEY)).toBe("walletconnect");
        wc.calls.length = 0;
        await app.remount();
        expect(app.wallet.address).toBe(ADDRESS);
        expect(wc.connects).toBe(1);
        expect(wc.calls).toEqual([]);
        expect(wc.listenerCount("accountsChanged")).toBe(1);
        await act(async () => app.wallet.disconnect());
        expect(wc.disconnects).toBe(1);
        expect(wc.listenerCount("accountsChanged")).toBe(0);
        expect(localStorage.getItem(KEY)).toBeNull();
    } finally { await app.close(); }
});

test("an expired WalletConnect session does not open pairing UI on reload", async () => {
    const app = await mount({ saved: "walletconnect" });
    try {
        expect(wcInits).toBe(1);
        expect(wc.connects).toBe(0);
        expect(app.wallet.address).toBeNull();
        expect(app.wallet.modalOpen).toBe(false);
    } finally { await app.close(); }
});
