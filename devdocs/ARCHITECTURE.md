# iqchan Architecture

Fully on-chain imageboard built on IQ DB (Solana). No contract changes — frontend + SDK only.

## Design Principles

| # | Principle | Detail |
|---|-----------|--------|
| 1 | Zero contract changes | Uses existing IQ DB contract as-is |
| 2 | 3-tier ext table hierarchy | boards → threads → replies |
| 3 | O(1) schema discovery | Navigate via account data (table_seeds, ext_keys), no tx traversal |
| 4 | Feed/bump via SDK remainingAccounts | Reference-only PDAs added to txs for indexing, ~0 extra cost |
| 5 | Inscription-based storage | Data lives in on_chain_path + metadata, no dedicated file columns needed |
| 6 | Edit/delete via Instruction PDA | Originals are immutable; changes are append-only logs |
| 7 | Access control via writers | `[]` = public, `[admin]` = locked |
| 8 | >>no text quoting | Client-side parsing, same as 4chan |

---

## 1. Table Schema

### boards (root table)

| Column | Description |
|--------|-------------|
| board_id | Board identifier (e.g. `po`, `a`, `biz`) |
| title | Display name |
| description | Board description |
| rules | Board-specific rules |
| sticky | Pinned thread link (on/off-chain address, empty = none) |

- `id_col`: board_id
- `ext_keys`: [threads]
- `writers`: [operator] — only operator can add/modify boards

### boards/{board_id}/threads (ext table, one per board)

| Column | Description |
|--------|-------------|
| no | Thread number |
| sub | Subject (title) |
| com | Comment (body, includes >> quotes) |
| name | Author display name (wallet address or alias) |
| time | Unix timestamp |
| img | (optional) Image on_chain_path or URL |

- `id_col`: no
- `ext_keys`: [replies]
- `writers`: [] — anyone can create threads. To lock: set writers to [admin]

### boards/{board_id}/threads/{no}/replies (ext table, one per thread)

| Column | Description |
|--------|-------------|
| no | Reply number |
| com | Comment body |
| name | Author display name |
| time | Unix timestamp |
| img | (optional) Image on_chain_path or URL |

- `id_col`: no
- `ext_keys`: []
- `writers`: [] — anyone can reply. To lock: set writers to [admin]

Images are stored via `img` field in metadata — on_chain_path, IPFS CID, or external URL. Optional per post.

Note: No need to worry about metadata size limits. SDK's `writeRow` automatically switches storage strategy based on data size (inline < 700B, linked-list < 8.5KB, session mode for larger). Long `com` or `img` fields are handled transparently.

---

## 2. Read Flow

### Board List (Home)

1. Fetch DbRoot account → get table_seeds → derive `hash("boards")`
2. Derive boardsTablePDA → fetch Table account (schema)
3. `getSignaturesForAddress(boardsTablePDA)` → board rows

### Board Feed (bump order)

1. Derive feedPDA (no on-chain account, address only)
2. `getSignaturesForAddress(feedPDA, {limit: 1000})` → recent activity
3. Parse metadata → extract thread_no → group & sort by recency

### Board Catalog (creation order)

1. Derive threadsTablePDA
2. `getSignaturesForAddress(threadsTablePDA, {limit: 1000})` → thread list

### Thread Detail

1. Derive repliesTablePDA from `hash("boards/{id}/threads/{no}/replies")`
2. `getSignaturesForAddress(repliesTablePDA)` → reply list
3. Fetch Instruction PDA → apply edits/deletes
4. Parse `>>no` references → render quote previews

---

## 3. Write Flow

### Create Thread (~0.023 SOL, 2 TXs)

```
TX1: create_ext_table(
  seed: hash("boards/{id}/threads/{no}/replies")
  columns: ["no","com","name","time"]
  id_col: "no", ext_keys: [], writers: []
)  → ~0.02 SOL rent

TX2: db_code_in(
  seed: hash("boards/{id}/threads")
  metadata: {"no","sub","com","name","time"}
  remainingAccounts: [feedPDA]
)  → ~0.003 SOL fee
```

### Post Reply (~0.003 SOL, 1 TX)

```
db_code_in(
  seed: hash("boards/{id}/threads/{no}/replies")
  metadata: {"no","com","name","time"}
  remainingAccounts: [feedPDA, threadsPDA]  ← feed + bump
)
```

### Edit Post (1 TX)

```
db_instruction_code_in(
  seed: hash("boards/{id}/threads/{no}/replies")
  metadata: {"target": "original_tx_sig", "com": "edited content"}
)
```

### Delete Post (1 TX)

```
db_instruction_code_in(
  seed: hash("boards/{id}/threads/{no}/replies")
  metadata: {"target": "original_tx_sig"}  ← empty data = DELETE
)
```

---

## 4. Required Changes

### Contract

None. Existing IQ DB contract works as-is.

### SDK (done)

- `dbCodeIn`: Added `remainingAccounts?: PublicKey[]` param → appended via `.keys`
- `writeRow`: Added `remainingAccounts` pass-through
- `sendTx`: Added transaction size exceeded error with actionable message

### Operator Setup (one-time)

1. Create DbRoot (`"iqchan"`)
2. Create boards table (columns, extKeys: ["threads"], writers: [operator])
3. Add board data (`db_code_in` × N)
4. Create threads ext table per board (`create_ext_table` × N)

---

## 5. Project Structure

```
src/
├── app/                          # Next.js App Router (pages only)
│   ├── layout.tsx                # providers (wallet, connection)
│   ├── page.tsx                  # home — board list
│   ├── [boardId]/
│   │   ├── page.tsx              # board — thread list
│   │   └── [threadNo]/
│   │       └── page.tsx          # thread — replies
│   └── globals.css
│
├── components/                   # UI rendering only, no on-chain logic
│   ├── board-list.tsx
│   ├── thread-list.tsx
│   ├── thread-detail.tsx
│   ├── post-form.tsx             # shared: new thread / reply
│   ├── post.tsx                  # single post render
│   ├── quote-link.tsx            # >>no inline preview
│   ├── wallet-button.tsx
│   └── header.tsx
│
├── lib/                          # iqchan-specific glue (NOT SDK wrappers)
│   ├── board.ts                  # feed PDA derivation, bump ordering
│   ├── parse.ts                  # >>quote parsing, edit/delete merging
│   └── constants.ts              # DB_ROOT_ID, seed helpers
│
└── hooks/                        # SDK calls + React state
    ├── use-boards.ts             # fetch board list
    ├── use-threads.ts            # fetch threads (catalog/bump)
    ├── use-replies.ts            # fetch replies + merge instructions
    └── use-post.ts               # create thread, reply, edit, delete
```

### Layer rules

- **app/**: page composition only — call hooks, render components
- **components/**: pure UI — receive data via props, no SDK imports
- **hooks/**: call SDK directly (`iqlabs.reader.readTableRows`, `iqlabs.writer.writeRow`) — no wrappers
- **lib/**: only logic SDK doesn't provide — feed PDA, >>parsing, instruction merging
