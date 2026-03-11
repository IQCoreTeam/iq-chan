# app/ — 페이지 조합

## 목표

hooks 호출 + components 배치만 한다. 로직 없음. 각 페이지는 짧아야 한다.

---

## layout.tsx

- `ConnectionProvider` — RPC endpoint 설정
- `WalletProvider` — phantom, solflare 등
- `<Header />` 상단 고정
- children 렌더링

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
params에서 boardId 추출
useThreads(boardId, mode) → { threads, loading, error }
mode 토글 (catalog/bump) — useState

→ <PostForm mode="thread" onSubmit={createThread} />
→ <ThreadList threads={threads} boardId={boardId} />
```

---

## [boardId]/[threadNo]/page.tsx (Thread)

```
params에서 boardId, threadNo 추출
useReplies(boardId, threadNo) → { replies, loading, error }
useThreads(boardId) → OP 찾기 (threads에서 no === threadNo)

→ <ThreadDetail thread={op} replies={replies} />
→ <PostForm mode="reply" onSubmit={postReply} />
```

---

## 생각해볼 여지

- OP를 가져오기 위해 `useThreads` 전체를 호출하는 건 비효율적일 수 있음. 단일 thread row를 가져오는 방법이 SDK에 있는지 확인 필요. 없으면 thread 데이터를 reply 페이지 진입 시 URL에서 넘기는 것도 방법
