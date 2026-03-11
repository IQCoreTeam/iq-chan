// Submit actions: create thread, post reply, edit, delete

// TODO: createThread(boardId, { sub, com, name })
//   TX1: contract.createExtTableInstruction → create replies ext table
//   TX2: iqlabs.writer.writeRow(threadsTableSeed, row, remainingAccounts: [feedPDA])
//   Cost: ~0.023 SOL (rent + fee)

// TODO: postReply(boardId, threadNo, { com, name })
//   iqlabs.writer.writeRow(repliesTableSeed, row, remainingAccounts: [feedPDA, threadsPDA])
//   Cost: ~0.003 SOL

// TODO: editPost(boardId, threadNo, targetTxSig, newCom)
//   iqlabs.writer.manageRowData(repliesTableSeed, row, tableName, targetTx)

// TODO: deletePost(boardId, threadNo, targetTxSig)
//   iqlabs.writer.manageRowData(repliesTableSeed, {}, tableName, targetTx)
//   Empty metadata = DELETE

// Return { createThread, postReply, editPost, deletePost, loading, error }
