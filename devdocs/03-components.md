# components/ — UI 렌더링

## 목표

데이터를 props로 받아서 렌더링만 한다. SDK import 없음, on-chain 로직 없음.
Tailwind CSS로 스타일링. 4chan 스타일의 심플한 UI.

---

## post.tsx — 가장 먼저 만들 컴포넌트

모든 곳에서 재사용되는 기본 단위.

### Props
- `no`: 포스트 번호
- `com`: 댓글 본문
- `name`: 작성자
- `time`: 타임스탬프
- `sub?`: 제목 (OP일 때만)
- `img?`: 이미지 경로 (on_chain_path 또는 URL)
- `isOwner?`: 내 글인지 (edit/delete 버튼 표시용)
- `onEdit?`, `onDelete?`: 콜백

### 렌더링
- 이미지 (img 있으면): 썸네일 표시, 클릭 시 원본
- 헤더: `name` · `No.{no}` · 시간
- 제목 (sub 있으면)
- 본문: `segmentPostBody(com)`으로 파싱 → text는 그대로, quote는 `<QuoteLink />`로

---

## quote-link.tsx

### Props
- `no`: 참조 대상 포스트 번호

### 렌더링
- `>>no` 텍스트, 클릭하면 해당 포스트로 스크롤
- hover 시 참조 포스트 미리보기 (같은 페이지 내 데이터 참조)

---

## board-list.tsx

### Props
- `boards`: board 배열

### 렌더링
- 그리드 레이아웃
- 각 카드: `/{board_id}` 링크, title, description 표시

---

## thread-list.tsx

### Props
- `threads`: thread 배열
- `boardId`: 현재 보드

### 렌더링
- 각 thread를 `<Post />` 로 렌더링 (com은 일부만 truncate)
- 클릭하면 `/{boardId}/{no}`로 이동
- 카탈로그/범프 뷰 전환은 부모 페이지에서 처리

---

## thread-detail.tsx

### Props
- `thread`: OP 포스트
- `replies`: reply 배열

### 렌더링
- OP: `<Post />` (sub 포함)
- replies: `<Post />` 반복
- 사이에 구분선

---

## post-form.tsx

### Props
- `mode`: `"thread"` | `"reply"`
- `onSubmit`: 제출 콜백
- `loading`: 제출 중 상태

### 렌더링
- thread 모드: subject + comment + name + 이미지 첨부 입력
- reply 모드: comment + name + 이미지 첨부 입력
- 지갑 미연결 시 "Connect Wallet" 안내
- 예상 비용 표시 (thread: ~0.023 SOL, reply: ~0.003 SOL)
- 제출 버튼

---

## header.tsx

### 렌더링
- 왼쪽: 로고 + 보드 링크들
- 오른쪽: `<WalletButton />`
- breadcrumb: Home > /{boardId} > Thread #{no}

---

## wallet-button.tsx

### 렌더링
- `@solana/wallet-adapter-react`의 `useWallet()` 사용
- 연결됨: 지갑 주소 축약 표시 + disconnect
- 미연결: "Connect Wallet" 버튼
