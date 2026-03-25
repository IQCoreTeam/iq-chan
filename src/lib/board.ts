import { Connection, PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { FEED_SEED_PREFIX, THREADS_PER_PAGE, DB_ROOT_ID, DEFAULT_BOARDS } from "./constants";
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

// Build seedHex → boardId lookup from known boards (exported for admin page)
// Includes boards not in DEFAULT_BOARDS (e.g. gated boards like "iq")
const KNOWN_BOARD_IDS = [...Object.keys(DEFAULT_BOARDS), "iq"];
export const SEED_TO_BOARD_ID = new Map<string, string>();
for (const id of KNOWN_BOARD_IDS) {
    SEED_TO_BOARD_ID.set(Buffer.from(iqlabs.utils.toSeedBytes(id)).toString("hex"), id);
}

/** Read the on-chain board list from dbRoot table_seeds. */
export function gateFromMeta(meta: Awaited<ReturnType<typeof iqlabs.reader.fetchTableMeta>>): Pick<BoardMeta, "gateMint" | "gateAmount" | "gateType"> {
    const mint: string = meta.gate?.mint?.toBase58?.() ?? "";
    const isGated = mint && mint !== "11111111111111111111111111111111";
    if (!isGated) return {};
    return {
        gateMint: mint,
        gateAmount: typeof meta.gate?.amount === "number" ? meta.gate.amount : (meta.gate?.amount?.toNumber?.() ?? 0),
        gateType: (meta.gate as any)?.gate_type ?? meta.gate?.gateType ?? 0,
    };
}

export async function fetchBoards(connection: Connection): Promise<{
    boards: BoardMeta[];
    creator: string | null;
}> {
    try {
        const { creator, tableSeeds } = await iqlabs.reader.getTablelistFromRoot(
            connection,
            DB_ROOT_ID,
        );

        const knownSeeds = new Set(
            Object.keys(DEFAULT_BOARDS).map((id) =>
                Buffer.from(iqlabs.utils.toSeedBytes(id)).toString("hex"),
            ),
        );

        const boards: BoardMeta[] = Object.entries(DEFAULT_BOARDS).map(([id, m]) => ({
            id, title: m.title, description: m.description, image: m.image,
        }));

        // Append any onboarded boards not in the hardcoded list
        for (const seedHex of tableSeeds as string[]) {
            if (knownSeeds.has(seedHex)) continue;
            const boardId = SEED_TO_BOARD_ID.get(seedHex) ?? seedHex;
            try {
                const seedArg = SEED_TO_BOARD_ID.has(seedHex) ? boardId : Buffer.from(seedHex, "hex");
                const meta = await iqlabs.reader.fetchTableMeta(
                    connection, iqlabs.contract.PROGRAM_ID, DB_ROOT_ID, seedArg,
                );
                boards.push({
                    id: boardId,
                    title: meta.name || boardId,
                    description: "",
                    image: "",
                });
            } catch { /* skip boards with no table account */ }
        }

        return { boards, creator };
    } catch {
        // Fallback to hardcoded without gate info
        const boards: BoardMeta[] = Object.entries(DEFAULT_BOARDS).map(([id, m]) => ({
            id, title: m.title, description: m.description, image: m.image,
        }));
        return { boards, creator: null };
    }
}
