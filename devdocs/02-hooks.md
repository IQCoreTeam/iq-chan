# hooks/ — SDK 호출 + React 상태 관리

## 목표

SDK 함수를 직접 호출하고, 결과를 React 상태로 관리한다.
SDK를 다시 감싸는 래퍼는 만들지 않는다. hook 안에서 `iqlabs.reader.readTableRows(...)` 직접 호출.

---

## use-boards.ts

### `useBoards()`

- 반환: `{ boards, loading, error }`
- 로직:
  1. SDK의 `getTablePda`로 boardsTablePDA 파생
  2. `iqlabs.reader.readTableRows(boardsTablePDA)` 호출
  3. 결과를 상태에 저장
- 각 board: `{ board_id, title, description, rules, sticky }`
- 호출 시점: home 페이지 마운트 시 1회

---

## use-threads.ts

### `useThreads(boardId, mode)`

- 반환: `{ threads, loading, error }`
- mode: `"catalog"` | `"bump"`
- **catalog 모드:**
  1. `threadsTableSeed(boardId)` → tablePDA 파생
  2. `iqlabs.reader.readTableRows(tablePDA, {limit})` → 생성순
- **bump 모드:**
  1. `getFeedPda(dbRootKey, boardId)` → feedPDA
  2. `fetchBumpOrderedThreadNos(connection, feedPDA, limit)` → 정렬된 thread nos
  3. 각 thread no에 대해 thread 데이터 로드
- 각 thread: `{ no, sub, com, name, time, img? }`

---

## use-replies.ts

### `useReplies(boardId, threadNo)`

- 반환: `{ replies, loading, error }`
- 로직:
  1. `repliesTableSeed(boardId, threadNo)` → tablePDA 파생
  2. `iqlabs.reader.readTableRows(tablePDA)` → 댓글 목록
  3. instruction table 조회 → `mergeInstructions(replies, instructions)` → edit/delete 적용
- 각 reply: `{ no, com, name, time, img? }`

---

## use-post.ts

### `usePost()`

- 반환: `{ createThread, postReply, editPost, deletePost, loading, error }`

#### `createThread(boardId, { sub, com, name, img? })`
- TX1: `contract.createExtTableInstruction` → replies ext table 생성 (~0.02 SOL)
- TX2: `iqlabs.writer.writeRow(threadsTableSeed, rowJson, false, [feedPDA])` (~0.003 SOL)
- thread no는 프론트에서 채번 (기존 max no + 1 또는 timestamp 기반)

#### `postReply(boardId, threadNo, { com, name, img? })`
- `iqlabs.writer.writeRow(repliesTableSeed, rowJson, false, [feedPDA, threadsPDA])`
- reply no 채번 필요

#### `editPost(boardId, threadNo, targetTxSig, newCom)`
- `iqlabs.writer.manageRowData(repliesTableSeed, rowJson, tableName, targetTx)`

#### `deletePost(boardId, threadNo, targetTxSig)`
- `iqlabs.writer.manageRowData(repliesTableSeed, "{}", tableName, targetTx)`
- 빈 metadata = DELETE

---

## 생각해볼 여지

- thread/reply no 채번 전략: timestamp 기반 vs 기존 max+1 조회. max+1은 race condition 가능. timestamp가 더 안전할 수 있음
- `createThread`에서 2개 TX를 순차 실행해야 함 — TX1 실패 시 TX2 안 보내는 에러 핸들링 필요
- bump 모드에서 thread 데이터를 개별 로드하면 N번 RPC 호출 — 배치 최적화 고려
