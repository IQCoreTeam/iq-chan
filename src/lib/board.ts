// Board-specific logic that SDK doesn't provide.
// getFeedPda — feed PDA derivation (one per board, address-only PDA for tx indexing)
// fetchFeedThreads — feed-based thread listing with bump ordering

import { Connection, PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { FEED_SEED_PREFIX, THREADS_PER_PAGE } from "./constants";
import { fetchTableSlice, fetchAllTableRows } from "./gateway";
import type { Post } from "./types";

const PROGRAM_ID = iqlabs.contract.PROGRAM_ID;

// ─── Feed PDA derivation ────────────────────────────────────────────────────

export function getFeedPda(dbRootKey: PublicKey, boardId: string): PublicKey {
    const boardIdHash = iqlabs.utils.toSeedBytes(boardId);
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(FEED_SEED_PREFIX),
            PROGRAM_ID.toBuffer(),
            dbRootKey.toBuffer(),
            Buffer.from(boardIdHash),
        ],
        PROGRAM_ID,
    )[0];
}

// ─── Feed-based thread listing ──────────────────────────────────────────────

export interface ThreadEntry {
    threadPda: string;
    opData: Post | null;
    lastActivityTime: number;
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
            const pda = row.threadPda as string | undefined;
            if (!pda) continue; // skip old data without threadPda

            const time = row.time as number ?? 0;
            const existing = threads.get(pda);

            if (row.sub && (row.sub as string).length > 0) {
                // OP row
                const post = row as Post;
                if (existing) {
                    existing.opData = post;
                    existing.lastActivityTime = Math.max(existing.lastActivityTime, time);
                } else {
                    threads.set(pda, { threadPda: pda, opData: post, lastActivityTime: time });
                }
            } else {
                // Reply row
                if (existing) {
                    existing.lastActivityTime = Math.max(existing.lastActivityTime, time);
                } else {
                    threads.set(pda, { threadPda: pda, opData: null, lastActivityTime: time });
                }
            }

            if (threads.size >= THREADS_PER_PAGE) break;
        }

        cursor = sigStrings[sigStrings.length - 1];
    }

    // For threads where we haven't seen the OP yet, fetch it from the thread table
    const missingOp = [...threads.values()].filter((t) => t.opData === null);
    if (missingOp.length > 0) {
        await Promise.all(
            missingOp.map(async (entry) => {
                const rows = await fetchAllTableRows(entry.threadPda, 10);
                const op = rows.find((r) => r.sub && (r.sub as string).length > 0);
                if (op) entry.opData = op as Post;
            }),
        );
    }

    // Sort by latest activity descending
    const sorted = [...threads.values()]
        .filter((t) => t.opData !== null)
        .sort((a, b) => b.lastActivityTime - a.lastActivityTime);

    return { threads: sorted, nextCursor: cursor };
}
