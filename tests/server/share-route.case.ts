import { test, expect, mock } from "bun:test";
import { runInNewContext } from "node:vm";

// The cache is a Next server facility; these tests exercise the actual route,
// adapter and transport against gateway responses without a Next process.
mock.module("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
const { GET } = await import("../../src/app/share/[...segments]/route");
const { shareThumbnail } = await import("../../src/lib/share-data");
const tx = `0x${"b".repeat(64)}`;
const route = ["robinhood", "iq", "iq-thread", tx];

test("reply metadata uses the selected reply, escapes content, and preserves its anchor", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({ op: { com: "OP text", name: "OP", time: 1, __txHash: `0x${"a".repeat(64)}` }, replies: [{ com: '<script>alert("x")</script> > gm', name: "Anonymous", time: 2, __txHash: tx }], totalReplies: 1 })) as unknown as typeof fetch;
    try {
        const res = await GET(new Request(`https://hoodchan.xyz/share/${route.join("/")}`), { params: Promise.resolve({ segments: route }) });
        const html = await res.text();
        expect(res.status).toBe(200);
        expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
        expect(html).not.toContain('<script>alert');
        expect(html).not.toContain("OP text");
        expect(html).toContain(`/#/iq/iq-thread:p${tx}`);
        expect(html).toContain('content="summary_large_image"');
        expect(html).toContain(`https://hoodchan.xyz/share/${route.join("/")}?image=1`);
        expect(res.headers.get("location")).toBeNull();
        expect(html).not.toMatch(/<h1|<img|<style|http-equiv="refresh"/i);
        let opened = "";
        runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)![1], { location: { replace: (url: string) => { opened = url; } } });
        expect(opened).toBe(`https://hoodchan.xyz/#/iq/iq-thread:p${tx}`);
        expect(html).toContain(`<noscript><a href="${opened}">Open post</a></noscript>`);
        const uppercaseRoute = [...route.slice(0, -1), `0x${"B".repeat(64)}`];
        const uppercase = await GET(new Request(`https://hoodchan.xyz/share/${uppercaseRoute.join("/")}`), { params: Promise.resolve({ segments: uppercaseRoute }) });
        expect(uppercase.status).toBe(200);
        expect(await uppercase.text()).toContain(`/#/iq/iq-thread:p${tx}`);
    } finally { globalThis.fetch = original; }
});

test("missing replies and gateway outages do not produce misleading cached cards", async () => {
    const original = globalThis.fetch;
    try {
        globalThis.fetch = (async () => Response.json({ op: { com: "OP", time: 1 }, replies: [] })) as unknown as typeof fetch;
        const missing = await GET(new Request("https://hoodchan.xyz/share"), { params: Promise.resolve({ segments: route }) });
        expect(missing.status).toBe(404);
        expect(missing.headers.get("cache-control")).toBe("no-store");
        expect(await missing.text()).toContain(`location.replace("https://hoodchan.xyz/#/iq/iq-thread:p${tx}")`);
        globalThis.fetch = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
        const failed = await GET(new Request("https://hoodchan.xyz/share"), { params: Promise.resolve({ segments: route }) });
        expect(failed.status).toBe(503);
        expect(failed.headers.get("cache-control")).toBe("no-store");
        const failedHtml = await failed.text();
        expect(failedHtml).toContain(`location.replace("https://hoodchan.xyz/#/iq/iq-thread:p${tx}")`);
        expect(failedHtml).not.toContain('property="og:image"');
        const failedImage = await GET(new Request("https://hoodchan.xyz/share?image=1"), { params: Promise.resolve({ segments: route }) });
        expect(failedImage.status).toBe(503);
        expect(await failedImage.text()).not.toContain("<script>");
    } finally { globalThis.fetch = original; }
});

test("browsers and social crawlers receive the same server-rendered metadata", async () => {
    for (const [network, host] of [["solana", "blockchan.sol.site"], ["robinhood", "hoodchan.xyz"]]) {
        let expected = "";
        for (const agent of ["Mozilla/5.0", "Twitterbot/1.0", "facebookexternalhit/1.1", "Discordbot/2.0", "TelegramBot (like TwitterBot)", "Slackbot-LinkExpanding 1.0"]) {
            const res = await GET(new Request(`https://${host}/share/${network}`, { headers: { "User-Agent": agent } }), { params: Promise.resolve({ segments: [network] }) });
            const html = await res.text();
            expect(res.status).toBe(200);
            expect(res.headers.get("location")).toBeNull();
            expect(html).toContain(`property="og:image" content="https://${host}/share/${network}?image=1"`);
            expect(html).toContain('name="twitter:card" content="summary_large_image"');
            expect(html).toContain(`location.replace("https://${host}/#/")`);
            if (expected) expect(html).toBe(expected);
            expected = html;
        }
    }
});

test("the browser handoff preserves existing Solana deep links when metadata is unavailable", async () => {
    const original = globalThis.fetch;
    const thread = "Atk6BqT8U6Rz6JcFNncj77oSvykGBL5QaQkoKHwisqXb";
    const post = "rcnUZ987ovi962rXoBE6WHd7z1hpUbBqfPH3HnYnHN4ehRxkcuJQMN6RsgT833CS3z9Ay34KWUwDcmbBtSK9Eo9";
    globalThis.fetch = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    try {
        for (const path of [["solana", "g"], ["solana", "g", thread], ["solana", "g", thread, post]]) {
            const res = await GET(new Request(`http://localhost:3007/share/${path.join("/")}`, { headers: { Host: "127.0.0.1:3216" } }), { params: Promise.resolve({ segments: path }) });
            const html = await res.text();
            let opened = "";
            runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)![1], { location: { replace: (url: string) => { opened = url; } } });
            expect(opened).toBe(`http://127.0.0.1:3216/#/g${path.length > 2 ? `/${thread}` : ""}${path.length > 3 ? `:p${post}` : ""}`);
        }
    } finally { globalThis.fetch = original; }
});

test("share metadata and image links use the incoming host behind a container proxy", async () => {
    for (const [host, network, expectedOrigin] of [
        ["127.0.0.1:3216", "robinhood", "http://127.0.0.1:3216"],
        ["hoodchan.xyz", "robinhood", "https://hoodchan.xyz"],
        ["blockchan.sol.site", "solana", "https://blockchan.sol.site"],
    ]) {
        const res = await GET(new Request(`http://localhost:3007/share/${network}`, { headers: { Host: host } }), { params: Promise.resolve({ segments: [network] }) });
        const html = await res.text();
        expect(res.status).toBe(200);
        expect(html).toContain(`content="${expectedOrigin}/share/${network}?image=1"`);
        expect(html).not.toContain("localhost:3007");
    }
});

test("card image requests reject arbitrary hosts, local paths and redirect destinations", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
        calls++;
        expect(init?.redirect).toBe("error");
        return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } });
    }) as unknown as typeof fetch;
    try {
        for (const url of ["http://127.0.0.1/secret", "https://evil.example/img.png", "file:///etc/passwd", "/../../etc/passwd", "https://hoodchan.xyz.evil.example/img.png", "https://user@hoodchan.xyz/img.png", "https://hoodchan.xyz/share/robinhood?image=1", "https://blockchan.sol.site/%73hare/solana/test.png?image=1", "https://hoodchan.xyz/_next/image?url=/share/robinhood&image=1"]) expect(await shareThumbnail(url)).toBeUndefined();
        expect(calls).toBe(0);
        expect(await shareThumbnail("https://hoodchan.xyz/hoodchan/redirect.png")).toBeUndefined();
        expect(calls).toBe(1);
    } finally { globalThis.fetch = original; }
});

test("both actual logos decode to bounded PNG thumbnails", async () => {
    for (const logo of ["/hoodchan.webp", "/blockchan.webp"]) {
        const image = await shareThumbnail(logo);
        expect(image?.src).toStartWith("data:image/png;base64,");
        expect(image!.width).toBeLessThanOrEqual(270);
        expect(image!.height).toBeLessThanOrEqual(240);
    }
});

test("invalid and oversized attachments fall back without retaining the response stream", async () => {
    const original = globalThis.fetch;
    const imageUrl = "https://images.nubs.site/hoodchan/fixture.png";
    try {
        globalThis.fetch = (async () => new Response("not a PNG", { headers: { "Content-Type": "image/png" } })) as unknown as typeof fetch;
        expect(await shareThumbnail(imageUrl)).toBeUndefined();

        let cancelled = false;
        globalThis.fetch = (async () => new Response(new ReadableStream({
            pull(controller) { controller.enqueue(new Uint8Array(1_000_001)); },
            cancel() { cancelled = true; },
        }), { headers: { "Content-Type": "image/png" } })) as unknown as typeof fetch;
        expect(await shareThumbnail(imageUrl)).toBeUndefined();
        expect(cancelled).toBe(true);

        const { default: sharp } = await import("sharp");
        const oversized = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: "white" } }).png().toBuffer();
        globalThis.fetch = (async () => new Response(oversized, { headers: { "Content-Type": "image/png" } })) as unknown as typeof fetch;
        expect(await shareThumbnail(imageUrl)).toBeUndefined();
    } finally { globalThis.fetch = original; }
});

test("an image body that stalls after headers is aborted by its deadline", async () => {
    const original = globalThis.fetch;
    let aborted = false;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => new Response(new ReadableStream({
        start(controller) {
            init?.signal?.addEventListener("abort", () => { aborted = true; controller.error(init.signal?.reason); }, { once: true });
        },
    }), { headers: { "Content-Type": "image/png" } })) as unknown as typeof fetch;
    try {
        expect(await shareThumbnail("https://images.nubs.site/hoodchan/stalled.png")).toBeUndefined();
        expect(aborted).toBe(true);
    } finally { globalThis.fetch = original; }
});
