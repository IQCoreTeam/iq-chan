import { test, expect } from "bun:test";
import { gwFetch } from "../../src/lib/gateway";
import { SOLANA_GATEWAY } from "../../src/lib/config";

test("restored gateway handles failed Solana reads but is skipped for EVM", async () => {
    const original = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (url: RequestInfo | URL) => {
        calls.push(String(url));
        return new Response("{}", { status: String(url).startsWith(SOLANA_GATEWAY) ? 200 : 503 });
    }) as unknown as typeof fetch;
    try {
        expect((await gwFetch("/table/test/rows")).status).toBe(200);
        expect(calls[1]).toBe(`${SOLANA_GATEWAY}/table/test/rows`);
        calls.length = 0;
        await expect(gwFetch("/table/iqchan/biz/rows?network=robinhood")).rejects.toThrow();
        expect(calls.some(url => url.startsWith(SOLANA_GATEWAY))).toBe(false);
    } finally { globalThis.fetch = original; }
});
