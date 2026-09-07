// Bootstrap the "iqchan" dbRoot and its board tables on an EVM network. Mirrors
// scripts/setup-boards.ts (Solana) using @iqlabs-official/ethereum-sdk. Run this
// once per network before inscribe-thread-evm.mjs / before the app can post.
//
// Usage:
//   PRIVATE_KEY=0x... IQCHAN_NETWORK=monadTestnet node scripts/setup-boards-evm.mjs
//
// Env:
//   PRIVATE_KEY     (required) funded key on the target chain
//   IQCHAN_NETWORK  sepolia | monadTestnet | monad | robinhood   (default monadTestnet)
//   IQCHAN_RPC      optional RPC override (else the SDK network default)
//   IQCHAN_BOARDS   comma list of board seeds to create           (default "biz,test")
//
// Robinhood has no testnet, so develop on monadTestnet (free faucet:
// https://faucet.monad.xyz) and only run against robinhood for the real launch.

import { writer, setNetwork, getRpcUrl } from "@iqlabs-official/ethereum-sdk";
import { Wallet, JsonRpcProvider } from "ethers";

const DB_ROOT_ID = "iqchan";
// Mirrors BOARD_COLUMNS in src/lib/board-config.ts
const COLUMNS = ["sub", "com", "name", "time", "img", "threadPda", "threadSeed"];

const NETWORK = process.env.IQCHAN_NETWORK || "monadTestnet";
const PK = process.env.PRIVATE_KEY;
const BOARDS = (process.env.IQCHAN_BOARDS || "biz,test").split(",").map((s) => s.trim()).filter(Boolean);

if (!PK) {
    console.error("PRIVATE_KEY env is required");
    process.exit(1);
}

setNetwork(NETWORK, process.env.IQCHAN_RPC);
const rpc = getRpcUrl();
const provider = new JsonRpcProvider(rpc);
const signer = new Wallet(PK, provider);

const short = (e) => e?.shortMessage || e?.info?.error?.message || e?.message || String(e);

console.log(`network=${NETWORK} rpc=${rpc}`);
console.log(`signer=${await signer.getAddress()}`);

// 1. dbRoot (idempotent — skip if it already exists)
try {
    const h = await writer.initializeDbRoot(signer, DB_ROOT_ID);
    console.log(`dbRoot "${DB_ROOT_ID}" created: ${h}`);
} catch (e) {
    console.log(`dbRoot "${DB_ROOT_ID}" init skipped: ${short(e)}`);
}

// 2. board tables (idempotent)
for (const board of BOARDS) {
    try {
        const h = await writer.createTable(signer, DB_ROOT_ID, board, COLUMNS, "time");
        console.log(`board "${board}" created: ${h}`);
    } catch (e) {
        console.log(`board "${board}" skipped: ${short(e)}`);
    }
}

console.log("done.");
