import { test, expect } from "bun:test";
import { GET } from "../../src/app/attachment/route.server";
const page = "https://allwebs.ru/video/abc.123";
const media = "https://allwebs.ru/images/2026/09/18/abc123.mov";
const request = (url: string) => new Request(`http://localhost/attachment?url=${encodeURIComponent(url)}`);
test("resolver restricts outbound targets and validates extracted media", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    let html = `<meta property="og:video" content="${media}">`;
    globalThis.fetch = (async (_url: RequestInfo | URL, options?: RequestInit) => {
        calls++;
        expect(options?.redirect).toBe("error");
        return new Response(html, { headers: { "content-type": "text/html" } });
    }) as unknown as typeof fetch;
    try {
        for (const url of ["http://127.0.0.1/", "https://allwebs.ru.evil.org/video/a", "https://allwebs.ru/video/../admin", "https://allwebs.ru/video/a?redirect=x"]) expect((await GET(request(url))).status).toBe(400);
        expect(calls).toBe(0);
        expect(await (await GET(request(page))).json()).toEqual({ url: media });
        html = '<meta property="og:video" content="https://evil.org/a.mp4">';
        expect((await GET(request(page))).status).toBe(502);
        html = 'x'.repeat(512001);
        expect((await GET(request(page))).status).toBe(502);
    } finally { globalThis.fetch = original; }
});

test("resolver cancels rejected content and handles provider failures", async () => {
    const original = globalThis.fetch;
    let cancelled = false;
    globalThis.fetch = (async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { "content-type": "application/octet-stream" } })) as unknown as typeof fetch;
    try {
        expect((await GET(request(page))).status).toBe(502);
        expect(cancelled).toBe(true);
        globalThis.fetch = (async () => { throw new Error("Provider unavailable"); }) as unknown as typeof fetch;
        expect((await GET(request(page))).status).toBe(502);
    } finally { globalThis.fetch = original; }
});
