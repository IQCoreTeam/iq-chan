# hooks/ — SDK calls + React state management

## Goal

Call SDK functions directly and manage results as React state.
No SDK wrappers. Hooks call `iqlabs.reader.readTableRows(...)` directly.

---

## use-boards.ts

### `useBoards()`

- Returns: `{ boards, loading, error }`
- Logic:
  1. Derive boardsTablePDA via SDK's `getTablePda`
  2. Call `iqlabs.reader.readTableRows(boardsTablePDA)`
  3. Store result in state
- Each board: `{ board_id, title, description, rules, sticky }`
- Called once on home page mount

---

## use-threads.ts

### `useThreads(boardId, mode)`

- Returns: `{ threads, loading, error }`
- mode: `"catalog"` | `"bump"`
- **Catalog mode:**
  1. `threadsTableSeed(boardId)` → derive tablePDA
  2. `iqlabs.reader.readTableRows(tablePDA, {limit})` → creation order
- **Bump mode:**
  1. `getFeedPda(dbRootKey, boardId)` → feedPDA
  2. `fetchBumpOrderedThreadNos(connection, feedPDA)` → ordered thread nos
  3. Load thread data for each no
- Each thread: `{ no, sub, com, name, time, img? }`

---

## use-replies.ts

### `useReplies(boardId, threadNo)`

- Returns: `{ replies, loading, error }`
- Logic:
  1. `repliesTableSeed(boardId, threadNo)` → derive tablePDA
  2. `iqlabs.reader.readTableRows(tablePDA)` → reply list
  3. Fetch instruction table → `mergeInstructions(replies, instructions)` → apply edits/deletes
- Each reply: `{ no, com, name, time, img? }`

---

## use-post.ts

### `usePost()`

- Returns: `{ createThread, postReply, editPost, deletePost, loading, error }`

#### `createThread(boardId, { sub, com, name, img? })`
- TX1: `contract.createExtTableInstruction` → create replies ext table (~0.02 SOL)
- TX2: `iqlabs.writer.writeRow(threadsTableSeed, rowJson, false, [feedPDA])` (~0.003 SOL)
- Thread no assigned by frontend (max+1 or timestamp-based)

#### `postReply(boardId, threadNo, { com, name, img? })`
- `iqlabs.writer.writeRow(repliesTableSeed, rowJson, false, [feedPDA, threadsPDA])`
- Reply no assigned by frontend
- Cost: ~0.003 SOL

#### `editPost(boardId, threadNo, targetTxSig, newCom)`
- `iqlabs.writer.manageRowData(repliesTableSeed, rowJson, tableName, targetTx)`

#### `deletePost(boardId, threadNo, targetTxSig)`
- `iqlabs.writer.manageRowData(repliesTableSeed, "{}", tableName, targetTx)`
- Empty metadata = DELETE

---

## Open questions

- Thread/reply no assignment strategy: timestamp-based vs max+1 query. max+1 has race condition risk. Timestamp may be safer.
- `createThread` requires 2 sequential TXs — need error handling if TX1 fails (don't send TX2)
- Bump mode loads thread data individually = N RPC calls — consider batch optimization
