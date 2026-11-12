import { afterEach, expect, test } from "bun:test";
import { fetchThreadPreviews } from "../src/lib/board";
import { deriveInstructionTablePda } from "../src/lib/constants";
import type { ThreadEntry } from "../src/lib/types";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const threadSeed = "iq/thread/33396616-bf8b-4343-8caf-085c7426d2ba";
const reply = { __txSignature: "reply", time: 1793945867, com: "before" };
const instruction = { __txSignature: "edit", target: "reply", com: "after" };
const entry = (threadPda: string): ThreadEntry => ({
    threadPda,
    opData: { __txSignature: "op", threadSeed, time: 1793945800, com: "op", name: "" },
    lastActivityTime: 0,
    replyCount: 0,
    lastReplies: [],
});

test("a leaked edit row updates the reply instead of becoming a second preview", async () => {
    const paths: string[] = [];
    globalThis.fetch = (async (input: string) => {
        const path = new URL(input).pathname;
        paths.push(path);
        return Response.json({ rows: path.endsWith("/edited/rows")
            ? [instruction, reply]
            : [instruction] });
    }) as typeof fetch;
    const result = await fetchThreadPreviews(entry("edited"));
    expect(result.replyCount).toBe(1);
    expect(result.lastReplies).toMatchObject([{ __txSignature: "reply", time: reply.time, com: "after" }]);
    expect(paths).toEqual(["/table/edited/rows", `/table/${deriveInstructionTablePda(threadSeed)}/rows`]);
});

test("a normal preview makes only its existing row request", async () => {
    let requests = 0;
    globalThis.fetch = (async (_input: string) => {
        requests++;
        return Response.json({ rows: [reply] });
    }) as typeof fetch;
    const result = await fetchThreadPreviews(entry("ordinary"));
    expect(result.replyCount).toBe(1);
    expect(result.lastReplies).toMatchObject([reply]);
    expect(requests).toBe(1);
});
