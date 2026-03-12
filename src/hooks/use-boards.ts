// useBoards()
//   Fetch all boards from on-chain boards table.
//   Called once on home page mount.
//
// Input:  (none)
// Output: { boards, loading, error }
//   boards: Array<{ board_id: string, title: string, description: string, rules: string, sticky: string }>
//   loading: boolean
//   error: Error | null
//
// Logic:
//   1. Derive boardsTablePDA from boardsTableSeed() → hash("boards")
//   2. Call iqlabs.reader.readTableRows(boardsTablePDA)
//   3. Store result in React state
//   4. Return { boards, loading, error }
