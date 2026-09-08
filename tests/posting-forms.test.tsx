import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { ChainWalletContext } from "../src/lib/chains/context";
import PostForm from "../src/components/post-form";
import QuickReply from "../src/components/quick-reply";

for (const kind of ["standard", "quick"] as const) {
    test(`${kind} posting preserves drafts on failure, prevents duplicate submits, and clears only on success`, async (t) => {
        const dom = new JSDOM('<div id="root"></div>', { url: "https://hoodchan.xyz/" });
        Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
        const { createRoot } = await import("react-dom/client");
        const root = createRoot(document.getElementById("root")!);
        t.after(async () => { await act(async () => root.unmount()); dom.window.close(); });
        let calls = 0, closes = 0, dismisses = 0;
        let resolve!: () => void, reject!: (e: Error) => void;
        let submitted: unknown;
        const onSubmit = (data: unknown) => {
            calls++; submitted = data;
            return new Promise<void>((yes, no) => { resolve = yes; reject = no; });
        };
        const render = async (statusText = "", loading = false) => {
            const props = { onSubmit, loading, statusText, onClearStatus: () => { dismisses++; } };
            await act(async () => root.render(
                <ChainWalletContext.Provider value={{ address: "0x" + "a".repeat(40), connecting: false,
                    family: "evm", connect() {}, disconnect() {} }}>
                    {kind === "standard" ? <PostForm mode="thread" {...props} />
                        : <QuickReply mode="thread" threadSig="fixture" onClose={() => { closes++; }} {...props} />}
                </ChainWalletContext.Provider>
            ));
        };
        await render();
        if (kind === "standard") await act(async () => document.querySelector<HTMLAnchorElement>("#togglePostFormLink a")!.click());
        const fields = { sub: "My subject", com: "Keep this draft", name: "Test", img: "https://example.com/a.png", email: "sage" };
        for (const [name, value] of Object.entries(fields)) {
            const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
            const prototype = input.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
            await act(async () => {
                Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(input, value);
                input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            });
        }
        const submit = () => document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
        await act(async () => { submit(); submit(); });
        assert.equal(calls, 1);
        assert.equal(closes, 0);
        await render("Posting...", true);
        assert.equal(document.querySelector<HTMLTextAreaElement>("textarea")!.disabled, true);
        await act(async () => reject(new Error("Insufficient funds")));
        await render("Error: Not enough ETH on Robinhood Chain");
        for (const [name, value] of Object.entries(fields)) assert.equal(document.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value, value);
        assert.equal(closes, 0);
        const dismissButtons = [...document.querySelectorAll("button")].filter(b => ["OK", "X"].includes(b.textContent!.trim()));
        assert.equal(dismissButtons.length, 2);
        await act(async () => dismissButtons.forEach(b => b.click()));
        assert.equal(dismisses, 2);
        assert.equal(calls, 1, "Dismissing the error must not post again");
        await render();
        await act(async () => { submit(); });
        assert.equal(calls, 2);
        assert.deepEqual(submitted, { sub: fields.sub, com: fields.com, name: fields.name, img: fields.img, options: fields.email });
        await act(async () => resolve());
        assert.equal(document.querySelector<HTMLTextAreaElement>("textarea")!.value, "");
        assert.equal(closes, kind === "quick" ? 1 : 0);
    });
}
