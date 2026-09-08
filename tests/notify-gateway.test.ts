import { test, expect } from "bun:test";
import { notifyGateway } from "../src/lib/notify-gateway";

test("notification reports HTTP and network failures without rejecting a confirmed write", async () => {
    const original = globalThis.fetch;
    try {
        globalThis.fetch = (async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
        expect(await notifyGateway("http://localhost/notify", {})).toBe(false);
        globalThis.fetch = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
        expect(await notifyGateway("http://localhost/notify", {})).toBe(false);
        globalThis.fetch = (async () => new Response('{"ok":true}')) as unknown as typeof fetch;
        expect(await notifyGateway("http://localhost/notify", {})).toBe(true);
    } finally { globalThis.fetch = original; }
});

test("a stalled notification is aborted within the deadline", async () => {
    const original = globalThis.fetch;
    let aborted = false;
    try {
        globalThis.fetch = ((_url: unknown, init: RequestInit) => new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => { aborted = true; reject(new Error("aborted")); });
        })) as unknown as typeof fetch;
        expect(await notifyGateway("http://localhost/notify", {})).toBe(false);
        expect(aborted).toBe(true);
    } finally { globalThis.fetch = original; }
}, 6000);
