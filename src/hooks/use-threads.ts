// useThreads(boardId, mode)
//   Fetch threads for a board. Supports catalog (creation order) and bump (activity order).
//
// Input:  boardId (string) — e.g. "po"
//         mode ("catalog" | "bump") — viewing mode
// Output: { threads, loading, error }
//   threads: Array<{ no: number, sub: string, com: string, name: string, time: number, img?: string }>
//   loading: boolean
//   error: Error | null
//
// Catalog mode:
//   1. Derive threadsTablePDA from threadsTableSeed(boardId)
//   2. Call iqlabs.reader.readTableRows(threadsTablePDA, { limit })
//   3. Return threads in creation order
//
// Bump mode:
//   1. Derive feedPDA via getFeedPda(dbRootKey, boardId)
//   2. Call fetchBumpOrderedThreadNos(connection, feedPDA) → ordered thread nos (up to 20)
//   3. Load thread data for each no from threadsTable
//   4. Return threads in bump order
