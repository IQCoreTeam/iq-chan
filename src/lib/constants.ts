// Solana-specific derivations layered on top of the chain-neutral board config.
// Everything chain-neutral lives in board-config.ts and is re-exported here so
// existing Solana call sites keep importing from "./constants" unchanged.

import iqlabs from "iqlabs-sdk";
import { DB_ROOT_ID, CODEIN_DB_ROOT_ID, CODEIN_FEED_TABLE } from "./board-config";

export * from "./board-config";

export const DB_ROOT_ID_BYTES = Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID));
export const DB_ROOT_KEY = iqlabs.contract.getDbRootPda(DB_ROOT_ID_BYTES);

// Table PDA of the iq6900 code-in feed, derived the same way the feed itself
// does (feed.js in iq6900), so inventory reads hit exactly that table.
export const CODEIN_FEED_PDA = iqlabs.contract
    .getTablePda(
        iqlabs.contract.getDbRootPda(Buffer.from(iqlabs.utils.toSeedBytes(CODEIN_DB_ROOT_ID))),
        iqlabs.utils.toSeedBytes(CODEIN_FEED_TABLE),
    )
    .toBase58();

export function deriveTablePda(seed: string): string {
    return iqlabs.contract.getTablePda(DB_ROOT_KEY, iqlabs.utils.toSeedBytes(seed)).toBase58();
}

export function deriveInstructionTablePda(seed: string): string {
    return iqlabs.contract.getInstructionTablePda(DB_ROOT_KEY, iqlabs.utils.toSeedBytes(seed)).toBase58();
}
