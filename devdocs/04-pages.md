# app/ — page composition

## Goal

Only call hooks + place components. No logic. Each page should be short.

---

## layout.tsx

- `ConnectionProvider` — RPC endpoint config
- `WalletProvider` — phantom, solflare, etc.
- `<Header />` fixed at top
- Render children

---

## page.tsx (Home)

```
useBoards() → { boards, loading, error }

if loading → skeleton
if error → error message
→ <BoardList boards={boards} />
```

---

## [boardId]/page.tsx (Board)

```
Extract boardId from params
useThreads(boardId, mode) → { threads, loading, error }
mode toggle (catalog/bump) — useState

→ <PostForm mode="thread" onSubmit={createThread} />
→ <ThreadList threads={threads} boardId={boardId} />
```

---

## [boardId]/[threadNo]/page.tsx (Thread)

```
Extract boardId, threadNo from params
useReplies(boardId, threadNo) → { replies, loading, error }
useThreads(boardId) → find OP (where no === threadNo)

→ <ThreadDetail thread={op} replies={replies} />
→ <PostForm mode="reply" onSubmit={postReply} />
```

---

## Open questions

- Calling `useThreads` just to get the OP is inefficient. Check if SDK has a single-row fetch method. If not, consider passing thread data via URL on navigation to the reply page.
