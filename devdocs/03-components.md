# components/ — UI rendering

## Goal

Receive data via props and render only. No SDK imports, no on-chain logic.
Styled with Tailwind CSS. Simple 4chan-style UI.

---

## post.tsx — build this first

The base unit reused everywhere.

### Props
- `no`: post number
- `com`: comment body
- `name`: author
- `time`: timestamp
- `sub?`: subject (OP only)
- `img?`: image path (on_chain_path or URL)
- `isOwner?`: whether current wallet is the author (shows edit/delete buttons)
- `onEdit?`, `onDelete?`: callbacks

### Rendering
- Image (if img exists): thumbnail, click to expand
- Header: `name` · `No.{no}` · time
- Subject (if sub exists)
- Body: parse via `segmentPostBody(com)` → text rendered as-is, quotes rendered as `<QuoteLink />`

---

## quote-link.tsx

### Props
- `no`: referenced post number

### Rendering
- `>>no` text, click to scroll to referenced post
- On hover: preview of referenced post content (from same-page data)

---

## board-list.tsx

### Props
- `boards`: board array

### Rendering
- Grid layout
- Each card: link to `/{board_id}`, shows title and description

---

## thread-list.tsx

### Props
- `threads`: thread array
- `boardId`: current board

### Rendering
- Each thread rendered as `<Post />` (com truncated to preview length)
- Click navigates to `/{boardId}/{no}`
- Catalog/bump view toggle handled by parent page

---

## thread-detail.tsx

### Props
- `thread`: OP post
- `replies`: reply array

### Rendering
- OP: `<Post />` (with sub)
- Replies: `<Post />` for each, in order
- Separator between posts

---

## post-form.tsx

### Props
- `mode`: `"thread"` | `"reply"`
- `onSubmit`: submit callback
- `loading`: submitting state

### Rendering
- Thread mode: subject + comment + name + image upload inputs
- Reply mode: comment + name + image upload inputs
- If wallet not connected: "Connect Wallet" prompt
- Estimated cost display (thread: ~0.023 SOL, reply: ~0.003 SOL)
- Submit button

---

## header.tsx

### Rendering
- Left: logo + board links
- Right: `<WalletButton />`
- Breadcrumb: Home > /{boardId} > Thread #{no}

---

## wallet-button.tsx

### Rendering
- Uses `@solana/wallet-adapter-react`'s `useWallet()`
- Connected: truncated wallet address + disconnect
- Disconnected: "Connect Wallet" button
