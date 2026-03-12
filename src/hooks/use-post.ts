// usePost()
//   Provides write actions: create thread, post reply, edit, delete.
//   All actions require a connected wallet.
//
// Input:  (none)
// Output: { createThread, postReply, editPost, deletePost, loading, error }
//   loading: boolean — true while any action is in flight
//   error: Error | null

// createThread(boardId, { sub, com, name, img? })
//   Create a new thread in a board. Requires 2 sequential transactions.
//
//   Input:  boardId (string)
//           sub (string) — thread subject/title
//           com (string) — comment body
//           name (string) — author display name
//           img? (string) — optional image on_chain_path or URL
//   Output: void (throws on error)
//
//   TX1: contract.createExtTableInstruction → create replies ext table for this thread (~0.02 SOL rent)
//   TX2: iqlabs.writer.writeRow(threadsTableSeed(boardId), rowJson, false, [feedPDA]) (~0.003 SOL fee)
//   thread no: assigned by frontend (timestamp-based or max+1)

// postReply(boardId, threadNo, { com, name, img? })
//   Post a reply to an existing thread.
//
//   Input:  boardId (string)
//           threadNo (number)
//           com (string) — comment body
//           name (string) — author display name
//           img? (string) — optional image on_chain_path or URL
//   Output: void (throws on error)
//
//   iqlabs.writer.writeRow(repliesTableSeed(boardId, threadNo), rowJson, false, [feedPDA, threadsPDA])
//   reply no: assigned by frontend
//   Cost: ~0.003 SOL

// editPost(boardId, threadNo, targetTxSig, newCom)
//   Edit an existing post's comment. Only the original author can edit.
//
//   Input:  boardId (string)
//           threadNo (number)
//           targetTxSig (string) — the original post's transaction signature
//           newCom (string) — the new comment content
//   Output: void (throws on error)
//
//   iqlabs.writer.manageRowData(repliesTableSeed, { target: targetTxSig, com: newCom }, tableName, targetTx)

// deletePost(boardId, threadNo, targetTxSig)
//   Delete an existing post. Only the original author can delete.
//
//   Input:  boardId (string)
//           threadNo (number)
//           targetTxSig (string) — the original post's transaction signature
//   Output: void (throws on error)
//
//   iqlabs.writer.manageRowData(repliesTableSeed, "{}", tableName, targetTx)
//   Empty metadata = DELETE
