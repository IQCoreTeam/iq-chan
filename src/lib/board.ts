// Board-specific logic that SDK doesn't provide.
// getFeedPda + fetchBumpOrderedThreadNos are a paired set.
// feedPDA is one per board — address-only PDA for tx indexing.

import { Connection, PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { FEED_SEED_PREFIX } from "./constants";
import { fetchTableSlice } from "./gateway";

const PROGRAM_ID = iqlabs.contract.PROGRAM_ID;

// ─── Feed PDA derivation ────────────────────────────────────────────────────

export function getFeedPda(dbRootKey: PublicKey, boardId: string): PublicKey {
    const boardIdHash = iqlabs.utils.toSeedBytes(boardId);
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(FEED_SEED_PREFIX),
            PROGRAM_ID.toBuffer(),
            dbRootKey.toBuffer(),
            Buffer.from(boardIdHash),
        ],
        PROGRAM_ID,
    )[0];
}

// ─── Bump-ordered thread numbers ────────────────────────────────────────────

const BUMP_TARGET_THREADS = 20;
const BUMP_FETCH_LIMIT = 200;

export async function fetchBumpOrderedThreadNos(
    connection: Connection,
    feedPda: PublicKey,
): Promise<number[]> {
    // Fetch recent signatures referencing this feed PDA
    const sigs = await connection.getSignaturesForAddress(feedPda, {
        limit: BUMP_FETCH_LIMIT,
    });

    if (sigs.length === 0) return [];

    // Fetch row data to extract thread_no
    const sigStrings = sigs.map((s) => s.signature);
    const rows = await fetchTableSlice(
        feedPda.toBase58(),
        sigStrings.slice(0, 50), // first batch
    );

    // Group by thread_no, track most recent activity
    const latestByThread = new Map<number, number>();
    for (const row of rows) {
        const no = row.no as number | undefined;
        const time = row.time as number | undefined;
        if (no === undefined) continue;
        const existing = latestByThread.get(no);
        if (!existing || (time && time > existing)) {
            latestByThread.set(no, time ?? 0);
        }
        if (latestByThread.size >= BUMP_TARGET_THREADS) break;
    }

    // Sort by latest activity descending
    return [...latestByThread.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([no]) => no);
}
