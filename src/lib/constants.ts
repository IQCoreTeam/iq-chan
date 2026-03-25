// DbRoot ("iqchan")
// └── thread (ext table)      seed: "{boardId}/thread/{randomId}"
//     ├── OP row:    {sub, com, name, time, img?, threadPda, threadSeed}
//     └── reply row: {sub:"", com, name, time, img?, threadPda}
// feed (one per board) — remainingAccounts, bump ordering

import iqlabs from "iqlabs-sdk";

export const DB_ROOT_ID = "iqchan";
export const THREADS_PER_PAGE = 20;
export const BUMP_LIMIT = 300;
export const FEED_SEED_PREFIX = "feedmY}AGBJiqLabs";
// Official boards: slug → on-chain seed + display metadata
// seed = the actual on-chain seed used for PDA derivation
// For legacy boards, seed matches the slug. For promoted boards, seed is the random hash.
export const OFFICIAL_BOARDS: Record<string, { seed: string; title: string; description: string; image: string }> = {
    po:  { seed: "po",  title: "Politically Incorrect", description: "Political discussion",            image: "/boards/po.webp" },
    biz: { seed: "biz", title: "Business & Finance",    description: "Business and finance discussion", image: "/boards/biz.webp" },
    a:   { seed: "a",   title: "Anime & Manga",         description: "Anime and manga discussion",     image: "/boards/a.webp" },
    g:   { seed: "g",   title: "Technology",             description: "Technology discussion",           image: "/boards/g.webp" },
};

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

/** Resolve a URL slug to the on-chain seed. Official boards may have a different seed than slug. */
export function resolveBoardSeed(slug: string): string {
    return OFFICIAL_BOARDS[slug]?.seed ?? slug;
}

export function threadTableSeed(boardId: string, randomId: string): string {
    return `${boardId}/thread/${randomId}`;
}
