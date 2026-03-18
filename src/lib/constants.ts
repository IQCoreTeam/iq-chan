// ─── On-chain schema ──────────────────────────────────────────
//
// DbRoot ("iqchan")
// └── board (ext table)           seed: "{boardId}"
//     └── thread (ext table)      seed: "{boardId}/thread/{randomId}"
//         ├── OP row:    {sub, com, name, time, img?, threadPda, threadSeed}
//         └── reply row: {sub:"", com, name, time, img?, threadPda}
//
// feed (one per feedPDA, board) — CCing with remainingAccounts, bump ordering
// ───────────────────────────────────────────────────────────────

import { PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";

export const DB_ROOT_ID = "iqchan";

export const THREADS_PER_PAGE = 20;

// Feed PDA seed prefix — used for bump ordering via getSignaturesForAddress
export const FEED_SEED_PREFIX = "feedmY}AGBJiqLabs";

// Board navigation list
export const BOARDS = ["po", "biz", "a", "g"];

// Estimated SOL costs per transaction type
export const ESTIMATED_SOL_COST = {
    thread: "0.023",
    reply: "0.003",
} as const;

// ─── Derived PDA helpers ──────────────────────────────────────

const _dbRootIdBytes = iqlabs.utils.toSeedBytes(DB_ROOT_ID);
export const DB_ROOT_KEY = iqlabs.contract.getDbRootPda(_dbRootIdBytes);

export function deriveTablePda(seed: string): string {
    const seedBytes = iqlabs.utils.toSeedBytes(seed);
    return iqlabs.contract.getTablePda(DB_ROOT_KEY, seedBytes).toBase58();
}

export function deriveInstructionTablePda(seed: string): string {
    const seedBytes = iqlabs.utils.toSeedBytes(seed);
    return iqlabs.contract.getInstructionTablePda(DB_ROOT_KEY, seedBytes).toBase58();
}

// ─── Table seed helpers ───────────────────────────────────────

export function threadTableSeed(boardId: string, randomId: string): string {
    return `${boardId}/thread/${randomId}`;
}
