import { test, expect } from "bun:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import Attachment from "../src/components/attachment";

test("attachments support video controls, image expansion, failures and unsafe URLs", async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost/" });
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    const render = async (url: string) => act(async () => root.render(<Attachment key={url} url={url} name="test" />));
    try {
        for (const extension of ["mp4", "webm", "MOV", "m4v", "ogv"]) {
            await render(`https://example.org/clip.${extension}?download=1`);
            const video = document.querySelector("video")!;
            expect(video.controls).toBe(true);
            expect(video.preload).toBe("metadata");
            expect(video.autoplay).toBe(false);
            await act(async () => video.dispatchEvent(new dom.window.Event("error")));
            expect(document.body.textContent).not.toContain("Open attachment");
            expect(document.querySelector("video")).toBeNull();
        }
        await render("https://example.org/image.png");
        await act(async () => document.querySelector<HTMLAnchorElement>("a")!.click());
        expect(document.querySelector(".fileThumbExpanded")).not.toBeNull();
        await act(async () => document.querySelector("img")!.dispatchEvent(new dom.window.Event("error")));
        expect(document.querySelector("img")!.getAttribute("src")).toBe("/404.webp");
        expect(document.querySelector("a")!.href).toBe("https://example.org/image.png");
        await act(async () => document.querySelector("img")!.dispatchEvent(new dom.window.Event("error")));
        expect(document.querySelector("img")).toBeNull();
        await render("https://example.org/audio.mp3");
        expect(document.querySelector("audio")!.controls).toBe(true);
        for (const url of ["javascript:alert(1)", "https://", "http://[bad", "data:text/html,test"]) {
            await render(url);
            expect(document.getElementById("root")!.children.length).toBe(0);
        }
    } finally { await act(async () => root.unmount()); dom.window.close(); }
});
