# iqchan Architecture

On-chain imageboard built on IQ DB (Solana). No contract changes — frontend + SDK only.

## On-chain Structure

```
DbRoot ("iqchan")
└── thread (ext table)      seed: "{boardId}/thread/{randomId}"
    ├── OP row:    {sub, com, name, time, img?, threadPda, threadSeed}
    └── reply row: {sub:"", com, name, time, img?, threadPda}

feed (one per board) — address-only PDA, CCed via remainingAccounts
```

- Boards are hardcoded routing categories, not on-chain tables
- Each thread is its own ext table with a unique PDA
- OP vs reply: `sub` non-empty = OP, empty = reply
- `threadSeed` stored in OP only — needed for edit/delete/reply
- Feed PDA per board enables `getSignaturesForAddress` for activity listing

## Write Flow

| Action | TXs | Cost |
|--------|-----|------|
| Create thread | 2 (ext table + OP row) | ~0.023 SOL |
| Post reply | 1 | ~0.003 SOL |
| Edit/delete | 1 (instruction table) | ~0.003 SOL |

All writes CC the board's feed PDA via `remainingAccounts` for indexing.

## Read Flow

- **Thread list**: `getSignaturesForAddress(feedPDA)` → gateway `/slice` → group by threadPda
- **Thread detail**: gateway `/rows` for thread table → separate OP/replies → apply instruction merges
- **Edit/delete**: instruction table rows applied via `mergeInstructions`

## Project Structure

```
src/
├── app/                          # Next.js pages — composition only
│   ├── layout.tsx                # providers (wallet, connection)
│   ├── page.tsx                  # home — board grid
│   ├── [boardId]/page.tsx        # board — thread list
│   └── [boardId]/[threadId]/page.tsx  # thread — OP + replies
│
├── components/                   # UI — props in, JSX out, no SDK imports
│   ├── board-list.tsx
│   ├── thread-list.tsx
│   ├── thread-detail.tsx
│   ├── post-form.tsx
│   ├── post.tsx
│   ├── wallet-button.tsx
│   └── header.tsx
│
├── lib/                          # Logic SDK doesn't provide
│   ├── constants.ts              # schema, PDA derivation, board list
│   ├── config.ts                 # RPC + gateway URLs
│   ├── board.ts                  # feed PDA, feed-based thread listing
│   ├── gateway.ts                # gateway API client (/rows, /slice)
│   ├── parse.ts                  # edit/delete instruction merging
│   └── types.ts                  # Board, Post, Reply
│
└── hooks/                        # SDK calls + React state
    ├── use-threads.ts            # board page — feed-based thread list
    ├── use-paginated-replies.ts  # thread page — replies with pagination
    └── use-post.ts               # create thread, reply, edit, delete
```
