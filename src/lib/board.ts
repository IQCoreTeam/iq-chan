import { PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { FEED_SEED_PREFIX, THREADS_PER_PAGE, BOARD_METADATA } from "./constants";
import { fetchAllTableRows, fetchDbRoot } from "./gateway";
import type { Post, Reply, BoardMeta } from "./types";

const PROGRAM_ID = iqlabs.contract.PROGRAM_ID;

const REPLY_PREVIEW_COUNT = 5;

export interface ThreadEntry {
    threadPda: string;
    opData: Post | null;
    lastActivityTime: number;
    replyCount: number;
    lastReplies: Reply[];
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

// TODO: filter feed rows to only show threads written via board table (new structure)
// i.e. rows where threadPda === board table PDA. Old threads (threadPda = thread table PDA)
// will appear until the board gets enough new activity to push them off.
// Do this migration once the site is active and old threads are no longer prominent.
export async function fetchFeedThreads(
    feedPda: PublicKey,
): Promise<{ threads: ThreadEntry[]; nextCursor?: string }> {
    const threads = new Map<string, ThreadEntry>();

    const feedRows = await fetchAllTableRows(feedPda.toBase58(), THREADS_PER_PAGE * 3);

    for (const row of feedRows) {
        const post = row as Post;
        if (!post.threadPda) continue;

        const time = post.time ?? 0;
        const existing = threads.get(post.threadPda);

        if (existing) {
            // OP = earliest post for this thread (both OP and replies have threadSeed)
            if (!existing.opData || time < existing.opData.time) existing.opData = post;
            existing.lastActivityTime = Math.max(existing.lastActivityTime, time);
        } else {
            threads.set(post.threadPda, {
                threadPda: post.threadPda,
                opData: post,
                lastActivityTime: time,
                replyCount: 0,
                lastReplies: [],
            });
        }
    }

    // Fetch OP + reply previews for each thread
    await Promise.all(
        [...threads.values()].map(async (entry) => {
            const rows = await fetchAllTableRows(entry.threadPda, 50);

            // OP = earliest post with threadSeed (may already be in entry.opData from feed)
            const opFromRows = rows.filter((r) => !!r.threadSeed)
                .reduce<Post | undefined>((a, b) => !a || (b as Post).time < a.time ? b as Post : a, undefined);
            if (opFromRows && !entry.opData) entry.opData = opFromRows;

            // Everything except the OP is a reply
            const opSig = entry.opData?.__txSignature ?? opFromRows?.__txSignature;
            const replies = rows
                .filter((r) => r.__txSignature !== opSig)
                .sort((a, b) => (a.time as number) - (b.time as number));

            entry.replyCount = replies.length;
            entry.lastReplies = replies.slice(-REPLY_PREVIEW_COUNT) as Reply[];
        }),
    );

    const sorted = [...threads.values()]
        .filter((t) => t.opData !== null)
        .sort((a, b) => b.lastActivityTime - a.lastActivityTime);

    return { threads: sorted, nextCursor: undefined };
}

// Build seedHex → boardId lookup from known boards (exported for admin page)
// Includes boards not in BOARD_METADATA (e.g. gated boards like "iq")
const KNOWN_BOARD_IDS = Object.keys(BOARD_METADATA);
export const SEED_TO_BOARD_ID = new Map<string, string>();
for (const id of KNOWN_BOARD_IDS) {
    SEED_TO_BOARD_ID.set(Buffer.from(iqlabs.utils.toSeedBytes(id)).toString("hex"), id);
}

export async function fetchBoards(): Promise<{
    boards: BoardMeta[];
    creator: string | null;
}> {
    try {
        const { creator, tableSeeds, tableNames } = await fetchDbRoot();

        const knownSeeds = new Set(
            Object.keys(BOARD_METADATA).map((id) =>
                Buffer.from(iqlabs.utils.toSeedBytes(id)).toString("hex"),
            ),
        );

        const boards: BoardMeta[] = Object.entries(BOARD_METADATA).map(([id, m]) => ({
            id, seed: m.seed ?? id, title: m.title, description: m.description, image: m.image,
        }));

        // Append any onboarded boards not in the hardcoded list
        for (const seedHex of tableSeeds) {
            if (knownSeeds.has(seedHex)) continue;
            const boardId = SEED_TO_BOARD_ID.get(seedHex) ?? seedHex;
            const name = tableNames[seedHex] || boardId;
            boards.push({
                id: boardId,
                seed: boardId,
                title: name,
                description: "",
                image: "",
            });
        }

        return { boards, creator };
    } catch {
        const boards: BoardMeta[] = Object.entries(BOARD_METADATA).map(([id, m]) => ({
            id, seed: m.seed ?? id, title: m.title, description: m.description, image: m.image,
        }));
        return { boards, creator: null };
    }
}
