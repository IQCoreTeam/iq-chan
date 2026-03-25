# Update — Mar 25, 2026

## Board Table as Write Target (Gate Enforcement)

### Problem
Previously, `createThread` TX2 wrote the OP row directly to the **thread table**. The thread table is created per-thread and has no gate by default unless the gate is explicitly propagated at creation time. This meant gate enforcement was fragile — if the gate info wasn't passed correctly from the frontend, anyone could post.

### Solution: Write to Board Table, CC the Feed

The key insight is separating **write target** from **read source**:

- **Write target → Board table** (`boardSeedBytes`): The OP row is written to the board table. Since the board table has the token gate set on-chain, the contract enforces the gate check here automatically — no gate propagation needed from the frontend.
- **Feed PDA → CC'd via `remainingAccounts`**: The feed PDA is passed as a remaining account, so the transaction gets indexed by the gateway under the feed. The board page still reads from the feed PDA to display threads and maintain bump ordering.
- **Thread table → Created in TX1, used for replies**: The thread table (seed: `boardId/thread/uuid`) is still created per-thread in TX1. Replies are written to the thread table. Gate is propagated to the thread table at creation time from the board meta, so reply gate enforcement also works.

This gives us:
- Gate enforcement on OP: contract checks board table gate on every `writeRow`
- Gate enforcement on reply: contract checks thread table gate (propagated from board)
- Bump ordering: feed PDA CC'd on every post, gateway indexes it, board page reads feed as before
- No frontend gate logic needed: gate is enforced purely on-chain

```
createThread:
  TX1: createExtTableInstruction (thread table, gate propagated from board)
  TX2: writeRow → board table (gate check here) + feedPda in remainingAccounts (bump/index)

postReply:
  TX1: writeRow → thread table (gate check here) + feedPda in remainingAccounts (bump if not sage)
```

---

## Other Changes

### use-post.ts
- `postReply`: added `threadSeed` field to reply row so it matches thread table column schema `["sub","com","name","time","img","threadPda","threadSeed"]`
- Error handling: errors containing "ata" or "token account" are surfaced as **"You are not a holder"** instead of raw contract error messages

### lib/board.ts
- `gateFromMeta()`: handles both `gate_type` (snake_case, actual on-chain decoded value) and `gateType` (camelCase, SDK type declaration). Also handles `amount` as either a plain number or a BN with `.toNumber()`.
- `fetchBoards()`: now fetches gate info for all known board slugs (DEFAULT_BOARDS + SEED_TO_BOARD_ID) directly via `fetchTableMeta(id)` — no dependency on whether the board is onboarded (in `tableSeeds`). Any board whose slug is known can have its gate info resolved.
- `fetchFeedThreads`: kept feed PDA-based (reverted from a brief experiment with board-table-based reads). TODO left in code to filter feed rows to board-table-target txs only once old threads are no longer prominent.

### lib/constants.ts
- `iq` added to `DEFAULT_BOARDS`
- Architecture comment updated to reflect new write flow

### addboard-page.tsx
- New board column schema: `["sub","com","name","time","img","threadPda","threadSeed"]` (matches board table write target)
- Token gate UI: checkbox to enable → gate type selector (Token / Collection) → mint address → min amount (hidden for Collection type, hardcoded to 1)
- `description` / `image` fields commented out (metadata table concept being phased out)
- Validation re-enabled (boardId, title required)

### admin-page.tsx
- `handleUpdateTable`: split into **"Name Only"** and **"Name + Columns"** buttons. "Name + Columns" sets columns to the new board layout.
- Admins section: fetches existing `table_creators` from on-chain DbRoot account on load, displays as editable list with +/× buttons

### board-page.tsx / thread-page.tsx
- Token gate banner: `"Only those who have {amount} {token | NFT from collection} can write a post."`
- Added to both board page and thread page

### hooks/use-board-gate.ts (NEW)
- New hook `useBoardGate(boardId)`: fetches gate info for a specific board on page entry via `fetchTableMeta(boardId)` directly using the slug — no dependency on `fetchBoards` or DEFAULT_BOARDS
- Used in both `board-page.tsx` and `thread-page.tsx` for the token gate banner and `createThread` gate param
- **Why**: `fetchBoards` previously fetched gate info for all boards upfront (N fetches on home page load). Removed gate fetching from `fetchBoards` entirely. `useBoardGate` replaces this with a single lazy fetch on board/thread page entry — net fewer fetches overall.

### Scripts
- `update-board-columns.ts`: updated po/biz/a/g/iq board table columns on-chain to new schema (executed)
- `iqlabs-sdk` bumped to `0.1.17`
