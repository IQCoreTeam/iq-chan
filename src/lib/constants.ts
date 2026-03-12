// iqchan-specific configuration

import { PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";

export const DB_ROOT_ID = "iqchan";

// ─── Derived PDA helpers (shared across all hooks) ──────────────────────────

const _dbRootIdBytes = iqlabs.utils.toSeedBytes(DB_ROOT_ID);
const _dbRootKey = iqlabs.contract.getDbRootPda(_dbRootIdBytes);

export function getDbRootKey(): PublicKey {
    return _dbRootKey;
}

export function deriveTablePda(seed: string): string {
    const seedBytes = iqlabs.utils.toSeedBytes(seed);
    return iqlabs.contract.getTablePda(_dbRootKey, seedBytes).toBase58();
}

export function deriveInstructionTablePda(seed: string): string {
    const seedBytes = iqlabs.utils.toSeedBytes(seed);
    return iqlabs.contract.getInstructionTablePda(_dbRootKey, seedBytes).toBase58();
}

// Feed PDA seed prefix — used for bump ordering via getSignaturesForAddress
export const FEED_SEED_PREFIX = "feedmY}AGBJiqLabs";

// Table seed helpers
// boards table:           hash("boards")
// threads ext table:      hash("boards/{boardId}/threads")
// replies ext table:      hash("boards/{boardId}/threads/{no}/replies")

export function boardsTableSeed(): string {
    return "boards";
}

export function threadsTableSeed(boardId: string): string {
    return `boards/${boardId}/threads`;
}

export function repliesTableSeed(boardId: string, threadNo: number): string {
    return `boards/${boardId}/threads/${threadNo}/replies`;
}
