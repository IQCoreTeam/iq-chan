/**
 * check-table-meta.mjs — Decode on-chain table metadata and check columns
 *
 * Usage: node scripts/check-table-meta.mjs [boardId]
 * Default: "biz"
 */

import { Connection, PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";

const RPC_URL = process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";
const DB_ROOT_ID = "iqchan";
const boardId = process.argv[2] || "biz";

const connection = new Connection(RPC_URL, "confirmed");
const dbRootIdBytes = iqlabs.utils.toSeedBytes(DB_ROOT_ID);
const dbRootKey = iqlabs.contract.getDbRootPda(dbRootIdBytes);

const threadsSeed = `boards/${boardId}/threads`;
const threadsSeedBytes = iqlabs.utils.toSeedBytes(threadsSeed);
const threadsTablePda = iqlabs.contract.getTablePda(dbRootKey, threadsSeedBytes);

console.log("Board:", boardId);
console.log("Threads seed:", threadsSeed);
console.log("Threads table PDA:", threadsTablePda.toBase58());
console.log("");

// Decode table metadata using SDK's BorshAccountsCoder
const { BorshAccountsCoder } = await import("@coral-xyz/anchor");
const IDL = (await import("iqlabs-sdk/idl/code_in.json", { with: { type: "json" } })).default;
const coder = new BorshAccountsCoder(IDL);

const info = await connection.getAccountInfo(threadsTablePda);
if (!info) {
    console.log("❌ Threads table does not exist on-chain");
    process.exit(1);
}

console.log("✅ Threads table exists (size:", info.data.length, "bytes)");

const decoded = coder.decode("Table", info.data);
const columns = decoded.column_names.map(v => Buffer.from(v).toString("utf8"));
const idCol = Buffer.from(decoded.id_col).toString("utf8");
const writers = decoded.writers?.map(w => w.toBase58()) || [];

console.log("  columns:", columns);
console.log("  id_col:", idCol);
console.log("  writers:", writers.length === 0 ? "(anyone)" : writers);
console.log("  gate_mint:", decoded.gate_mint?.toBase58() || "(none)");
console.log("");

const expected = ["no", "sub", "com", "name", "time", "img"];
const missing = expected.filter(c => !columns.includes(c));
const extra = columns.filter(c => !expected.includes(c));

if (missing.length === 0 && extra.length === 0) {
    console.log("✅ Columns match expected:", expected.join(", "));
    console.log("→ updateTable is NOT needed (skip하면 됨)");
} else {
    if (missing.length > 0) console.log("⚠️  Missing columns:", missing);
    if (extra.length > 0) console.log("ℹ️  Extra columns:", extra);
    console.log("→ updateTable IS needed");
}

// Also check gateway index
console.log("");
const res = await fetch(`https://gateway.iqlabs.dev/table/${threadsTablePda.toBase58()}/index`);
const data = await res.json();
const sigs = data.signatures || [];
console.log("Gateway index:", sigs.length, "signatures");

if (sigs.length > 0) {
    const sliceRes = await fetch(`https://gateway.iqlabs.dev/table/${threadsTablePda.toBase58()}/slice?sigs=${sigs.slice(0, 5).join(",")}`);
    const sliceData = await sliceRes.json();
    const rows = sliceData.rows || [];
    console.log("Rows:", rows.length);
    for (const row of rows) {
        console.log("  thread no:", row.no, "| sub:", row.sub, "| name:", row.name);
    }
}
