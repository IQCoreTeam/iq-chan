# Migration Plan: `no` 제거 + 구조 개편

## 배경

1. Reply가 thread로 표시됨 — reply tx가 feed에서 thread처럼 잡힘
2. `no` 필드(`Date.now()`) 제거 — PDA 기반 식별
3. 구조 단순화 — threads 테이블 제거, feed 하나로 thread 목록 + bump 해결

## IQ DB 컨트랙트 이해

- **`create_ext_table`**: `global_table_seeds`에만 등록. 독립 온체인 Table 계정 생성.
- **`ext_keys`**: Table struct의 메타데이터. 탐색 힌트일 뿐. 자동 생성/연결 없음.
- **`manageRowData`** (edit/delete): seed 해시 필요 → seed 원문 보존 필요.
- **`toSeedBytes(seed)`**: keccak_256 해시 → 항상 32바이트. seed 길이 무관.

## 새 온체인 구조

```
DbRoot ("iqchan")
│
├── board "po" (ext table)                    seed: "po"
│   │                                          ext_keys: ["thread"]
│   │
│   ├── thread (ext table)                    seed: "po/thread/{randomId_A}"
│   │   PDA: 7xYz...                          ← thread 식별자
│   │   ├── OP row:    {sub:"Hello", com:"본문", name, time, threadPda:"7xYz...", threadSeed:"po/thread/a3f8..."}
│   │   ├── reply row: {sub:"", com:"댓글1", name, time, threadPda:"7xYz..."}
│   │   └── reply row: {sub:"", com:"댓글2", name, time, threadPda:"7xYz..."}
│   │
│   ├── thread (ext table)                    seed: "po/thread/{randomId_B}"
│   │   PDA: 3aBc...
│   │   └── OP row:    {sub:"Test", com:"...", threadPda:"3aBc...", threadSeed:"po/thread/b91d..."}
│   ...
│
├── board "a" (ext table)                     seed: "a"
│   └── ...

feed (feedPDA, board당 하나):
  모든 tx가 remainingAccounts로 feedPDA 참조
  → getSignaturesForAddress(feedPDA)로 전체 활동 조회
  → threadPda로 thread 식별, sub 유무로 OP/reply 구분
```

### 핵심
- **threads 테이블 없음** — feed가 thread 목록 + bump ordering 역할
- **각 thread = ext table** → 고유 PDA = 식별자
- **OP** = thread 테이블의 첫 row (sub 비어있지 않음, threadSeed 포함)
- **Reply** = 같은 테이블의 나머지 row (sub 빈 문자열, threadSeed 없음)
- **threadSeed는 OP에만** — reply/edit/delete 시 OP에서 읽어서 사용

## 테이블 스키마

### thread/{randomId} (ext table, thread당 하나)

columns: `["sub","com","name","time","img","threadPda","threadSeed"]`
- `id_col`: `"time"`, `ext_keys`: `[]`

**OP row:**

| Field | Value |
|-------|-------|
| sub | 제목 (비어있지 않음) |
| com | 본문 |
| name | 작성자 |
| time | Unix timestamp |
| img | (optional) |
| threadPda | 이 thread의 PDA 주소 |
| threadSeed | seed 원문 (edit/delete/reply용) |

**Reply row:**

| Field | Value |
|-------|-------|
| sub | "" (빈 문자열) |
| com | 댓글 |
| name | 작성자 |
| time | Unix timestamp |
| img | (optional) |
| threadPda | 이 thread의 PDA 주소 |
| threadSeed | "" 또는 생략 |

## Write Flow

### Create Thread (2 TX, ~0.023 SOL)

```
randomId = crypto.randomUUID()
threadSeed = "{boardId}/thread/{randomId}"
threadPda = deriveTablePda(threadSeed)       ← tx 전에 계산!

TX1: create_ext_table(
  seed: hash(threadSeed)
  table_name: threadSeed
  columns: ["sub","com","name","time","img","threadPda","threadSeed"]
  id_col: "time", ext_keys: []
)

TX2: writeRow → OP row
  seed: hash(threadSeed)
  metadata: {
    "sub": "제목",
    "com": "본문",
    "name": "Anon",
    "time": 1710...,
    "threadPda": "7xYz...",
    "threadSeed": "po/thread/{randomId}"
  }
  remainingAccounts: [feedPDA]
```

### Post Reply (1 TX, ~0.003 SOL)

```
writeRow → thread 테이블
  seed: hash(threadSeed)         ← OP의 threadSeed에서 확보
  metadata: {
    "sub": "",
    "com": "댓글",
    "name": "Anon",
    "time": 1710...,
    "threadPda": "7xYz..."
  }
  remainingAccounts: [feedPDA]
```

### Edit/Delete (1 TX)

```
manageRowData
  seed: hash(threadSeed)         ← OP의 threadSeed에서 확보
  metadata: {"target": "txSig", "com": "수정"}   // edit
  metadata: {"target": "txSig"}                   // delete
```

## Read Flow

### Thread 목록 (Board Page) — feed 기반 페이지네이션

**상수**: `THREADS_PER_PAGE = 20`

1. `getSignaturesForAddress(feedPDA, {limit: 50, before: cursor})`
2. `fetchTableSlice(feedPDA, sigs)` → row 데이터
3. `threadPda`로 thread 식별, `sub` 유무로 OP/reply 구분
4. 유니크 thread 20개 모이면 로딩 끝
5. OP row에서 제목/본문 미리보기 표시
6. 다음 페이지 → cursor 이어서 fetch

OP가 아직 안 나온 thread → threadPda에서 별도 fetch.

### Thread Detail

1. URL: `/{boardId}/{threadPda}`
2. `fetchAllTableRows(threadPda)` → 전체 row
3. `sub` 비어있지 않은 row = OP, 나머지 = replies
4. OP의 `threadSeed`로 reply/edit/delete 시 seed 확보

## 비용

| 동작 | 현재 | 새 구조 |
|------|------|---------|
| Thread 생성 | ~0.023 SOL (2TX) | ~0.023 SOL (2TX) |
| Reply | ~0.003 SOL (1TX) | ~0.003 SOL (1TX) |

## 코딩 룰

1. 동일 input/output의 무의미한 wrapper 만들지 않기
2. 기존 함수를 먼저 탐색, 최대한 재사용. 같은 목적 함수 중복 금지
3. 재사용 안 되는 타입 변수 inline
4. 불필요한 파라미터 금지
5. 책임 분리 명확히
6. 모든 코드와 주석은 영어로 작성

## 모듈화

### DB 스키마를 코드에서 보이게

`src/lib/constants.ts` 상단에 온체인 구조 주석:
```
// DbRoot ("iqchan")
// └── board (ext table)           seed: "{boardId}"
//     └── thread (ext table)      seed: "{boardId}/thread/{randomId}"
//         ├── OP row:    {sub, com, name, time, img?, threadPda, threadSeed}
//         └── reply row: {sub:"", com, name, time, img?, threadPda}
//
// feed (feedPDA, board당 하나) — remainingAccounts, bump ordering
```

### 책임 분리

| 파일 | 책임 |
|------|------|
| `lib/constants.ts` | DB 스키마, seed/PDA, 상수 |
| `lib/board.ts` | feed PDA, feed 기반 thread 목록 |
| `lib/gateway.ts` | gateway API (변경 없음) |
| `lib/parse.ts` | 텍스트 파싱, instruction merge |
| `hooks/use-post.ts` | 쓰기 (create, reply, edit, delete) |
| `hooks/use-threads.ts` | board 페이지: feed → thread 목록 |
| `hooks/use-paginated-replies.ts` | thread 페이지: replies |

### 재사용

- `lib/constants.ts`: `deriveTablePda`, `deriveInstructionTablePda`, `getDbRootKey`, `DB_ROOT_ID`, `FEED_SEED_PREFIX`
- `lib/board.ts`: `getFeedPda`
- `lib/gateway.ts`: 전부 그대로
- `lib/parse.ts`: `mergeInstructions`
- `lib/instruction-resolver.ts`: 전부 그대로

### 제거

- `constants.ts`: `threadsTableSeed`, `repliesTableSeed`, `boardsTableSeed`
- `board.ts`: `fetchBumpOrderedThreadNos`
- `hooks/use-threads.ts`: 전체 재작성

## 수정 대상 파일

### `src/lib/constants.ts`
- 온체인 구조 주석 추가
- 제거: `threadsTableSeed`, `repliesTableSeed`, `boardsTableSeed`
- 추가: `threadTableSeed(boardId, randomId)`, `THREADS_PER_PAGE = 20`

### `src/lib/board.ts`
- 제거: `fetchBumpOrderedThreadNos`
- 추가: `fetchFeedThreads(feedPda, limit, before?)` — feed → thread 목록 + cursor

### `src/lib/parse.ts`
- `segmentPostBody`: quote 비활성화 (plain text)
- `mergeInstructions`: 유지

### `src/hooks/use-post.ts`
- `createThread`: randomId → ext table(TX1) → OP row(TX2, threadPda+threadSeed 포함)
- `postReply(threadSeed, threadPda, data)`: threadSeed 기반, threadPda만 row에
- `editPost(threadSeed, ...)` / `deletePost(threadSeed, ...)`: threadSeed 기반

### `src/hooks/use-threads.ts`
- 재작성: feed 기반 thread 목록, cursor 페이지네이션

### `src/hooks/use-paginated-replies.ts`
- `threadNo` → `threadPda`, OP 분리, `no` 제거

### 컴포넌트
- `post.tsx`: `no` → `txSig`
- `thread-list.tsx`: threadPda 기반
- `thread-detail.tsx`: no 제거

### 라우팅
- `[threadNo]` → `[threadId]` (threadPda)

## 하위 호환성

- 기존 데이터(no 기반): feed에서 threadPda 없는 row는 skip.
- 기존 URL: 404 허용.
