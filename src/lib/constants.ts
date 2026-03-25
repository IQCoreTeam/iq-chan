// DbRoot ("iqchan")
// └── board table (ext table)  seed: boardId  e.g. "po", "biz"
//     ├── OP row:    {sub, com, name, time, img?, threadPda, threadSeed}
//     └── reply row: {sub:"", com, name, time, img?, threadPda, threadSeed}
// feed (one per board) — remainingAccounts, bump ordering
// threadPda = board table PDA (same for all posts in the board)
// threadSeed = unique UUID per thread OP, shared by all its replies

import iqlabs from "iqlabs-sdk";

export const DB_ROOT_ID = "iqchan";
export const THREADS_PER_PAGE = 20;
export const BUMP_LIMIT = 300;
export const FEED_SEED_PREFIX = "feedmY}AGBJiqLabs";
// Fallback board metadata for known boards (used until on-chain metadata is loaded) //this board is not onboarded yet
// seed = on-chain seed for PDA derivation. For legacy boards, seed = slug.
// For promoted user boards, seed is the random hash.
export const DEFAULT_BOARDS: Record<string, { seed: string; title: string; description: string; image: string }> = {
    po:  { seed: "po",  title: "Politically Incorrect", description: "Political discussion",            image: "/boards/po.webp" },
    biz: { seed: "biz", title: "Business & Finance",    description: "Business and finance discussion", image: "/boards/biz.webp" },
    a:   { seed: "a",   title: "Anime & Manga",         description: "Anime and manga discussion",     image: "/boards/a.webp" },
    g:   { seed: "g",   title: "Technology",             description: "Technology discussion",           image: "/boards/g.webp" },
};
export { DEFAULT_BOARDS as OFFICIAL_BOARDS };

export const ESTIMATED_SOL_COST = {
    thread: "0.023",
    reply: "0.003",
} as const;

export const DB_ROOT_ID_BYTES = Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID));
export const DB_ROOT_KEY = iqlabs.contract.getDbRootPda(DB_ROOT_ID_BYTES);

export function deriveTablePda(seed: string): string {
    return iqlabs.contract.getTablePda(DB_ROOT_KEY, iqlabs.utils.toSeedBytes(seed)).toBase58();
}

export function deriveInstructionTablePda(seed: string): string {
    return iqlabs.contract.getInstructionTablePda(DB_ROOT_KEY, iqlabs.utils.toSeedBytes(seed)).toBase58();
}

/** Resolve URL slug to on-chain seed. Official boards may differ. */
export function resolveBoardSeed(slug: string): string {
    return DEFAULT_BOARDS[slug]?.seed ?? slug;
}

export function threadTableSeed(boardId: string, randomId: string): string {
    return `${boardId}/thread/${randomId}`;
}
