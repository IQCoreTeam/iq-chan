import { test, expect } from "bun:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import Post from "../src/components/post";
import ShareLink from "../src/components/share-link";

test("post copy reports success only after writing a URL and exposes the URL on failure", async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: "https://hoodchan.xyz/" });
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
    const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    let copied = "old wallet data", fail = false;
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => {
        if (fail) throw new Error("Clipboard permission denied");
        copied = value;
    } } });
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    try {
        await act(async () => root.render(<Post txSig="0x1234" name="Anonymous" com="A post" time={1} boardId="iq" threadPda="iq-thread" />));
        const toggle = () => document.querySelector<HTMLAnchorElement>(".postInfo.desktop .postMenuBtn")!.click();
        const copy = () => document.querySelector<HTMLButtonElement>(".postInfo.desktop .dd-menu button")!.click();
        await act(async () => toggle());
        await act(async () => copy());
        expect(copied).toBe("https://hoodchan.xyz/share/robinhood/iq/iq-thread/0x1234");
        expect(document.body.textContent).toContain("Link copied!");
        await act(async () => toggle());
        await act(async () => toggle());
        fail = true;
        await act(async () => copy());
        expect(document.body.textContent).not.toContain("Link copied!");
        expect(document.querySelector<HTMLInputElement>('input[aria-label="Link to post"]')!.value).toBe(copied);
    } finally {
        await act(async () => root.unmount());
        if (original) Object.defineProperty(navigator, "clipboard", original);
        else Reflect.deleteProperty(navigator, "clipboard");
        dom.window.close();
    }
});

test("post copy handles both networks without navigating and resets when the target changes", async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: "https://hoodchan.xyz/#/iq" });
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
    const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    let copied = "", fail = false;
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => {
        if (fail) throw new Error("Clipboard permission denied");
        copied = value;
    } } });
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    try {
        for (const url of ["https://hoodchan.xyz/share/robinhood/iq/iq-thread/0x1234", "https://blockchan.sol.site/share/solana/g/thread/reply"]) {
            await act(async () => root.render(<ShareLink url={url} />));
            const button = document.querySelector<HTMLButtonElement>("button")!;
            expect(button.textContent).toBe("Copy link to post");
            await act(async () => button.click());
            expect(copied).toBe(url);
            expect(button.textContent).toBe("Link copied!");
            expect(window.location.href).toBe("https://hoodchan.xyz/#/iq");
        }
        fail = true;
        await act(async () => document.querySelector<HTMLButtonElement>("button")!.click());
        expect(document.querySelector<HTMLInputElement>('input[aria-label="Link to post"]')!.value).toBe(copied);
        expect(document.body.textContent).not.toContain("Link copied!");
    } finally {
        await act(async () => root.unmount());
        if (original) Object.defineProperty(navigator, "clipboard", original);
        else Reflect.deleteProperty(navigator, "clipboard");
        dom.window.close();
    }
});

test("IQ Profile is Solana-only and Reply uses the existing quote handler", async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: "https://hoodchan.xyz/#/iq" });
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    const quoted: string[] = [];
    try {
        for (const host of ["hoodchan.xyz", "blockchan.sol.site"]) {
            dom.reconfigure({ url: `https://${host}/#/iq` });
            await act(async () => root.render(<Post key={host} txSig="test-sig" signer="test-wallet" name="Anon" com="Post" time={1} isOp replyLink="#/iq/thread" onQuote={(sig) => quoted.push(sig)} />));
            await act(async () => document.querySelector<HTMLAnchorElement>(".postInfo.desktop .postMenuBtn")!.click());
            expect(document.body.textContent!.includes("Go to the IQ Profile")).toBe(host === "blockchan.sol.site");
            expect(document.body.textContent).toContain("Copy wallet address");
            await act(async () => document.querySelector<HTMLAnchorElement>(".replylink")!.click());
            expect(window.location.hash).toBe("#/iq");
        }
        expect(quoted).toEqual(["test-sig", "test-sig"]);
    } finally {
        await act(async () => root.unmount());
        dom.window.close();
    }
});

test("raw inscription IDs produce usable file links and menu actions", async () => {
    const dom = new JSDOM('<div id="root"></div>', {url:'https://hoodchan.xyz/'});
    Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
    const {createRoot}=await import('react-dom/client');
    const root=createRoot(document.getElementById('root')!);
    const opened:string[]=[];window.open=((url:string)=>{opened.push(url);return null;}) as never;
    const original=globalThis.fetch;globalThis.fetch=(async()=>new Response('',{status:404})) as unknown as typeof fetch;
    try {
        const hash='0x'+'a'.repeat(64),url='https://iqlabs.dev/?menu=hoodin&post='+hash;
        await act(async()=>root.render(<Post txSig="post" name="Anon" com="QA" time={1} img={hash}/>));
        expect(document.querySelector('.fileText a')?.getAttribute('href')).toBe(url);
        await act(async()=>document.querySelector<HTMLAnchorElement>('.postInfo.desktop .postMenuBtn')!.click());
        await act(async()=>[...document.querySelectorAll<HTMLElement>('.postInfo.desktop .dd-menu li')].find(x=>x.textContent==='Open original file')!.click());
        expect(opened).toEqual([url]);
        await act(async()=>root.render(<Post txSig="post" name="Anon" com="QA" time={1} img="javascript:alert(1)"/>));
        expect(document.querySelector('.fileText a')).toBeNull();
        expect(document.body.textContent).not.toContain('Open original file');
    } finally {await act(async()=>root.unmount());globalThis.fetch=original;dom.window.close();}
});
