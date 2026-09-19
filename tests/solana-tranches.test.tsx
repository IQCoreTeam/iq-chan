import { test, expect } from "bun:test";
import React, { act } from "react";
import { JSDOM } from "jsdom";
import Post from "../src/components/post";
import SolanaTokenCard from "../src/components/solana-token-card";
import { dexScreenerEmbed } from "../src/lib/dexscreener";
import { BoardsProvider, useBoards } from "../src/hooks/use-boards";
const mint = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const pair = "C8Gr6AUuq9hEdSYJzoEpNcdjpojPZwqG5MtQbeouNNwg";

test("Solana chart ignores signatures, requires an indexed mint and chooses the deepest matching pool", async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: "https://blockchan.sol.site" });
    Object.assign(globalThis, {
        window: dom.window,
        document: dom.window.document,
        localStorage: dom.window.localStorage,
        IS_REACT_ACT_ENVIRONMENT: true,
    });
    const original = globalThis.fetch;
    let calls = 0;
    let response: unknown = [
        { chainId: "robinhood", baseToken: { address: mint }, pairAddress: pair, liquidity: { usd: 9999 } },
        { chainId: "solana", baseToken: { address: mint, symbol: "JUP" }, pairAddress: mint, liquidity: { usd: 1 } },
        { chainId: "solana", baseToken: { address: mint, symbol: "JUP" }, pairAddress: pair, liquidity: { usd: 100 } },
    ];
    globalThis.fetch = (async () => {
        calls++;
        return Response.json(response);
    }) as unknown as typeof fetch;
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    try {
        await act(async () => root.render(<SolanaTokenCard text={mint + mint} />));
        expect(calls).toBe(0);
        await act(async () => root.render(<SolanaTokenCard text={`한국어 차트 ${mint}`} />));
        expect(document.querySelector("iframe")?.src).toBe(dexScreenerEmbed("solana", pair));
        expect(document.body.textContent).toContain("Connect wallet to trade");
        await act(async () => root.render(<SolanaTokenCard text="ordinary post" />));
        expect(document.querySelector("iframe")).toBeNull();
        response = [];
        await act(async () => root.render(<SolanaTokenCard text={mint} />));
        expect(document.querySelector("iframe")).toBeNull();
        globalThis.fetch = (async () => {
            throw new Error("offline");
        }) as unknown as typeof fetch;
        await act(async () => root.render(<SolanaTokenCard key="offline" text={mint} />));
        expect(document.querySelector("iframe")).toBeNull();
    } finally {
        await act(async () => root.unmount());
        globalThis.fetch = original;
        Reflect.deleteProperty(globalThis, "localStorage");
        dom.window.close();
    }
});

test("Tranches follows IQ on Solana and Robinhood, without appearing on other chains", async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: "https://blockchan.sol.site" });
    Object.assign(globalThis, {
        window: dom.window,
        document: dom.window.document,
        localStorage: dom.window.localStorage,
        IS_REACT_ACT_ENVIRONMENT: true,
    });
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    function List() {
        return (
            <div>
                {useBoards()
                    .boards.map((b) => b.id)
                    .join(",")}
            </div>
        );
    }
    try {
        for (const network of ["solana", "robinhood", "monadTestnet"]) {
            dom.window.localStorage.setItem("blockchan_network", network);
            await act(async () =>
                root.render(
                    <BoardsProvider>
                        <List />
                    </BoardsProvider>,
                ),
            );
            expect(document.body.textContent?.startsWith(network === "monadTestnet" ? "iq,po" : "iq,tranches,po")).toBe(
                true,
            );
        }
    } finally {
        await act(async () => root.unmount());
        Reflect.deleteProperty(globalThis, "localStorage");
        dom.window.close();
    }
});

test("Solana token chart renders on a Technology post, not only Tranches", async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: "https://blockchan.sol.site/#/g/thread" });
    Object.assign(globalThis, {
        window: dom.window,
        document: dom.window.document,
        localStorage: dom.window.localStorage,
        IS_REACT_ACT_ENVIRONMENT: true,
    });
    const original = globalThis.fetch;
    globalThis.fetch = (async () => Response.json([{
        chainId: "solana",
        baseToken: { address: mint, symbol: "JUP" },
        pairAddress: pair,
        liquidity: { usd: 100 },
    }])) as typeof fetch;
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    try {
        await act(async () => root.render(<Post txSig="test-post" name="Anon" com={`Token ${mint}`} time={1} boardId="g" threadPda="thread" />));
        expect(document.querySelector("iframe")?.src).toBe(dexScreenerEmbed("solana", pair));
        expect(document.body.textContent).toContain("Connect wallet to trade");
        await act(async () => root.render(<Post txSig="test-post" name="Anon" com="Ordinary technology discussion" time={1} boardId="g" threadPda="thread" />));
        expect(document.querySelector("iframe")).toBeNull();
        dom.window.localStorage.setItem("blockchan_network", "robinhood");
        await act(async () => root.render(<Post txSig="robinhood-post" name="Anon" com={`Token ${mint}`} time={1} boardId="g" threadPda="thread" />));
        expect(document.querySelector("iframe")).toBeNull();
        expect(document.body.textContent).not.toContain("Connect wallet to trade");
    } finally {
        await act(async () => root.unmount());
        globalThis.fetch = original;
        Reflect.deleteProperty(globalThis, "localStorage");
        dom.window.close();
    }
});
