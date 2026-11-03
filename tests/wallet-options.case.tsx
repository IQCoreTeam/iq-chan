import { afterEach, expect, mock, test } from "bun:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

let open = true, connecting = false;
const selections: string[] = [];
let connectCalls = 0;
let selectedSolanaWallet: any = null;
let evmError: Error | null = null;
let errors = new Map<string, (error: Error) => void>();
let evmWallets: any[] = [], solanaWallets: any[] = [];
const close = () => { open = false; };
mock.module("@solana/wallet-adapter-react", () => ({ useWallet: () => ({ wallets: solanaWallets, wallet: selectedSolanaWallet, connecting, connected: false, select: (name: string) => selections.push(name), connect: async () => { connectCalls++; } }) }));
mock.module("../src/lib/wallet-modal", () => ({ useWalletModal: () => ({ open, closeWalletModal: close }) }));
mock.module("../src/lib/chains/evm/wallet", () => ({ useEvmWallet: () => ({ modalOpen: open, closeModal: close, wallets: evmWallets, connecting, selectWallet: async (wallet: any) => { selections.push(wallet.id); if (evmError) throw evmError; } }) }));
const { default: SolanaWalletModal } = await import("../src/lib/chains/solana/wallet-modal-ui");
const { default: EvmWalletModal } = await import("../src/lib/chains/evm/wallet-modal-ui");
let dom: JSDOM, root: Root;
function wallets(count: number) {
    evmWallets = Array.from({ length: count }, (_, i) => ({ id: `wallet-${i + 1}`, name: `Wallet ${i + 1}` }));
    solanaWallets = evmWallets.map(w => ({ adapter: { name: w.name, on: (_: string, report: (error: Error) => void) => errors.set(w.id, report), off: () => errors.delete(w.id) } }));
}
async function mount(chain: "solana" | "evm", count: number) {
    dom = new JSDOM("<div id='root'></div>", { url: "http://127.0.0.1" });
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
    open = true; connecting = false; errors = new Map(); selections.length = 0; connectCalls = 0; selectedSolanaWallet = null; evmError = null; wallets(count);
    root = createRoot(document.getElementById("root")!);
    const Component = chain === "solana" ? SolanaWalletModal : EvmWalletModal;
    const render = () => act(async () => root.render(<Component />));
    await render();
    return render;
}
const buttons = () => [...document.querySelectorAll<HTMLButtonElement>("button")];
const walletButtons = () => buttons().filter(button => /^Wallet \d+$/.test(button.textContent!));
const disclosure = () => buttons().find(button => /Show (more|fewer) wallets/.test(button.textContent!));
async function click(button: HTMLButtonElement) { await act(async () => button.click()); }
afterEach(async () => { if (root) await act(async () => root.unmount()); dom?.window.close(); });

for (const chain of ["solana", "evm"] as const) {
    for (const count of [0, 1, 3, 5, 8]) test(`${chain}: ${count} wallets preserve discovery and disclose only after three`, async () => {
        await mount(chain, count);
        expect(walletButtons()).toHaveLength(Math.min(count, 3));
        expect(selections).toHaveLength(0); expect(connectCalls).toBe(0);
        if (count <= 3) expect(disclosure()).toBeUndefined();
        else {
            const button = disclosure()!;
            expect(button.textContent).toBe(`Show more wallets (${count - 3})`);
            expect(button.getAttribute("aria-expanded")).toBe("false");
            expect(document.getElementById(button.getAttribute("aria-controls")!)).not.toBeNull();
            button.focus(); expect(document.activeElement).toBe(button);
            expect(button.type).toBe("button"); expect(button.tabIndex).toBe(0);
            await click(button);
            expect(walletButtons()).toHaveLength(count);
            expect(button.getAttribute("aria-expanded")).toBe("true");
            expect(selections).toHaveLength(0); expect(connectCalls).toBe(0);
            expect(document.getElementById(button.getAttribute("aria-controls")!)!.style.overflowY).toBe("auto");
            await click(walletButtons()[4]);
            expect(selections).toEqual([chain === "solana" ? "Wallet 5" : "wallet-5"]);
            expect(connectCalls).toBe(0);
        }
        if (count === 0) expect(document.body.textContent).toContain("No wallets detected.");
    });
    test(`${chain}: pending disables disclosure and wallet buttons without connecting`, async () => {
        const render = await mount(chain, 8); connecting = true; await render();
        expect(disclosure()!.disabled).toBe(true);
        expect(walletButtons().every(button => button.disabled)).toBe(true);
        await click(disclosure()!); await click(walletButtons()[0]);
        expect(walletButtons()).toHaveLength(3); expect(selections).toHaveLength(0); expect(connectCalls).toBe(0);
    });
    test(`${chain}: fewer and close/reopen reset, late wallets stay discoverable`, async () => {
        const render = await mount(chain, 3);
        expect(disclosure()).toBeUndefined();
        wallets(8); await render();
        expect(disclosure()!.textContent).toBe("Show more wallets (5)");
        await click(disclosure()!); expect(walletButtons()).toHaveLength(8);
        await click(disclosure()!); expect(walletButtons()).toHaveLength(3);
        await click(disclosure()!);
        await click(document.querySelector('[aria-label="Close wallet selector"]')!);
        await render(); expect(document.querySelector('[role="dialog"]')).toBeNull();
        open = true; await render(); expect(walletButtons()).toHaveLength(3);
        expect(disclosure()!.getAttribute("aria-expanded")).toBe("false");
        expect(selections).toHaveLength(0); expect(connectCalls).toBe(0);
    });
}
test("Solana disclosure preserves provider error listeners and visible errors", async () => {
    await mount("solana", 8);
    expect(errors.size).toBe(8);
    await click(disclosure()!); expect(errors.size).toBe(8);
    await act(async () => errors.get("wallet-5")!(new Error("Wallet rejected connection")));
    expect(document.querySelector('[role="alert"]')!.textContent).toContain("Wallet rejected connection");
    expect(selections).toHaveLength(0);
});


test("an explicitly selected fifth Solana wallet retains the existing connect path", async () => {
    const render = await mount("solana", 8);
    selectedSolanaWallet = solanaWallets[4]; await render();
    await click(disclosure()!); expect(connectCalls).toBe(0);
    await click(walletButtons()[4]);
    expect(connectCalls).toBe(1); expect(selections).toHaveLength(0);
});

test("the expanded EVM fifth wallet retains connection-error feedback", async () => {
    await mount("evm", 8); evmError = new Error("Request canceled in wallet");
    await click(disclosure()!); expect(selections).toHaveLength(0);
    await click(walletButtons()[4]);
    expect(selections).toEqual(["wallet-5"]);
    expect(document.querySelector('[role="alert"]')!.textContent).toContain("Request canceled in wallet");
});
