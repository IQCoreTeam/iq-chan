// QuoteLink({ no, boardId, threadNo })
//   Inline >>no reference link with hover preview.
//
// Input props:
//   no (number) — the referenced post number
//   boardId (string) — current board
//   threadNo (number) — current thread
//
// Renders:
//   1. Clickable ">>no" text (green, 4chan style)
//   2. On hover: tooltip showing referenced post's content (lookup from same-page data)
//   3. On click: smooth scroll to the referenced post element if on same page
