// ThreadList({ threads, boardId })
//   Thread previews for a board page. Supports catalog (grid) and bump (list) layouts.
//
// Input props:
//   threads: Array<{ no: number, sub: string, com: string, name: string, time: number, img?: string }>
//   boardId (string) — current board id
//
// Renders:
//   1. Each thread as a <Post /> with com truncated to preview length
//   2. Optional image thumbnail if img exists
//   3. Each thread card links to /{boardId}/{no}
//   4. Catalog view: grid layout / Bump view: list layout (parent page controls which)
