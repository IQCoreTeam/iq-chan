// BoardPage({ params })
//   Board page — displays threads for a specific board.
//   Supports catalog/bump view toggle.
//
// Input: params.boardId (string) — from URL path
//
// Logic:
//   1. Extract boardId from params
//   2. const [mode, setMode] = useState<"catalog" | "bump">("bump")
//   3. const { threads, loading, error } = useThreads(boardId, mode)
//   4. const { createThread, loading: postLoading } = usePost()
//   5. if loading → render skeleton
//   6. if error → render error message
//   7. Render:
//      - View toggle button (catalog ↔ bump)
//      - <PostForm mode="thread" onSubmit={createThread} loading={postLoading} />
//      - <ThreadList threads={threads} boardId={boardId} />
