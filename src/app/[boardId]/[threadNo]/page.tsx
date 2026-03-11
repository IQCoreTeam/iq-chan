// ThreadPage({ params })
//   Thread page — displays OP post and all replies.
//
// Input: params.boardId (string), params.threadNo (string) — from URL path
//
// Logic:
//   1. Extract boardId, threadNo from params (parse threadNo to number)
//   2. const { threads } = useThreads(boardId, "catalog")
//   3. const op = threads.find(t => t.no === threadNo) — find OP from threads
//   4. const { replies, loading, error } = useReplies(boardId, threadNo)
//   5. const { postReply, loading: postLoading } = usePost()
//   6. if loading → render skeleton
//   7. if error → render error message
//   8. Render:
//      - <ThreadDetail thread={op} replies={replies} />
//      - <PostForm mode="reply" onSubmit={(data) => postReply(boardId, threadNo, data)} loading={postLoading} />
