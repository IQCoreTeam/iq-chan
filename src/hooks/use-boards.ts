// Fetch board list from on-chain boards table

// TODO:
// 1. Derive boardsTablePDA from hash("boards")
// 2. iqlabs.reader.readTableRows(boardsTablePDA)
// 3. Return { boards, loading, error }
//
// Each board row: { board_id, title, description, rules, sticky }
