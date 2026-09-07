"use client";

// The single write hook consumed by board/thread/thread-list. It now just reads
// the active chain's writer from WriterContext (Solana or EVM), which Providers
// filled. All chain-specific write logic lives in chains/{solana,evm}/writer.
export { useWriter as usePost } from "../lib/chains/context";
