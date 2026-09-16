import { test, expect } from "bun:test";
import React, { act } from "react";
import { JSDOM } from "jsdom";
import { Connection, Keypair, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { ConnectionContext, WalletContext, type WalletContextState } from "@solana/wallet-adapter-react";
import SolanaTrade from "../src/components/solana-trade";
import { SOL_MINT } from "../src/lib/chains/solana/swap";

test("native trades expire before signing, discard stale wallet quotes and never execute a rejected signature", async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: "https://blockchan.sol.site" });
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    const owner = Keypair.generate().publicKey,
        mint = Keypair.generate().publicKey.toBase58();
    const tx = new VersionedTransaction(
        new TransactionMessage({
            payerKey: owner,
            recentBlockhash: Keypair.generate().publicKey.toBase58(),
            instructions: [],
        }).compileToV0Message(),
    );
    const order = {
        transaction: Buffer.from(tx.serialize()).toString("base64"),
        requestId: "local",
        inputMint: SOL_MINT,
        outputMint: mint,
        inAmount: "100000000",
        outAmount: "1000000",
        otherAmountThreshold: "990000",
        slippageBps: 100,
        feeBps: 0,
        signatureFeeLamports: 5000,
        prioritizationFeeLamports: 0,
        rentFeeLamports: 0,
    };
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    connection.getParsedTokenAccountsByOwner = async () => ({ context: { slot: 1 }, value: [] });
    connection.getTokenSupply = async () => ({
        context: { slot: 1 },
        value: { amount: "1000000", decimals: 6, uiAmount: 1, uiAmountString: "1" },
    });
    let signs = 0,
        executes = 0;
    const wallet = {
        publicKey: owner,
        signTransaction: async () => {
            signs++;
            throw Error("User rejected");
        },
    } as unknown as WalletContextState;
    const originalFetch = globalThis.fetch,
        originalNow = Date.now;
    globalThis.fetch = (async (url: unknown) => {
        if (String(url).includes("/execute")) executes++;
        return Response.json(order);
    }) as unknown as typeof fetch;
    const render = (w: WalletContextState) => (
        <ConnectionContext.Provider value={{ connection }}>
            <WalletContext.Provider value={w}>
                <SolanaTrade mint={mint} symbol="QA" />
            </WalletContext.Provider>
        </ConnectionContext.Provider>
    );
    const click = async (text: string) =>
        act(async () => {
            [...document.querySelectorAll("button")].find((b) => b.textContent === text)!.click();
        });
    try {
        await act(async () => root.render(render(wallet)));
        expect(
            [...document.querySelectorAll("button")]
                .filter((b) => b.textContent?.startsWith("Sell"))
                .every((b) => b.disabled),
        ).toBe(true);
        await click("Buy 0.1 SOL");
        expect(document.body.textContent).toContain("Minimum: 0.99");
        const now = originalNow();
        Date.now = () => now + 31000;
        await click("Confirm in wallet");
        expect(signs).toBe(0);
        expect(document.body.textContent).toContain("expired");
        Date.now = originalNow;
        await click("Buy 0.1 SOL");
        await click("Confirm in wallet");
        expect(signs).toBe(1);
        expect(executes).toBe(0);
        expect(document.body.textContent).toContain("User rejected");
        let resolve!: (value: Response) => void;
        globalThis.fetch = (() =>
            new Promise<Response>((r) => {
                resolve = r;
            })) as unknown as typeof fetch;
        await click("Buy 0.1 SOL");
        await act(async () => root.render(render({ ...wallet, publicKey: Keypair.generate().publicKey })));
        await act(async () => resolve(Response.json(order)));
        expect(document.body.textContent).not.toContain("Confirm in wallet");
        expect(executes).toBe(0);
        connection.getParsedTokenAccountsByOwner = async () => ({
            context: { slot: 1 },
            value: [
                {
                    pubkey: owner,
                    account: {
                        owner,
                        executable: false,
                        lamports: 1,
                        data: {
                            program: "spl-token",
                            space: 165,
                            parsed: { info: { tokenAmount: { amount: "9007199254740993", decimals: 6 } } },
                        },
                    },
                },
            ],
        });
        let sellAmount = "";
        globalThis.fetch = (async (url: unknown) => {
            sellAmount = new URL(String(url)).searchParams.get("amount")!;
            return Response.json({ ...order, inputMint: mint, outputMint: SOL_MINT, inAmount: sellAmount });
        }) as unknown as typeof fetch;
        await act(async () => root.render(render(wallet)));
        await click("Sell 25%");
        expect(sellAmount).toBe("2251799813685248");
        expect(document.body.textContent).toContain("Pay 2251799813.685248 QA");
        expect(signs).toBe(1);
        expect(executes).toBe(0);
    } finally {
        Date.now = originalNow;
        globalThis.fetch = originalFetch;
        await act(async () => root.unmount());
        dom.window.close();
    }
});
