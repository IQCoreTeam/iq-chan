# lib/ — iqchan 전용 글루 로직

## 목표

SDK가 제공하지 않는, iqchan에서만 필요한 순수 함수들을 구현한다.
React 의존 없음. 모든 hooks와 components가 이 레이어 위에 올라간다.

---

## constants.ts

이미 구현 완료. seed 생성 헬퍼들.

- `DB_ROOT_ID` — "iqchan"
- `FEED_SEED_PREFIX` — feed PDA 파생용 prefix
- `boardsTableSeed()` → `"boards"`
- `threadsTableSeed(boardId)` → `"boards/{boardId}/threads"`
- `repliesTableSeed(boardId, threadNo)` → `"boards/{boardId}/threads/{threadNo}/replies"`

---

## parse.ts

### `parseQuoteRefs(text: string): number[]`

- 입력: `"hello >>123 world >>456"`
- 출력: `[123, 456]`
- 로직: `/>>(\d+)/g` 매치, 숫자 추출

### `segmentPostBody(text: string): Segment[]`

- 입력: `"hello >>123 world"`
- 출력: `[{type:"text", value:"hello "}, {type:"quote", no:123}, {type:"text", value:" world"}]`
- 로직: `>>(\d+)` 기준으로 split, text/quote 교대 배열
- 컴포넌트에서 이 배열을 map해서 렌더링

### `mergeInstructions(posts, instructions): posts`

- 입력: 원본 posts 배열 + instruction table에서 읽은 수정/삭제 로그
- 출력: edits 적용 + deletes 제거된 최종 posts
- 로직:
  - instruction에 `com` 필드 있음 → 해당 post의 com을 덮어쓰기 (edit)
  - instruction에 데이터 없음 → 해당 post 제거 (delete)
  - `target` 필드로 원본 tx sig 매칭

---

## board.ts

`getFeedPda`와 `fetchBumpOrderedThreadNos`는 한 쌍으로 동작한다. feedPDA는 보드별로 하나씩 존재하며, SDK에 넣지 않고 iqchan 전용으로 유지한다.

### `getFeedPda(dbRootKey, boardId): PublicKey`

- 입력: dbRoot의 PublicKey, boardId 문자열
- 출력: feed PDA (on-chain 계정 없음, 주소만 파생)
- 보드당 하나: 각 boardId마다 고유한 feedPDA가 파생됨
- 로직: `PublicKey.findProgramAddressSync([FEED_SEED_PREFIX, programId, dbRootKey, sha256(boardId)], programId)`
- 쓰기 시: `writeRow`의 `remainingAccounts`에 feedPDA를 넣어서 bump 인덱싱 기록

### `fetchBumpOrderedThreadNos(connection, feedPda, limit): number[]`

- 입력: RPC connection, feedPDA, limit (서명 수집 상한)
- 출력: bump 순서로 정렬된 thread number 배열
- 표시 전략: feedPDA에서 서명을 수집하면서 20개의 서로 다른 thread가 모일 때까지 수집. 모인 20개 thread를 최근 활동순으로 정렬하여 반환
- 로직:
  1. `connection.getSignaturesForAddress(feedPda, {limit})` — limit은 충분히 크게 잡음
  2. 각 tx의 metadata 파싱 → thread_no 추출
  3. thread_no별로 그룹핑, 가장 최근 activity 시간 기록
  4. 20개의 고유 thread_no가 모이면 수집 중단
  5. 최근 활동순 정렬 후 thread_no 배열 반환

---

## 생각해볼 여지

- `fetchBumpOrderedThreadNos`에서 tx metadata 파싱이 SDK의 `readTableRows`와 겹치는 부분이 있는지 확인 필요. 겹치면 SDK 함수를 재사용
