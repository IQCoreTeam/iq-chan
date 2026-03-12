# lib/ — iqchan-specific glue logic

## Goal

Implement pure functions that the SDK doesn't provide, needed only by iqchan.
No React dependency. All hooks and components sit on top of this layer.

---

## constants.ts

Already implemented. Seed generation helpers.

- `DB_ROOT_ID` — "iqchan"
- `FEED_SEED_PREFIX` — prefix for feed PDA derivation
- `boardsTableSeed()` → `"boards"`
- `threadsTableSeed(boardId)` → `"boards/{boardId}/threads"`
- `repliesTableSeed(boardId, threadNo)` → `"boards/{boardId}/threads/{threadNo}/replies"`

---

## parse.ts

### `parseQuoteRefs(text: string): number[]`

- Input: `"hello >>123 world >>456"`
- Output: `[123, 456]`
- Logic: match `/>>(\d+)/g`, extract numbers

### `segmentPostBody(text: string): Segment[]`

- Input: `"hello >>123 world"`
- Output: `[{type:"text", value:"hello "}, {type:"quote", no:123}, {type:"text", value:" world"}]`
- Logic: split by `>>(\d+)`, alternate between text and quote segments
- Components map over this array to render

### `mergeInstructions(posts, instructions): posts`

- Input: original posts array + edit/delete logs from instruction table
- Output: final posts with edits applied and deletes removed
- Logic:
  - Instruction has `com` field → overwrite the post's com (edit)
  - Instruction has no data → remove the post (delete)
  - Match to original post via `target` field (tx signature)

---

## board.ts

`getFeedPda` and `fetchBumpOrderedThreadNos` work as a pair. Each board has exactly one feedPDA. These stay in iqchan, not in the SDK.

### `getFeedPda(dbRootKey, boardId): PublicKey`

- Input: dbRoot's PublicKey, boardId string
- Output: feed PDA (no on-chain account, address-only derivation)
- One per board: each boardId produces a unique feedPDA
- Logic: `PublicKey.findProgramAddressSync([FEED_SEED_PREFIX, programId, dbRootKey, sha256(boardId)], programId)`
- On write: pass feedPDA in `writeRow`'s `remainingAccounts` for bump indexing

### `fetchBumpOrderedThreadNos(connection, feedPda): number[]`

- Input: RPC connection, feedPDA
- Output: thread number array sorted by most recent activity (descending)
- Display strategy: collect signatures from feedPDA until 20 unique threads are found, then return those 20 sorted by latest activity
- Logic:
  1. `connection.getSignaturesForAddress(feedPda, {limit})` — set limit large enough
  2. Parse each tx's metadata → extract thread_no
  3. Group by thread_no, record most recent activity time per thread
  4. Stop once 20 unique thread_nos are collected
  5. Sort by latest activity descending, return thread_no array

---

## Open questions

- Check if tx metadata parsing in `fetchBumpOrderedThreadNos` overlaps with SDK's `readTableRows`. If so, reuse the SDK function.
