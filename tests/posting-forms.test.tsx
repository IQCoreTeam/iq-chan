import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { ChainWalletContext } from "../src/lib/chains/context";
import PostForm from "../src/components/post-form";
import QuickReply from "../src/components/quick-reply";

for (const kind of ["standard", "quick"] as const) {
    for (const finish of ["complete", "cancel", "blocked"] as const) {
        test(`${kind} waits for its attachment before posting (${finish})`, async t => {
            const dom = new JSDOM('<div id="root"></div>', { url: "https://blockchan.sol.site/" });
            const popup = new JSDOM('', { url: "https://iqlabs.dev/" });
            Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
            const { createRoot } = await import("react-dom/client");
            const root = createRoot(document.getElementById("root")!);
            t.after(async () => { await act(async () => root.unmount()); dom.window.close(); popup.window.close(); });
            let opened = "";
            window.open = ((url: string) => { opened = url; return finish === "blocked" ? null : popup.window; }) as never;
            window.focus = () => {};
            popup.window.postMessage = () => {};
            const posts: Array<{ com: string; img?: string }> = [];
            const props = { loading: false, onSubmit: async (data: { com: string; img?: string }) => { posts.push(data); } };
            await act(async () => root.render(
                <ChainWalletContext.Provider value={{ address: "0x" + "a".repeat(40), connecting: false, family: "evm", connect() {}, disconnect() {} }}>
                    {kind === "standard" ? <PostForm {...props} mode="thread" /> : <QuickReply {...props} threadSig="op" initialQuote="op" onClose={() => {}} />}
                </ChainWalletContext.Provider>
            ));
            const comment = document.querySelector("textarea")!;
            assert.equal(document.querySelector('input[type="url"]'), null);
            await act(async () => {
                Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value")!.set!.call(comment, "draft stays here");
                comment.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            });
            const click = async (label: string) => act(async () => {
                [...document.querySelectorAll("button")].find(button => button.textContent === label)!.click();
            });
            const submit = async () => act(async () => {
                document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
            });
            await click("Inscribe attachment");
            const submitButton = document.querySelector<HTMLInputElement>('input[type="submit"]')!;
            if (finish !== "blocked") {
                assert.equal(submitButton.disabled, true);
                await submit(); // Guard programmatic submits as well as the button.
                assert.equal(posts.length, 0);
                assert.equal(comment.value, "draft stays here");
                if (finish === "cancel") await click("Cancel attachment");
                await act(async () => window.dispatchEvent(new dom.window.MessageEvent("message", {
                    origin: "https://iqlabs.dev", source: popup.window as unknown as Window,
                    data: { type: "iq:attachment-complete", requestId: new URL(opened).searchParams.get("attachmentRequest"), network: "solana", signature: "2".repeat(88) },
                })));
                assert.equal(posts.length, 0, "Returning media must not automatically post");
            }
            assert.equal(submitButton.disabled, false);
            await submit();
            assert.equal(posts.length, 1);
            assert.equal(posts[0].com, "draft stays here");
            assert.equal(posts[0].img, finish === "complete" ? "2".repeat(88) : undefined);
        });
    }
}

for (const kind of ["standard", "quick"] as const) {
    test(`${kind} posting preserves drafts on failure, prevents duplicate submits, and clears only on success`, async (t) => {
        const dom = new JSDOM('<div id="root"></div>', { url: "https://blockchan.sol.site/" });
        Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
        const { createRoot } = await import("react-dom/client");
        const root = createRoot(document.getElementById("root")!);
        const popup = new JSDOM('', { url: "https://iqlabs.dev/" });
        let opened = "";
        window.open = ((url: string) => { opened = url; return popup.window; }) as never;
        window.focus = () => {};
        popup.window.postMessage = () => {};
        t.after(async () => { await act(async () => root.unmount()); dom.window.close(); popup.window.close(); });
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
        const fields = { sub: "My subject", com: "Keep this draft", name: "Test", email: "sage" };
        for (const [name, value] of Object.entries(fields)) {
            const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
            const prototype = input.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
            await act(async () => {
                Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(input, value);
                input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
            });
        }
        const img = "2".repeat(88);
        await act(async () => [...document.querySelectorAll('button')].find(b => b.textContent === 'Inscribe attachment')!.click());
        await act(async () => window.dispatchEvent(new dom.window.MessageEvent('message', {
            origin: 'https://iqlabs.dev', source: popup.window as unknown as Window,
            data: { type: 'iq:attachment-complete', network: 'solana', signature: '2'.repeat(88), requestId: new URL(opened).searchParams.get('attachmentRequest') },
        })));
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
        assert.deepEqual(submitted, { sub: fields.sub, com: fields.com, name: fields.name, img, options: fields.email });
        await act(async () => resolve());
        assert.equal(document.querySelector<HTMLTextAreaElement>("textarea")!.value, "");
        assert.ok(!document.body.textContent?.includes("Attachment added."));
        assert.equal(closes, kind === "quick" ? 1 : 0);
    });
}

test("quick reply opens disconnected and connects without submitting", async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: "https://blockchan.sol.site/" });
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    let connections = 0, submissions = 0;
    try {
        await act(async () => root.render(
            <ChainWalletContext.Provider value={{ address: null, connecting: false, family: "evm", connect() { connections++; }, disconnect() {} }}>
                <QuickReply threadSig="op" initialQuote="op" loading={false} onClose={() => {}} onSubmit={async () => { submissions++; }} />
            </ChainWalletContext.Provider>
        ));
        assert.ok(document.querySelector("#quickReply"));
        assert.equal(document.querySelector<HTMLInputElement>('input[type="submit"]')!.value, "Connect wallet");
        await act(async () => document.querySelector<HTMLFormElement>("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
        assert.equal(connections, 1);
        assert.equal(submissions, 0);
        assert.equal(document.querySelector<HTMLTextAreaElement>("textarea")!.value, ">>op\n");
    } finally {
        await act(async () => root.unmount());
        dom.window.close();
    }
});

for (const kind of ['standard', 'quick'] as const) {
    test(`${kind} blocks invalid IDs and recovers through paste without an upload`, async () => {
        const dom = new JSDOM('<div id="root"></div>', {url:'https://blockchan.sol.site/'});
        Object.assign(globalThis, {window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
        const {createRoot}=await import('react-dom/client');
        const root=createRoot(document.getElementById('root')!);
        const posts: Array<{img?:string}> = [];
        try {
            const props={loading:false,onSubmit:async(data:{img?:string})=>{posts.push(data);}};
            await act(async()=>root.render(<ChainWalletContext.Provider value={{address:'wallet',connecting:false,family:'svm',connect(){},disconnect(){}}}>
                {kind==='standard'?<PostForm {...props} mode="thread"/>:<QuickReply {...props} threadSig="op" onClose={()=>{}}/>}
            </ChainWalletContext.Provider>));
            const comment=document.querySelector('textarea')!;
            await act(async()=>{
                Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value')!.set!.call(comment,'preserved draft');
                comment.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
            });
            const input=document.querySelector<HTMLInputElement>('[aria-label="Inscription transaction ID"]')!;
            const submit=()=>document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
            for(const bad of ['not-a-tx','https://example.com/image.png','0x'+'a'.repeat(64)]) {
                await act(async()=>{
                    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!.call(input,bad);
                    input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
                });
                assert.equal(input.getAttribute('aria-invalid'),'true');
                await act(async()=>{submit();});
                assert.equal(posts.length,0);
            }
            await act(async()=>{
                Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!.call(input,'2'.repeat(88));
                input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
            });
            await act(async()=>{submit();});
            assert.equal(posts.length,1);assert.equal(posts[0].img,'2'.repeat(88));
        } finally {await act(async()=>root.unmount());dom.window.close();}
    });
}
