import {test, expect, mock} from "bun:test";
import {JSDOM} from "jsdom";
import {act} from "react";

let family = "svm";
let boards = [{id: "fast", seed: "fast", title: "Fast"}, {id: "slow", seed: "slow", title: "Slow"}];
let read: (board: string) => Promise<any[]>;
const calls: string[] = [];
mock.module("../src/hooks/use-boards", () => ({useBoards: () => ({boards})}));
mock.module("../src/lib/chains/resolve", () => ({resolveNetwork: () => ({family, id: family === "svm" ? "solana" : "robinhood", gatewayNetworkParam: family === "svm" ? undefined : "robinhood", theme: {siteName: "Fixture", chainLabel: family}})}));
mock.module("../src/lib/chains", () => ({getChain: async () => ({listThreads: (id: string) => {calls.push(`evm:${id}`); return read(id);}})}));
mock.module("../src/lib/gateway", () => ({fetchAllTableRows: (id: string) => {calls.push(`svm:${id}`); return read(id);}}));
mock.module("../src/lib/board", () => ({getFeedPda: (_: unknown, seed: string) => ({toBase58: () => seed}), isMoreLikelyOp: () => false}));
mock.module("../src/lib/constants", () => ({DB_ROOT_KEY: "fixture", getRandomBanner: () => "", getNoImagePlaceholders: () => ["/fallback.png"]}));
mock.module("../src/components/hash-link", () => ({default: ({href, children, ...rest}: any) => <a href={href} {...rest}>{children}</a>}));
const {default: HomePage} = await import("../src/components/pages/home-page");

function entry(id: string) {
    const op = {name: "QA", com: id, sub: id, time: 1, threadSeed: id, threadPda: id, img: `https://fixture.invalid/${id}.png`};
    return family === "svm" ? op : {threadPda: id, opData: op, replyCount: 2, lastActivityTime: 1};
}

async function mount() {
    const dom = new JSDOM('<div id="root"></div>', {url: "http://localhost"});
    Object.assign(globalThis, {window: dom.window, document: dom.window.document, sessionStorage: dom.window.sessionStorage, localStorage:dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true,
        Image: class {constructor() {throw new Error("Detached image probe must not block the homepage");}}});
    const {createRoot} = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    await act(async () => root.render(<HomePage />));
    return {render: async () => {await act(async () => root.render(<HomePage />));}, close: async () => {await act(async () => root.unmount()); dom.window.close();}};
}

for (const network of ["svm", "evm"]) {
    test(`${network}: a slow board and unloaded image do not hide completed boards`, async () => {
        family = network;
        boards = [{id: "fast", seed: "fast", title: "Fast"}, {id: "slow", seed: "slow", title: "Slow"}];
        calls.length = 0;
        let finish!: (value: any[]) => void;
        read = async id => id === "fast" ? [entry("fast-topic")] : new Promise(resolve => {finish = resolve;});
        const view = await mount();
        try {
            expect(document.querySelector("#popular-threads")?.textContent).toContain("fast-topic");
            expect(document.querySelector("#c-threads")?.getAttribute("aria-busy")).toBe("true");
            expect(document.querySelectorAll(".c-thumbnail img")).toHaveLength(1);
            expect(calls).toEqual([`${network}:fast`, `${network}:slow`]);
            await act(async () => finish([entry("slow-topic")]));
            expect(document.querySelector("#popular-threads")?.textContent).toContain("slow-topic");
            expect(document.querySelector("#c-threads")?.getAttribute("aria-busy")).toBe("false");
            expect(calls).toHaveLength(2); // No extra RPC refresh/probes.
            expect(document.querySelector("#site-stats")?.textContent).toContain(network === "svm" ? "Total Posts: 2" : "Total Posts: 6");
            const image = document.querySelector(".c-thumbnail img") as HTMLImageElement;
            await act(async () => {image.dispatchEvent(new window.Event("error"));});
            expect(image.getAttribute("src")).toBe("/fallback.png");
        } finally {await view.close();}
    });
}

test("failed boards are disclosed while successful threads remain visible", async () => {
    family = "svm";
    read = async id => {if (id === "slow") throw new Error("fixture unavailable"); return [entry("available")];};
    const view = await mount();
    try {
        expect(document.body.textContent).toContain("available");
        expect(document.body.textContent).toContain("Some boards could not be loaded");
        expect(document.body.textContent).toContain("Posts loaded:");
    } finally {await view.close();}
});

test("an old request cannot populate a changed board selection", async () => {
    family = "svm";
    boards = [{id: "old", seed: "old", title: "Old"}];
    let finish!: (value: any[]) => void;
    read = async id => id === "old" ? new Promise(resolve => {finish = resolve;}) : [entry("new-topic")];
    const view = await mount();
    try {
        boards = [{id: "new", seed: "new", title: "New"}];
        await view.render();
        await act(async () => finish([entry("old-topic")]));
        expect(document.querySelector("#popular-threads")?.textContent).toContain("new-topic");
        expect(document.querySelector("#popular-threads")?.textContent).not.toContain("old-topic");
    } finally {await view.close();}
});

test("a total outage is not presented as an empty site", async () => {
    family = "svm";
    boards = [{id: "offline", seed: "offline", title: "Offline"}];
    read = async () => {throw new Error("fixture outage");};
    const view = await mount();
    try {
        expect(document.querySelector("#popular-threads")?.textContent).toContain("Unable to load threads");
        expect(document.body.textContent).not.toContain("No threads yet");
    } finally {await view.close();}
});

test("an empty board configuration finishes without requests", async () => {
    boards = [];
    calls.length = 0;
    const view = await mount();
    try {
        expect(document.querySelector("#popular-threads")?.textContent).toContain("No threads yet");
        expect(document.querySelector("#c-threads")?.getAttribute("aria-busy")).toBe("false");
        expect(calls).toHaveLength(0);
    } finally {await view.close();}
});

for (const chain of ["svm", "evm"]) test(`${chain}: homepage resolves bare inscription IDs through the existing image fallback`,async()=>{
 family=chain;boards=[{id:"fast",seed:"fast",title:"Fast"}];calls.length=0;
 const sig=chain==="svm"?"2".repeat(88):"0x"+"a".repeat(64);
 read=async()=>{const row=entry("inscription");("opData" in row ? row.opData : row).img=sig;return [row];};
 const view=await mount();try{
  const image=document.querySelector(".c-thumbnail img") as HTMLImageElement;
  expect(image.getAttribute("src")).toBe(`https://gateway.iqlabs.dev/img/${sig}.png${chain==="svm"?"":"?network=robinhood"}`);
  await act(async()=>image.dispatchEvent(new window.Event("error")));
  expect(image.getAttribute("src")).toContain(`/img/${sig}.png`);
  expect(image.getAttribute("src")).not.toBe(sig);
  Object.defineProperty(image,"naturalWidth",{value:1200});Object.defineProperty(image,"naturalHeight",{value:600});
  await act(async()=>image.dispatchEvent(new window.Event("load")));
  expect(image.style.opacity).toBe("1");
  expect((document.querySelector(".c-thumbnail") as HTMLElement).style.width).toBe("150px");
  expect((document.querySelector(".c-thumbnail") as HTMLElement).style.height).toBe("75px");
  expect(calls).toEqual([`${chain}:fast`]);
 }finally{await view.close();}
});
