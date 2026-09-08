// Chain-neutral board configuration and helpers. Pure data + string logic, no
// chain SDK — so both the Solana and EVM adapters can import it without dragging
// @solana/web3.js into an EVM bundle. Solana-specific PDA derivations live in
// constants.ts (which re-exports everything here for back-compat).
//
// DbRoot ("iqchan")
// └── board table (ext table)  seed: boardId  e.g. "po", "biz"
//     ├── OP row:    {sub, com, name, time, img?, threadPda, threadSeed}
//     └── reply row: {sub:"", com, name, time, img?, threadPda, threadSeed}
// threadPda  = the thread's own ext table id (unique per thread)
// threadSeed = the thread seed ("<board>/thread/<uuid>"), shared by its replies

import { RANDOM_BANNERS, NO_IMAGE_PLACEHOLDERS, BANNERS_BY_DIR, PLACEHOLDERS_BY_DIR } from "./generated-images";
import { resolveNetwork } from "./chains/resolve";
export { RANDOM_BANNERS, NO_IMAGE_PLACEHOLDERS };

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

export function getRandomBanner(): string {
    const themed = BANNERS_BY_DIR[resolveNetwork().theme.bannerDir ?? ""];
    const banners = themed?.length ? themed : RANDOM_BANNERS;
    return banners[Math.floor(Math.random() * banners.length)];
}

export function getNoImagePlaceholders(): string[] {
    const themed = PLACEHOLDERS_BY_DIR[resolveNetwork().theme.placeholderDir ?? ""];
    return themed?.length ? themed : NO_IMAGE_PLACEHOLDERS;
}

/** Wallets with admin access (create/update boards) */
export const ADMIN_WALLETS: string[] = [
    "B8d355pft6DfrQNetCqXNumRk8WoEs21waqeuPP3HUJC",
];

export const BOARD_COLUMNS = ["sub", "com", "name", "time", "img", "threadPda", "threadSeed"];

export function resolveBoardSeed(slug: string): string {
    return BOARD_METADATA[slug]?.seed ?? slug;
}

export function threadTableSeed(boardId: string, randomId: string): string {
    return `${boardId}/thread/${randomId}`;
}

export function formatBoardTitle(boardId: string, displaySlug: string, displayName: string): string {
    return displayName ? `/${displaySlug}/ - ${displayName}` : `/${boardId.slice(0, 12)}${boardId.length > 12 ? "..." : ""}/`;
}
