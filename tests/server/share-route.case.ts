import { test, expect, mock } from "bun:test";

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
    } finally { globalThis.fetch = original; }
});

test("missing replies and gateway outages do not produce misleading cached cards", async () => {
    const original = globalThis.fetch;
    try {
        globalThis.fetch = (async () => Response.json({ op: { com: "OP", time: 1 }, replies: [] })) as unknown as typeof fetch;
        const missing = await GET(new Request("https://hoodchan.xyz/share"), { params: Promise.resolve({ segments: route }) });
        expect(missing.status).toBe(404);
        expect(missing.headers.get("cache-control")).toBe("no-store");
        globalThis.fetch = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
        const failed = await GET(new Request("https://hoodchan.xyz/share"), { params: Promise.resolve({ segments: route }) });
        expect(failed.status).toBe(503);
        expect(failed.headers.get("cache-control")).toBe("no-store");
    } finally { globalThis.fetch = original; }
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
