// DbRoot ("iqchan")
// └── thread (ext table)      seed: "{boardId}/thread/{randomId}"
//     ├── OP row:    {sub, com, name, time, img?, threadPda, threadSeed}
//     └── reply row: {sub:"", com, name, time, img?, threadPda}
// feed (one per board) — remainingAccounts, bump ordering

import { PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";

export const DB_ROOT_ID = "iqchan";
export const THREADS_PER_PAGE = 20;
export const FEED_SEED_PREFIX = "feedmY}AGBJiqLabs";
export const BOARDS = ["po", "biz", "a", "g"];

export const ESTIMATED_SOL_COST = {
    thread: "0.023",
    reply: "0.003",
} as const;

const _dbRootIdBytes = iqlabs.utils.toSeedBytes(DB_ROOT_ID);
export const DB_ROOT_KEY = iqlabs.contract.getDbRootPda(_dbRootIdBytes);

export function deriveTablePda(seed: string): string {
    return iqlabs.contract.getTablePda(DB_ROOT_KEY, iqlabs.utils.toSeedBytes(seed)).toBase58();
}

export function deriveInstructionTablePda(seed: string): string {
    return iqlabs.contract.getInstructionTablePda(DB_ROOT_KEY, iqlabs.utils.toSeedBytes(seed)).toBase58();
}

export function threadTableSeed(boardId: string, randomId: string): string {
    return `${boardId}/thread/${randomId}`;
}
