// useReplies(boardId, threadNo)
//   Fetch replies for a specific thread, with edit/delete instructions applied.
//
// Input:  boardId (string) — e.g. "po"
//         threadNo (number) — the thread number
// Output: { replies, loading, error }
//   replies: Array<{ no: number, com: string, name: string, time: number, img?: string }>
//   loading: boolean
//   error: Error | null
//
// Logic:
//   1. Derive repliesTablePDA from repliesTableSeed(boardId, threadNo)
//   2. Call iqlabs.reader.readTableRows(repliesTablePDA) → raw replies
//   3. Fetch instruction table for this thread → edit/delete logs
//   4. Call mergeInstructions(replies, instructions) → apply edits, remove deletes
//   5. Return { replies, loading, error }
