import { PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { FEED_SEED_PREFIX, THREADS_PER_PAGE, BOARD_METADATA, deriveInstructionTablePda } from "./constants";
import { fetchAllTableRows, fetchDbRoot, type Row } from "./gateway";
import { isPostRow, mergeInstructions } from "./parse";
import type { Post, Reply, BoardMeta, ThreadEntry } from "./types";

export type { ThreadEntry };

const PROGRAM_ID = iqlabs.contract.PROGRAM_ID;

const REPLY_PREVIEW_COUNT = 5;

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

/**
 * Decide whether `candidate` is a more-likely OP than `current`.
 * Primary signal: OPs hardcode a non-empty `sub`; replies hardcode `sub: ""`
 * (see use-post.ts). Tiebreaker: earlier time (OP is posted before its replies).
 * Used anywhere we pick the OP out of a mix of OP + bump rows in the feed.
 */
export function isMoreLikelyOp(
    current: { sub?: string; time?: number } | undefined,
    candidate: { sub?: string; time?: number },
): boolean {
    if (!current) return true;
    const curHasSub = !!current.sub;
    const candHasSub = !!candidate.sub;
    if (candHasSub !== curHasSub) return candHasSub;
    return (candidate.time ?? 0) < (current.time ?? 0);
}

// TODO: filter to threadPda === board table PDA once old thread-table threads age out

/** Phase 1: Fetch feed rows only — returns threads with OPs but no reply previews. Fast. */
export async function fetchFeedThreadsQuick(
    feedPda: PublicKey,
): Promise<ThreadEntry[]> {
    const threads = new Map<string, ThreadEntry>();

    const feedRows = await fetchAllTableRows(feedPda.toBase58(), THREADS_PER_PAGE * 3);

    for (const row of feedRows) {
        const post = row;
        if (!isPostRow(post) || !post.threadPda) continue;

        const time = post.time ?? 0;
        const existing = threads.get(post.threadPda);

        if (existing) {
            if (post.threadSeed && isMoreLikelyOp(existing.opData ?? undefined, post)) {
                existing.opData = post;
            }
            existing.lastActivityTime = Math.max(existing.lastActivityTime, time);
        } else {
            threads.set(post.threadPda, {
                threadPda: post.threadPda,
                opData: post.threadSeed ? post : null,
                lastActivityTime: time,
                replyCount: 0,
                lastReplies: [],
            });
        }
    }

    return [...threads.values()]
        .filter((t) => t.opData !== null)
        .sort((a, b) => b.lastActivityTime - a.lastActivityTime);
}

/** Phase 2: Fetch reply previews for a single thread. Called lazily after initial render. */
export async function fetchThreadPreviews(entry: ThreadEntry): Promise<ThreadEntry> {
    const rows = await fetchAllTableRows(entry.threadPda, 50);

    let posts: Post[] = rows.filter(isPostRow);
    const op = entry.opData ?? posts
        .filter((row) => !!row.threadSeed)
        .reduce<Post | null>((best, row) => isMoreLikelyOp(best ?? undefined, row) ? row : best, null);
    if (op && !posts.some((row) => row.__txSignature === op.__txSignature)) {
        posts = [op, ...posts];
    }

    // The signature scan can surface edits alongside posts. Read the actual
    // instruction table only when a scan row targets a post in this preview.
    const signatures = new Set(posts.map((post) => post.__txSignature));
    const hasInstruction = rows.some((row) =>
        !isPostRow(row) && typeof row.target === "string" && signatures.has(row.target),
    );
    if (op?.threadSeed && hasInstruction) {
        const instructionTable = deriveInstructionTablePda(op.threadSeed);
        const instructions = await fetchAllTableRows(instructionTable).catch(() => []);
        posts = mergeInstructions(posts as Row[], instructions) as Post[];
    }

    const replies = posts
        .filter((row) => row.__txSignature !== op?.__txSignature)
        .sort((a, b) => a.time - b.time);

    return {
        ...entry,
        opData: posts.find((row) => row.__txSignature === op?.__txSignature) ?? null,
        replyCount: replies.length,
        lastReplies: replies.slice(-REPLY_PREVIEW_COUNT) as Reply[],
    };
}

// Seeds in DbRoot are now human-readable slugs ("po", "biz", etc.)
const KNOWN_BOARD_IDS = new Set(Object.keys(BOARD_METADATA));

function defaultBoards(): BoardMeta[] {
    return Object.entries(BOARD_METADATA).map(([id, m]) => ({
        id, seed: m.seed ?? id, title: m.title, description: m.description, image: m.image,
    }));
}

export async function fetchBoards(): Promise<{
    boards: BoardMeta[];
    creator: string | null;
}> {
    try {
        const { creator, tableSeeds, tableNames } = await fetchDbRoot();

        const boards = defaultBoards();

        // Append any onboarded boards not in the hardcoded list
        // DbRoot.table_seeds now contains readable slugs ("po", "biz", etc.)
        for (const seed of tableSeeds) {
            if (KNOWN_BOARD_IDS.has(seed)) continue;
            const name = tableNames[seed] || seed;
            boards.push({
                id: seed,
                seed: seed,
                title: name,
                description: "",
                image: "",
            });
        }

        return { boards, creator };
    } catch {
        return { boards: defaultBoards(), creator: null };
    }
}
