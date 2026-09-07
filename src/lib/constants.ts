// Solana-specific derivations layered on top of the chain-neutral board config.
// Everything chain-neutral lives in board-config.ts and is re-exported here so
// existing Solana call sites keep importing from "./constants" unchanged.

import iqlabs from "iqlabs-sdk";
import { DB_ROOT_ID } from "./board-config";

export * from "./board-config";

export const DB_ROOT_ID_BYTES = Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID));
export const DB_ROOT_KEY = iqlabs.contract.getDbRootPda(DB_ROOT_ID_BYTES);

export function deriveTablePda(seed: string): string {
    return iqlabs.contract.getTablePda(DB_ROOT_KEY, iqlabs.utils.toSeedBytes(seed)).toBase58();
}

export function deriveInstructionTablePda(seed: string): string {
    return iqlabs.contract.getInstructionTablePda(DB_ROOT_KEY, iqlabs.utils.toSeedBytes(seed)).toBase58();
}
