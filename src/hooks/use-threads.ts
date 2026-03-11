// Fetch threads for a board — supports catalog (creation order) and bump order

// TODO:
// Catalog mode (default):
//   1. Derive threadsTablePDA from hash("boards/{boardId}/threads")
//   2. iqlabs.reader.readTableRows(threadsTablePDA, { limit })
//   3. Return threads in creation order
//
// Bump mode:
//   1. getFeedPda(dbRootKey, boardId) → feedPDA
//   2. fetchBumpOrderedThreadNos(connection, feedPDA, limit) → ordered nos
//   3. Load thread data for each no
//   4. Return threads in bump order
//
// Each thread row: { no, sub, com, name, time }
// Return { threads, loading, error, mode }
