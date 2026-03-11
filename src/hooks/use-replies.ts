// Fetch replies for a specific thread

// TODO:
// 1. Derive repliesTablePDA from hash("boards/{boardId}/threads/{no}/replies")
// 2. iqlabs.reader.readTableRows(repliesTablePDA)
// 3. Fetch instruction table → mergeInstructions() for edits/deletes
// 4. Return { replies, loading, error }
//
// Each reply row: { no, com, name, time }
