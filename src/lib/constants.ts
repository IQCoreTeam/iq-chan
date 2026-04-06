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
    "/randombanners/backup-1-yotsuba.png",
    "/randombanners/backup-12-cia-glows.png",
    "/randombanners/backup-13-fbi-open-up.png",
    "/randombanners/backup-14-mossad.png",
    "/randombanners/backup-15-snowden.png",
    "/randombanners/backup-16-epstein.png",
    "/randombanners/backup-17-taxation.png",
    "/randombanners/backup-18-iran-claude.png",
    "/randombanners/backup-19-matrix.png",
    "/randombanners/backup-2-crt-hacker.png",
    "/randombanners/backup-20-counterstrike.png",
    "/randombanners/backup-21-steve-jobs.png",
    "/randombanners/backup-22-windows-xp.png",
    "/randombanners/backup-23-bsod.png",
    "/randombanners/backup-25-wojak-schizo.png",
    "/randombanners/backup-26-npc.png",
    "/randombanners/backup-3-pepe-iq.png",
    "/randombanners/backup-4-q-classic.png",
    "/randombanners/backup-5-q-terminal.png",
    "/randombanners/backup-6-q-surfing.png",
    "/randombanners/backup-7-logo-graffiti.png",
    "/randombanners/backup-8-logo-pixel.png",
    "/randombanners/backup-9-pepe-q.png",
    "/randombanners/final-02-catbus.png",
    "/randombanners/final-03-messy-room.png",
    "/randombanners/final-04-manga-loser.png",
    "/randombanners/final-05-cirno.png",
    "/randombanners/final-06-angry-punch.png",
    "/randombanners/final-07-kill-me.png",
    "/randombanners/final-09-ninjas.png",
    "/randombanners/final-11-pixel-wrestler.png",
    "/randombanners/final-12-laughing.png",
    "/randombanners/final-13-anime-girl-green.png",
    "/randombanners/final-14-soccer-fans.png",
    "/randombanners/final-15-dark-anime.png",
    "/randombanners/final-16-manga-bw.png",
    "/randombanners/final-19-cia-glowie.png",
    "/randombanners/final-20-fbi-raid.png",
    "/randombanners/final-21-epstein.png",
    "/randombanners/final-22-snowden.png",
    "/randombanners/final-24-matrix-q.png",
    "/randombanners/final-25-windows-xp.png",
    "/randombanners/final-26-bsod.png",
    "/randombanners/final-27-counterstrike.png",
    "/randombanners/final-28-kim-cute.png",
    "/randombanners/final-29-iran-missile.png",
    "/randombanners/final-31-schizo-board.png",
    "/randombanners/final-32-npc-break.png",
    "/randombanners/final-33-ghibli-dark.png",
    "/randombanners/final-35-chibi-blue.png",
    "/randombanners/final-36-action.png",
    "/randombanners/final-37-emo.png",
    "/randombanners/final-38-pixel-art.png",
    "/randombanners/final-40-cute-girls.png",
    "/randombanners/final-41-dark-reach.png",
    "/randombanners/final-43-goblin-laugh.png",
    "/randombanners/final-44-sports.png",
    "/randombanners/final-45-messy-otaku.png",
    "/randombanners/final-46-manga-panel.png",
    "/randombanners/final-49-remake-38.png",
    "/randombanners/final-50-remake-253.png",
    "/randombanners/final-51-remake-241.png",
    "/randombanners/final-52-remake-26.png",
    "/randombanners/final-54-remake-159.png",
    "/randombanners/final-55-remake-22.png",
    "/randombanners/final-56-remake-217.png",
    "/randombanners/final-57-remake-45.png",
    "/randombanners/final-58-remake-61.png",
    "/randombanners/final-59-remake-128.png",
    "/randombanners/final-60-remake-156.png",
    "/randombanners/final-61-remake-86.png",
    "/randombanners/final-62-remake-84.png",
    "/randombanners/final-63-remake-112.png",
    "/randombanners/final-64-remake-216.png",
    "/randombanners/final-65-remake-232.png",
    "/randombanners/final-66-remake-172.png",
    "/randombanners/final-67-remake-206.png",
    "/randombanners/final-68-remake-105.png",
    "/randombanners/final-69-remake-193.png",
    "/randombanners/final-70-remake-13.png",
    "/randombanners/final-71-remake-70.png",
    "/randombanners/final-72-remake-31.png",
    "/randombanners/final-73-remake-72.png",
    "/randombanners/final-74-remake-257.png",
    "/randombanners/final-75-remake-96.png",
    "/randombanners/final-76-remake-195.png",
    "/randombanners/final-77-remake-90.png",
    "/randombanners/final-78-remake-66.png",
    "/randombanners/flash-01-205.png",
    "/randombanners/flash-02-235.png",
    "/randombanners/flash-03-53.png",
    "/randombanners/flash-04-126.png",
    "/randombanners/flash-05-84.png",
    "/randombanners/flash-06-246.png",
    "/randombanners/flash-07-259.png",
    "/randombanners/flash-08-137.png",
    "/randombanners/flash-10-32.png",
    "/randombanners/flash-11-52.png",
    "/randombanners/flash-12-94.png",
    "/randombanners/flash-13-57.png",
    "/randombanners/flash-15-149.png",
    "/randombanners/flash-16-194.png",
    "/randombanners/flash-17-77.png",
    "/randombanners/flash-18-187.png",
    "/randombanners/flash-19-174.png",
    "/randombanners/flash-20-108.png",
    "/randombanners/flash-21-219.png",
    "/randombanners/flash-22-101.png",
    "/randombanners/flash-23-213.png",
    "/randombanners/flash-24-68.png",
    "/randombanners/flash-25-30.png",
    "/randombanners/flash-26-19.png",
    "/randombanners/flash-27-41.png",
    "/randombanners/flash-28-61.png",
    "/randombanners/flash-29-173.png",
    "/randombanners/flash-30-22.png",
    "/randombanners/flash-32-48.png",
    "/randombanners/flash-33-181.png",
    "/randombanners/flash-34-124.png",
    "/randombanners/flash-35-178.png",
    "/randombanners/flash-38-100.png",
    "/randombanners/flash-39-153.png",
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
