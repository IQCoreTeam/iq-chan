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
export const BOARD_METADATA: Record<string, { seed: string; title: string; description: string; image: string }> = {
    iq:  { seed: "iq",  title: "IQ Labs Community", description: "IQ token holders only", image: "/boards/iqbanner.webp" },
    po:  { seed: "po",  title: "Politically Incorrect", description: "Political discussion", image: "/boards/po.webp" },
    biz: { seed: "biz", title: "Business & Finance", description: "Business and finance discussion", image: "/boards/biz.webp" },
    a:   { seed: "a",   title: "Anime & Manga", description: "Anime and manga discussion", image: "/boards/a.webp" },
    g:   { seed: "g",   title: "Technology",  description: "Technology discussion",  image: "/boards/g.webp" },
    nub:   { seed: "nub",   title: "Nub Cat Community",  description: "Nub Cat Community",  image: "/boards/nubcat.webp" },
    mlg:   { seed: "mlg",   title: "Community For MLG",  description: "Community For MLG",  image: "/boards/mlg.webp" },
    y2k:   { seed: "y2k",   title: "Community For Y2kDotCom",  description: "Community For Y2kDotCom",  image: "/boards/y2k.webp" },

};

export const OFFICIAL_BOARDS: string[] = ["iq", "po", "biz", "a", "g"];

export const BOARD_COLUMNS = ["sub", "com", "name", "time", "img", "threadPda", "threadSeed"];

export const DB_ROOT_ID_BYTES = Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID));
export const DB_ROOT_KEY = iqlabs.contract.getDbRootPda(DB_ROOT_ID_BYTES);

export function deriveTablePda(seed: string): string {
    return iqlabs.contract.getTablePda(DB_ROOT_KEY, iqlabs.utils.toSeedBytes(seed)).toBase58();
}

export function deriveInstructionTablePda(seed: string): string {
    return iqlabs.contract.getInstructionTablePda(DB_ROOT_KEY, iqlabs.utils.toSeedBytes(seed)).toBase58();
}

export function resolveBoardSeed(slug: string): string {
    return BOARD_METADATA[slug]?.seed ?? slug;
}

export function threadTableSeed(boardId: string, randomId: string): string {
    return `${boardId}/thread/${randomId}`;
}
