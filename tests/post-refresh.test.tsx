import { test, expect, mock } from "bun:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import type { Reply, ThreadEntry, ThreadResult } from "../src/lib/types";

const reply: Reply = { com: "Confirmed reply", name: "QA", time: 2, __txSignature: "tx-reply" };
const op = { com: "Topic", name: "QA", time: 1, threadPda: "topic", __txSignature: "tx-op" };
let getThread = async (): Promise<ThreadResult> => ({ op, replies: [], totalReplies: 0 });
let listThreads = async (_board: string): Promise<ThreadEntry[]> => [];
let previews = async (entry: ThreadEntry) => entry;
mock.module("../src/lib/chains", () => ({ getChain: async () => ({ getThread: () => getThread(), listThreads: (board: string) => listThreads(board), getThreadPreviews: (entry: ThreadEntry) => previews(entry) }) }));
const { usePaginatedReplies } = await import("../src/hooks/use-paginated-replies");
const { useThreads } = await import("../src/hooks/use-threads");

async function mount(render: () => React.ReactNode) {
    const dom = new JSDOM('<div id="root"></div>');
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(document.getElementById("root")!);
    function Probe() { return render(); }
    await act(async () => root.render(<Probe />));
    return { rerender: async () => { await act(async () => root.render(<Probe />)); }, close: async () => { await act(async () => root.unmount()); dom.window.close(); } };
}

test("confirmed reply survives stale/error reads, reconciles once, and does not leak to another thread", async () => {
    let state!: ReturnType<typeof usePaginatedReplies>;
    let thread = "topic";
    getThread = async () => ({ op, replies: [], totalReplies: 0 });
    const view = await mount(() => { state = usePaginatedReplies(thread, "iq"); return <p>{state.replies.map(r => r.com).join()}</p>; });
    try {
        await act(async () => { state.addConfirmedReply(reply); state.addConfirmedReply(reply); });
        expect(state.totalReplies).toBe(1);
        await act(async () => state.refresh());
        expect(state.replies).toHaveLength(1);
        getThread = async () => { throw new Error("offline"); };
        await act(async () => state.refresh());
        expect(state.error?.message).toBe("offline");
        expect(document.body.textContent).toContain(reply.com);
        getThread = async () => ({ op, replies: [reply], totalReplies: 1 });
        await act(async () => state.refresh());
        expect(state.totalReplies).toBe(1);
        getThread = async () => ({ op, replies: [], totalReplies: 0 });
        await act(async () => state.refresh());
        expect(state.replies).toHaveLength(0); // Retired local copy must not resurrect a deleted row.
        await act(async () => state.addConfirmedReply(reply));
        thread = "different";
        await view.rerender();
        expect(state.replies).toHaveLength(0);
    } finally { await view.close(); }
});

test("new threads and board quick replies remain visible through stale refreshes", async () => {
    let state!: ReturnType<typeof useThreads>;
    listThreads = async () => [];
    previews = async e => e;
    const view = await mount(() => { state = useThreads("iq"); return <p>{state.threads.flatMap(t => [t.opData?.com, ...t.lastReplies.map(r => r.com)]).join()}</p>; });
    try {
        await act(async () => state.addConfirmedThread(op));
        await act(async () => state.refresh());
        expect(state.threads).toHaveLength(1);
        const remote: ThreadEntry = { threadPda: "topic", opData: op, lastActivityTime: 1, replyCount: 0, lastReplies: [] };
        listThreads = async () => [remote];
        await act(async () => state.refresh());
        await act(async () => { state.addConfirmedReply("topic", reply); state.addConfirmedReply("topic", reply); });
        await act(async () => state.refresh());
        expect(state.threads[0].replyCount).toBe(1);
        expect(document.body.textContent).toContain(reply.com);
        previews = async e => ({ ...e, replyCount: 1, lastReplies: [reply] });
        await act(async () => state.refresh());
        expect(state.threads[0].replyCount).toBe(1);
        expect(state.threads[0].lastReplies).toHaveLength(1);
    } finally { await view.close(); }
});

test("an older board refresh cannot overwrite the current board", async () => {
    let state!: ReturnType<typeof useThreads>;
    let board = "old";
    let finish!: (value: ThreadEntry[]) => void;
    listThreads = async id => id === "old" ? new Promise(resolve => { finish = resolve; }) : [];
    const view = await mount(() => { state = useThreads(board); return null; });
    try {
        board = "new"; await view.rerender();
        await act(async () => finish([{ threadPda: "old", opData: op, lastActivityTime: 1, replyCount: 0, lastReplies: [] }]));
        expect(state.threads).toHaveLength(0);
    } finally { await view.close(); }
});
