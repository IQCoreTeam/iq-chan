import { test, expect, mock } from "bun:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { NETWORKS } from "../src/lib/chains/networks";
let network = NETWORKS.solana;
let reply: () => Promise<Response>;
const calls: string[] = [];
const signals: (AbortSignal | null | undefined)[] = [];
mock.module('../src/lib/gateway', () => ({gwFetch: (path: string, init: RequestInit) => {calls.push(path); signals.push(init.signal); return reply();}}));
mock.module('../src/lib/chains/resolve', () => ({resolveNetwork: () => network}));
const {default: Attachment} = await import('../src/components/inscription-media');
const {default: InscriptionAttachment} = await import('../src/components/inscription-attachment');

async function mount(url: string, observerSupport = false, count = 1, Component = Attachment) {
    calls.length = 0;
    signals.length = 0;
    const dom = new JSDOM('<div id="root"></div>', {url:'http://localhost'});
    Object.assign(globalThis, {window:dom.window, document:dom.window.document, localStorage:dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT:true});
    const observers: {target: Element | null; disconnected: boolean; notify: (visible: boolean) => void}[] = [];
    if (observerSupport) Object.defineProperty(dom.window, 'IntersectionObserver', {value: class {
        observation = {target: null as Element | null, disconnected: false, notify: (_visible: boolean) => {}};
        constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit) {
            expect(options.rootMargin).toBe('200px');
            this.observation.notify = visible => callback([{isIntersecting: visible, target: this.observation.target!} as IntersectionObserverEntry], this as unknown as IntersectionObserver);
            observers.push(this.observation);
        }
        observe(target: Element) {this.observation.target = target;}
        disconnect() {this.observation.disconnected = true;}
    }});
    const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
    const revoked: string[] = [];
    URL.createObjectURL = () => 'blob:synthetic';
    URL.revokeObjectURL = url => {revoked.push(url);};
    const {createRoot} = await import('react-dom/client');
    const root = createRoot(document.getElementById('root')!);
    await act(async () => root.render(<>{Array.from({length: count}, (_, index) => <Component key={index} sig={url} alt="fixture" />)}</>));
    return {revoked, observers, close:async () => {await act(async () => root.unmount()); URL.createObjectURL=originalCreate; URL.revokeObjectURL=originalRevoke; dom.window.close();}};
}

test('500 offscreen previews make no requests and visibility loads each preview only once', async () => {
    network = NETWORKS.solana;
    reply = async () => new Response(new Uint8Array([1, 2, 3]), {headers: {'Content-Type': 'image/png'}});
    const view = await mount('2'.repeat(88), true, 500);
    try {
        expect(view.observers).toHaveLength(500);
        expect(calls).toHaveLength(0);
        expect(document.querySelector('img')).toBeNull();
        await act(async () => view.observers[0].notify(false));
        expect(calls).toHaveLength(0);
        await act(async () => view.observers[0].notify(true));
        expect(calls).toEqual([`/media/${'2'.repeat(88)}?network=solana`]);
        expect(view.observers[0].disconnected).toBe(true);
        expect(document.querySelector('img')?.getAttribute('src')).toBe('blob:synthetic');
        await act(async () => view.observers[0].notify(true));
        expect(calls).toHaveLength(1);
    } finally {await view.close();}
    expect(view.revoked).toEqual(['blob:synthetic']);
    expect(view.observers.every(observer => observer.disconnected)).toBe(true);
});

test('unmounting an active preview aborts its request and ignores a late response', async () => {
    let complete!: (response: Response) => void;
    reply = () => new Promise(resolve => {complete = resolve;});
    const view = await mount('2'.repeat(88), true);
    await act(async () => view.observers[0].notify(true));
    const signal = signals[0]!;
    expect(signal.aborted).toBe(false);
    await view.close();
    expect(signal.aborted).toBe(true);
    complete(new Response(new Uint8Array([1, 2, 3]), {headers: {'Content-Type': 'image/png'}}));
    await new Promise(setImmediate);
    expect(view.revoked).toHaveLength(0);
});

test('unmounting an offscreen preview disconnects observation without a request', async () => {
    const view = await mount('2'.repeat(88), true);
    await view.close();
    expect(view.observers[0].disconnected).toBe(true);
    view.observers[0].notify(true);
    expect(calls).toHaveLength(0);
});

for (const mime of ['image/png','image/gif','audio/wav','video/mp4']) {
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
    try {expect(document.querySelector('img')?.getAttribute('src')).toContain('/img/'); expect(document.querySelector('iframe')).toBeNull();}
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
        expect(document.querySelector('img')?.getAttribute('src')).toContain('/img/');
    } finally { await view.close(); }
});

test('Solana post renders its explicit Robinhood GIF without using the board chain', async () => {
 network=NETWORKS.solana;
 reply=async()=>new Response(new Uint8Array([71,73,70]),{headers:{'Content-Type':'image/gif'}});
 const hash='0xf8fcb463421d4142859066bf7a9c3ba3e432c81b0ed86cd5e0e4b0aa27cb5d6b';
 const view=await mount('https://iqlabs.dev/?menu=hoodin&post='+hash);
 try {expect(calls).toEqual([`/media/${hash}?network=robinhood`]);expect(document.querySelector('img')?.getAttribute('src')).toBe('blob:synthetic');}
 finally {await view.close();}
});
test('HoodChan renders a Solana attachment using Solana image fallbacks', async () => {
 network=NETWORKS.robinhood;
 reply=async()=>new Response('missing',{status:404});
 const sig='2'.repeat(88);const view=await mount(sig);
 try {expect(calls).toEqual([`/media/${sig}?network=solana`]);expect(document.querySelector('img')?.getAttribute('src')).not.toContain('network=robinhood');}
 finally {await view.close();}
});

 test('BlockChan treats a bare EVM attachment hash as Robinhood without chain probing', async () => {
 network=NETWORKS.solana;
 reply=async()=>new Response(new Uint8Array([71,73,70]),{headers:{'Content-Type':'image/gif'}});
 const hash='0x'+'c'.repeat(64);const view=await mount(hash);
 try{expect(calls).toEqual([`/media/${hash}?network=robinhood`]);expect(document.querySelector('img')).not.toBeNull();}
 finally{await view.close();}
 });


for (const mime of ['image/gif', 'text/html']) {
    test(`inscription ${mime === 'image/gif' ? 'GIF' : 'image fallback'} toggles expansion independently of its badge`, async () => {
        network = NETWORKS.solana;
        reply = async () => new Response(new Uint8Array([71, 73, 70]), { headers: { 'Content-Type': mime } });
        const view = await mount('2'.repeat(88), false, 1, InscriptionAttachment);
        try {
            const image = document.querySelector('img')!;
            const badge = document.querySelector('button')!;
            expect(image.style.cursor).toBe('zoom-in');
            expect(document.querySelector('.fileThumbExpanded')).toBeNull();
            await act(async () => badge.click());
            expect(document.body.textContent).toContain('On-chain inscription');
            expect(document.querySelector('.fileThumbExpanded')).toBeNull();
            await act(async () => image.click());
            expect(document.querySelector('.fileThumbExpanded')).not.toBeNull();
            expect(image.style.cursor).toBe('zoom-out');
            expect(image.style.maxWidth).toBe('100%');
            expect(image.style.maxHeight).toBe('none');
            // Expansion removes thumbnail limits; it does not upscale tiny images.
            expect(image.style.width).toBe('');
            await act(async () => badge.click());
            expect(document.body.textContent).not.toContain('On-chain inscription');
            expect(document.querySelector('.fileThumbExpanded')).not.toBeNull();
            await act(async () => image.click());
            expect(document.querySelector('.fileThumbExpanded')).toBeNull();
            expect(image.style.cursor).toBe('zoom-in');
            expect(image.style.maxWidth).toBe('125px');
            expect(calls).toHaveLength(1);
        } finally { await view.close(); }
    });
}
