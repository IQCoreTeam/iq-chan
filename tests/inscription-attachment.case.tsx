import { test, expect, mock } from "bun:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { NETWORKS } from "../src/lib/chains/networks";
let network = NETWORKS.solana;
let reply: () => Promise<Response>;
const calls: string[] = [];
mock.module('../src/lib/gateway', () => ({gwFetch: (path: string) => {calls.push(path); return reply();}}));
mock.module('../src/lib/chains/resolve', () => ({resolveNetwork: () => network}));
const {default: Attachment} = await import('../src/components/attachment');

async function mount(url: string) {
    calls.length = 0;
    const dom = new JSDOM('<div id="root"></div>', {url:'http://localhost'});
    Object.assign(globalThis, {window:dom.window, document:dom.window.document, IS_REACT_ACT_ENVIRONMENT:true});
    const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
    const revoked: string[] = [];
    URL.createObjectURL = () => 'blob:synthetic';
    URL.revokeObjectURL = url => {revoked.push(url);};
    const {createRoot} = await import('react-dom/client');
    const root = createRoot(document.getElementById('root')!);
    await act(async () => root.render(<Attachment url={url} name="fixture" />));
    return {revoked, close:async () => {await act(async () => root.unmount()); URL.createObjectURL=originalCreate; URL.revokeObjectURL=originalRevoke; dom.window.close();}};
}

for (const mime of ['image/png','audio/wav','video/mp4']) {
    test(`renders ${mime} from a Solana transaction through one gateway request`, async () => {
        network=NETWORKS.solana;
        reply=async () => new Response(new Uint8Array([1,2,3]), {headers:{'Content-Type':mime}});
        const view=await mount('2'.repeat(88));
        try {
            expect(calls).toEqual([`/media/${'2'.repeat(88)}?network=solana`]);
            expect(document.querySelector(mime.startsWith('image')?'img':mime.split('/')[0])?.getAttribute('src')).toBe('blob:synthetic');
        } finally {await view.close();}
        expect(view.revoked).toEqual(['blob:synthetic']);
    });
}
test('HoodChan uses its EVM network without a Solana RPC', async () => {
    network=NETWORKS.robinhood;
    reply=async () => new Response('data', {headers:{'Content-Type':'audio/mpeg'}});
    const hash='0x'+'a'.repeat(64);
    const view=await mount(hash);
    try {expect(calls).toEqual([`/media/${hash}?network=robinhood`]); expect(document.querySelector('audio')).not.toBeNull();}
    finally {await view.close();}
});
test('unsupported returned content displays an error and never an iframe', async () => {
    reply=async () => new Response('<script>bad</script>', {headers:{'Content-Type':'text/html'}});
    const view=await mount('2'.repeat(88));
    try {expect(document.body.textContent).toContain('unavailable'); expect(document.querySelector('iframe')).toBeNull();}
    finally {await view.close();}
});
test('ordinary audio URLs retain native playback without gateway lookups', async () => {
    const view=await mount('https://example.com/music.mp3');
    try {expect(calls).toHaveLength(0); expect(document.querySelector('audio')?.getAttribute('src')).toBe('https://example.com/music.mp3');}
    finally {await view.close();}
});
test('oversized streaming media is cancelled before the whole body downloads', async () => {
    let chunks = 0, cancelled = false;
    reply = async () => new Response(new ReadableStream({
        pull(controller) { chunks++; controller.enqueue(new Uint8Array(1024 * 1024)); },
        cancel() { cancelled = true; },
    }), {headers: {'Content-Type': 'audio/wav'}});
    const view = await mount('2'.repeat(88));
    try {
        expect(cancelled).toBe(true);
        expect(chunks).toBeLessThanOrEqual(8);
        expect(document.querySelector('audio')).toBeNull();
        expect(document.body.textContent).toContain('unavailable');
    } finally { await view.close(); }
});
