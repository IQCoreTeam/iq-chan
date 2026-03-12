// Board-specific logic that SDK doesn't provide
// getFeedPda + fetchBumpOrderedThreadNos are a paired set.
// feedPDA is one per board. Stays in iqchan, not SDK.

import { Connection, PublicKey } from "@solana/web3.js";
import { FEED_SEED_PREFIX } from "./constants";

// getFeedPda(dbRootKey, boardId)
//   Derive the feed PDA address for a board.
//   This PDA has no on-chain account — address only, used for tx indexing.
//   On write: pass this as remainingAccounts to writeRow for bump indexing.
//
// Input:  dbRootKey (PublicKey) — the db root account's public key
//         boardId (string) — e.g. "po", "biz"
// Output: PublicKey — the derived feed PDA address
export function getFeedPda(dbRootKey: PublicKey, boardId: string): PublicKey {
    // 1. Compute sha256(boardId)
    // 2. Build seeds: [FEED_SEED_PREFIX, programId, dbRootKey, sha256(boardId)]
    // 3. PublicKey.findProgramAddressSync(seeds, programId)[0]
    // 4. Return the PDA address
    throw new Error("TODO");
}

// fetchBumpOrderedThreadNos(connection, feedPda)
//   Fetch thread numbers ordered by most recent activity (bump order).
//   Collects signatures from feedPDA until 20 unique threads are found.
//
// Input:  connection (Connection) — Solana RPC connection
//         feedPda (PublicKey) — the board's feed PDA
// Output: number[] — up to 20 thread numbers, sorted by latest activity (descending)
export async function fetchBumpOrderedThreadNos(
    connection: Connection,
    feedPda: PublicKey,
): Promise<number[]> {
    // 1. getSignaturesForAddress(feedPda, { limit: large }) — fetch recent tx signatures
    // 2. For each signature, parse tx metadata → extract thread_no
    // 3. Group by thread_no, record most recent activity time per thread
    // 4. Stop collecting once 20 unique thread_nos are found
    // 5. Sort by latest activity time descending
    // 6. Return the sorted thread_no array
    throw new Error("TODO");
}
