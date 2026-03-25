import { Connection, PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { FEED_SEED_PREFIX, THREADS_PER_PAGE, DB_ROOT_ID, DB_ROOT_KEY, DEFAULT_BOARDS } from "./constants";
import { fetchAllTableRows } from "./gateway";
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

export async function fetchFeedThreads(
    feedPda: PublicKey,
    before?: string,
): Promise<{ threads: ThreadEntry[]; nextCursor?: string }> {
    const threads = new Map<string, ThreadEntry>();

    // Use gateway instead of direct RPC
    const feedRows = await fetchAllTableRows(feedPda.toBase58(), THREADS_PER_PAGE * 3);

    for (const row of feedRows) {
        const post = row as Post;
        if (!post.threadPda) continue;

        const time = post.time ?? 0;
        const existing = threads.get(post.threadPda);
        const isOp = !!post.threadSeed;

        if (existing) {
            if (isOp) existing.opData = post;
            existing.lastActivityTime = Math.max(existing.lastActivityTime, time);
        } else {
            threads.set(post.threadPda, {
                threadPda: post.threadPda,
                opData: isOp ? post : null,
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
            const op = rows.find((r) => !!r.threadSeed) as Post | undefined;
            if (op && !entry.opData) entry.opData = op;

            const replies = rows
                .filter((r) => !r.threadSeed)
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

// Build seed→boardId lookup from known boards (exported for admin page)
export const SEED_TO_BOARD_ID = new Map<string, string>();
for (const id of Object.keys(DEFAULT_BOARDS)) {
    SEED_TO_BOARD_ID.set(Buffer.from(iqlabs.utils.toSeedBytes(id)).toString("hex"), id);
}

/** Read the on-chain board list from dbRoot table_seeds. */
export async function fetchBoards(connection: Connection): Promise<{
    boards: BoardMeta[];
    creator: string | null;
}> {
    try {
        const { creator, tableSeeds } = await iqlabs.reader.getTablelistFromRoot(
            connection,
            DB_ROOT_ID,
        );

        const boards: BoardMeta[] = [];
        for (const seedHex of tableSeeds as string[]) {
            const id = SEED_TO_BOARD_ID.get(seedHex);
            if (!id) continue; // unknown seed — skip until metadata tables exist

            const meta = DEFAULT_BOARDS[id];
            boards.push({
                id,
                title: meta?.title ?? id,
                description: meta?.description ?? "",
                image: meta?.image ?? "",
            });
        }

        // If no boards onboarded yet, return defaults
        if (boards.length === 0) {
            return {
                creator,
                boards: Object.entries(DEFAULT_BOARDS).map(([id, m]) => ({
                    id,
                    title: m.title,
                    description: m.description,
                    image: m.image,
                })),
            };
        }

        return { boards, creator };
    } catch {
        // Fallback to defaults if chain read fails
        return {
            creator: null,
            boards: Object.entries(DEFAULT_BOARDS).map(([id, m]) => ({
                id,
                title: m.title,
                description: m.description,
                image: m.image,
            })),
        };
    }
}
