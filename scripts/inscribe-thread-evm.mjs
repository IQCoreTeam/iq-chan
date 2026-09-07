// Create a test thread (and optional replies) on an EVM iqchan board. Mirrors
// the app's EVM createThread/postReply exactly: createTable(thread) +
// writeRow(OP -> board table), replies -> writeRow(thread table). So it both
// seeds test content and validates the on-chain layout the read adapter expects.
//
// Requires setup-boards-evm.mjs to have created the dbRoot + board first.
//
// Usage:
//   PRIVATE_KEY=0x... IQCHAN_NETWORK=monadTestnet IQCHAN_BOARD=biz \
//   SUB="First thread" COM="gm from the EVM port" \
//   IMG="https://i.ibb.co/4Z5RwXPv/HQSPy-P7b0-AA-Uw-T.png" \
//   REPLIES='[{"com":"first"},{"com":"nice pic","img":"https://i.ibb.co/4Z5RwXPv/HQSPy-P7b0-AA-Uw-T.png"}]' \
//   node scripts/inscribe-thread-evm.mjs
//
// Env: PRIVATE_KEY (req), IQCHAN_NETWORK (default monadTestnet), IQCHAN_RPC (opt),
//      IQCHAN_BOARD (default biz), SUB, COM, NAME, IMG, REPLIES (JSON array).

import { writer, setNetwork, getRpcUrl } from "@iqlabs-official/ethereum-sdk";
import { Wallet, JsonRpcProvider } from "ethers";
import { randomUUID } from "node:crypto";

const DB_ROOT_ID = "iqchan";

const NETWORK = process.env.IQCHAN_NETWORK || "monadTestnet";
const PK = process.env.PRIVATE_KEY;
const board = process.env.IQCHAN_BOARD || "biz";
const sub = process.env.SUB || "Test thread";
const com = process.env.COM || "gm from the EVM port";
const name = process.env.NAME || "Anonymous";
const img = process.env.IMG || "";
const replies = process.env.REPLIES ? JSON.parse(process.env.REPLIES) : [];

if (!PK) {
    console.error("PRIVATE_KEY env is required");
    process.exit(1);
}

setNetwork(NETWORK, process.env.IQCHAN_RPC);
const rpc = getRpcUrl();
const provider = new JsonRpcProvider(rpc);
const signer = new Wallet(PK, provider);
const address = await signer.getAddress();
const nowSec = () => Math.floor(Date.now() / 1000);

const GW = process.env.IQCHAN_GATEWAY || "https://gateway.iqlabs.dev";
// Warm the gateway's durable index like the app does on post — otherwise the
// first read cold-walks the chain (slow enough to hit CDN timeouts on some RPCs).
async function notify(tableName, txHash, row) {
    try {
        await fetch(`${GW}/table/${DB_ROOT_ID}/${tableName}/notify?network=${NETWORK}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txHash, row, signer: address }),
        });
    } catch { /* best-effort */ }
}

console.log(`network=${NETWORK} rpc=${rpc} signer=${address} board=${board}`);

// 1. Create the thread's own table (slash-free name, matches the app)
const threadName = `${board}-thread-${randomUUID()}`;
console.log(`creating thread table ${threadName} ...`);
await writer.createTable(signer, DB_ROOT_ID, threadName, ["sub", "com", "name", "time", "img", "threadPda", "threadSeed"], "time");

// 2. Write the OP row to the BOARD table
const opRow = {
    sub, com, name, time: nowSec(),
    ...(img ? { img } : {}),
    threadPda: threadName,
    threadSeed: threadName,
};
const opTx = await writer.writeRow(signer, DB_ROOT_ID, board, JSON.stringify(opRow));
await notify(board, opTx, opRow);
console.log(`OP written: tx=${opTx}`);

// 3. Replies -> the thread table
for (let i = 0; i < replies.length; i++) {
    const r = replies[i];
    const row = {
        sub: "",
        com: r.com ?? `reply ${i + 1}`,
        name: r.name || "Anonymous",
        time: nowSec(),
        ...(r.img ? { img: r.img } : {}),
        threadPda: threadName,
        threadSeed: threadName,
    };
    const h = await writer.writeRow(signer, DB_ROOT_ID, threadName, JSON.stringify(row));
    await notify(threadName, h, row);
    console.log(`reply ${i + 1} written: tx=${h}`);
}

const gw = process.env.IQCHAN_GATEWAY || "https://gateway.iqlabs.dev";
console.log("done.");
console.log(`view board rows: ${gw}/table/${DB_ROOT_ID}/${board}/rows?network=${NETWORK}`);
console.log(`view thread:     ${gw}/table/${DB_ROOT_ID}/${board}/thread/${threadName}?network=${NETWORK}`);
