// Board-specific logic that SDK doesn't provide
// - Feed PDA derivation (for bump ordering)
// - Bump-ordered thread fetching via getSignaturesForAddress

import { PublicKey } from "@solana/web3.js";

// TODO: Derive feed PDA from seeds [FEED_SEED_PREFIX, programId, dbRootKey, hash(boardId)]
// This PDA has no on-chain account — it's address-only for tx indexing
export function getFeedPda(dbRootKey: PublicKey, boardId: string): PublicKey {
    // seeds: [FEED_SEED_PREFIX, programId, dbRootKey, sha256(boardId)]
    // return PublicKey.findProgramAddressSync(seeds, programId)[0]
    throw new Error("TODO");
}

// TODO: Fetch threads in bump order
// 1. getSignaturesForAddress(feedPDA, { limit })
// 2. Parse each tx's metadata to extract thread_no
// 3. Group by thread_no, keep latest activity time per thread
// 4. Sort threads by most recent activity (descending)
// 5. Return ordered thread numbers
export async function fetchBumpOrderedThreadNos(
    connection: unknown,
    feedPda: PublicKey,
    limit: number,
): Promise<number[]> {
    // getSignaturesForAddress(feedPda, { limit })
    // → parse metadata from each tx
    // → group by thread_no
    // → sort by latest activity desc
    throw new Error("TODO");
}
