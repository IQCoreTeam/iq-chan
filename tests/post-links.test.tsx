import { test, expect } from "bun:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import Post from "../src/components/post";

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
        expect(copied).toBe("https://hoodchan.xyz/#/iq/iq-thread:p0x1234");
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
