import { Connection, PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { FEED_SEED_PREFIX, THREADS_PER_PAGE } from "./constants";
import { fetchTableSlice, fetchAllTableRows } from "./gateway";
import type { Post } from "./types";

const PROGRAM_ID = iqlabs.contract.PROGRAM_ID;

export interface ThreadEntry {
    threadPda: string;
    opData: Post | null;
    lastActivityTime: number;
}

export function getFeedPda(dbRootKey: PublicKey, boardId: string): PublicKey {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(FEED_SEED_PREFIX),
            PROGRAM_ID.toBuffer(),
            dbRootKey.toBuffer(),
            Buffer.from(iqlabs.utils.toSeedBytes(boardId)),
        ],
        PROGRAM_ID,
    )[0];
}

const FEED_BATCH_SIZE = 50;

export async function fetchFeedThreads(
    connection: Connection,
    feedPda: PublicKey,
    before?: string,
): Promise<{ threads: ThreadEntry[]; nextCursor?: string }> {
    const threads = new Map<string, ThreadEntry>();
    let cursor = before;

    while (threads.size < THREADS_PER_PAGE) {
        const sigs = await connection.getSignaturesForAddress(feedPda, {
            limit: FEED_BATCH_SIZE,
            ...(cursor ? { before: cursor } : {}),
        });

        if (sigs.length === 0) break;

        const sigStrings = sigs.map((s) => s.signature);
        const rows = await fetchTableSlice(feedPda.toBase58(), sigStrings);

        for (const row of rows) {
            const post = row as Post;
            if (!post.threadPda) continue;

            const time = post.time ?? 0;
            const existing = threads.get(post.threadPda);
            const isOp = !!post.sub && post.sub.length > 0;

            if (existing) {
                if (isOp) existing.opData = post;
                existing.lastActivityTime = Math.max(existing.lastActivityTime, time);
            } else {
                threads.set(post.threadPda, {
                    threadPda: post.threadPda,
                    opData: isOp ? post : null,
                    lastActivityTime: time,
                });
            }

            if (threads.size >= THREADS_PER_PAGE) break;
        }

        cursor = sigStrings[sigStrings.length - 1];
    }

    // Fetch OP for threads where we only saw replies in the feed
    const missingOp = [...threads.values()].filter((t) => t.opData === null);
    if (missingOp.length > 0) {
        await Promise.all(
            missingOp.map(async (entry) => {
                const rows = await fetchAllTableRows(entry.threadPda, 10);
                const op = rows.find((r) => r.sub && r.sub.length > 0) as Post | undefined;
                if (op) entry.opData = op;
            }),
        );
    }

    const sorted = [...threads.values()]
        .filter((t) => t.opData !== null)
        .sort((a, b) => b.lastActivityTime - a.lastActivityTime);

    return { threads: sorted, nextCursor: cursor };
}
