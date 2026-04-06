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
    po:  { seed: "po",  title: "Politically Incorrect", description: "Political discussion", image: "" },
    biz: { seed: "biz", title: "Business & Finance", description: "Business and finance discussion", image: "" },
    a:   { seed: "a",   title: "Anime & Manga", description: "Anime and manga discussion", image: "" },
    g:   { seed: "g",   title: "Technology",  description: "Technology discussion",  image: "" },
    nub:   { seed: "nub",   title: "Nub Cat Community",  description: "Nub Cat Community",  image: "/boards/nubcat.webp" },
    mlg:   { seed: "mlg",   title: "Community For MLG",  description: "Community For MLG",  image: "/boards/mlg.webp" },
    y2k:   { seed: "y2k",   title: "Community For Y2kDotCom",  description: "Community For Y2kDotCom",  image: "/boards/y2k.webp" },
    retardio: { seed: "retardio", title: "Only for Retardio", description: "Only for Retardio", image: "/boards/retardio.webp" },
    dominance: { seed: "dominance", title: "Market Dominance", description: "Market Dominance", image: "/boards/dominance.webp" },
};

export const OFFICIAL_BOARDS: string[] = ["iq", "po", "biz", "a", "g"];

export const RANDOM_BANNERS: string[] = [
    "/randombanners/backup-1-yotsuba.webp",
    "/randombanners/backup-12-cia-glows.webp",
    "/randombanners/backup-13-fbi-open-up.webp",
    "/randombanners/backup-14-mossad.webp",
    "/randombanners/backup-15-snowden.webp",
    "/randombanners/backup-16-epstein.webp",
    "/randombanners/backup-17-taxation.webp",
    "/randombanners/backup-18-iran-claude.webp",
    "/randombanners/backup-19-matrix.webp",
    "/randombanners/backup-2-crt-hacker.webp",
    "/randombanners/backup-20-counterstrike.webp",
    "/randombanners/backup-21-steve-jobs.webp",
    "/randombanners/backup-22-windows-xp.webp",
    "/randombanners/backup-23-bsod.webp",
    "/randombanners/backup-25-wojak-schizo.webp",
    "/randombanners/backup-26-npc.webp",
    "/randombanners/backup-3-pepe-iq.webp",
    "/randombanners/backup-4-q-classic.webp",
    "/randombanners/backup-5-q-terminal.webp",
    "/randombanners/backup-6-q-surfing.webp",
    "/randombanners/backup-7-logo-graffiti.webp",
    "/randombanners/backup-8-logo-pixel.webp",
    "/randombanners/backup-9-pepe-q.webp",
    "/randombanners/final-02-catbus.webp",
    "/randombanners/final-03-messy-room.webp",
    "/randombanners/final-04-manga-loser.webp",
    "/randombanners/final-05-cirno.webp",
    "/randombanners/final-06-angry-punch.webp",
    "/randombanners/final-07-kill-me.webp",
    "/randombanners/final-09-ninjas.webp",
    "/randombanners/final-11-pixel-wrestler.webp",
    "/randombanners/final-12-laughing.webp",
    "/randombanners/final-13-anime-girl-green.webp",
    "/randombanners/final-14-soccer-fans.webp",
    "/randombanners/final-15-dark-anime.webp",
    "/randombanners/final-16-manga-bw.webp",
    "/randombanners/final-19-cia-glowie.webp",
    "/randombanners/final-20-fbi-raid.webp",
    "/randombanners/final-21-epstein.webp",
    "/randombanners/final-22-snowden.webp",
    "/randombanners/final-24-matrix-q.webp",
    "/randombanners/final-25-windows-xp.webp",
    "/randombanners/final-26-bsod.webp",
    "/randombanners/final-27-counterstrike.webp",
    "/randombanners/final-28-kim-cute.webp",
    "/randombanners/final-29-iran-missile.webp",
    "/randombanners/final-31-schizo-board.webp",
    "/randombanners/final-32-npc-break.webp",
    "/randombanners/final-33-ghibli-dark.webp",
    "/randombanners/final-35-chibi-blue.webp",
    "/randombanners/final-36-action.webp",
    "/randombanners/final-37-emo.webp",
    "/randombanners/final-38-pixel-art.webp",
    "/randombanners/final-40-cute-girls.webp",
    "/randombanners/final-41-dark-reach.webp",
    "/randombanners/final-43-goblin-laugh.webp",
    "/randombanners/final-44-sports.webp",
    "/randombanners/final-45-messy-otaku.webp",
    "/randombanners/final-46-manga-panel.webp",
    "/randombanners/final-49-remake-38.webp",
    "/randombanners/final-50-remake-253.webp",
    "/randombanners/final-51-remake-241.webp",
    "/randombanners/final-52-remake-26.webp",
    "/randombanners/final-54-remake-159.webp",
    "/randombanners/final-55-remake-22.webp",
    "/randombanners/final-56-remake-217.webp",
    "/randombanners/final-57-remake-45.webp",
    "/randombanners/final-58-remake-61.webp",
    "/randombanners/final-59-remake-128.webp",
    "/randombanners/final-60-remake-156.webp",
    "/randombanners/final-61-remake-86.webp",
    "/randombanners/final-62-remake-84.webp",
    "/randombanners/final-63-remake-112.webp",
    "/randombanners/final-64-remake-216.webp",
    "/randombanners/final-65-remake-232.webp",
    "/randombanners/final-66-remake-172.webp",
    "/randombanners/final-67-remake-206.webp",
    "/randombanners/final-68-remake-105.webp",
    "/randombanners/final-69-remake-193.webp",
    "/randombanners/final-70-remake-13.webp",
    "/randombanners/final-71-remake-70.webp",
    "/randombanners/final-72-remake-31.webp",
    "/randombanners/final-73-remake-72.webp",
    "/randombanners/final-74-remake-257.webp",
    "/randombanners/final-75-remake-96.webp",
    "/randombanners/final-76-remake-195.webp",
    "/randombanners/final-77-remake-90.webp",
    "/randombanners/final-78-remake-66.webp",
    "/randombanners/flash-01-205.webp",
    "/randombanners/flash-02-235.webp",
    "/randombanners/flash-03-53.webp",
    "/randombanners/flash-04-126.webp",
    "/randombanners/flash-05-84.webp",
    "/randombanners/flash-06-246.webp",
    "/randombanners/flash-07-259.webp",
    "/randombanners/flash-08-137.webp",
    "/randombanners/flash-10-32.webp",
    "/randombanners/flash-11-52.webp",
    "/randombanners/flash-12-94.webp",
    "/randombanners/flash-13-57.webp",
    "/randombanners/flash-15-149.webp",
    "/randombanners/flash-16-194.webp",
    "/randombanners/flash-17-77.webp",
    "/randombanners/flash-18-187.webp",
    "/randombanners/flash-19-174.webp",
    "/randombanners/flash-20-108.webp",
    "/randombanners/flash-21-219.webp",
    "/randombanners/flash-22-101.webp",
    "/randombanners/flash-23-213.webp",
    "/randombanners/flash-24-68.webp",
    "/randombanners/flash-25-30.webp",
    "/randombanners/flash-26-19.webp",
    "/randombanners/flash-27-41.webp",
    "/randombanners/flash-28-61.webp",
    "/randombanners/flash-29-173.webp",
    "/randombanners/flash-30-22.webp",
    "/randombanners/flash-32-48.webp",
    "/randombanners/flash-33-181.webp",
    "/randombanners/flash-34-124.webp",
    "/randombanners/flash-35-178.webp",
    "/randombanners/flash-38-100.webp",
    "/randombanners/flash-39-153.webp",
];

export function getRandomBanner(): string {
    return RANDOM_BANNERS[Math.floor(Math.random() * RANDOM_BANNERS.length)];
}

/** Wallets with admin access (create/update boards) */
export const ADMIN_WALLETS: string[] = [
    "B8d355pft6DfrQNetCqXNumRk8WoEs21waqeuPP3HUJC",
];

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

export function formatBoardTitle(boardId: string, displaySlug: string, displayName: string): string {
    return displayName ? `/${displaySlug}/ - ${displayName}` : `/${boardId.slice(0, 12)}${boardId.length > 12 ? "..." : ""}/`;
}
