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
// Fallback board metadata for known boards (used until on-chain metadata is loaded)
export const DEFAULT_BOARDS: Record<string, { title: string; description: string; image: string }> = {
    po: { title: "Politically Incorrect", description: "Political discussion", image: "/boards/po.webp" },
    biz: { title: "Business & Finance", description: "Business and finance discussion", image: "/boards/biz.webp" },
    a: { title: "Anime & Manga", description: "Anime and manga discussion", image: "/boards/a.webp" },
    g: { title: "Technology", description: "Technology discussion", image: "/boards/g.webp" },
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

export function threadTableSeed(boardId: string, randomId: string): string {
    return `${boardId}/thread/${randomId}`;
}
