import { PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";

const DB_ROOT_ID = "iqchan";
const tSeed = "boards/po/threads";

// ── Path 1: What createExtTableInstruction uses (manual TX) ──
// dbRootIdBytes = Buffer.from(toSeedBytes(DB_ROOT_ID))
// tSeedBytes = Buffer.from(toSeedBytes(tSeed))
// deriveTablePda uses: getTablePda(dbRootKey, toSeedBytes(seed))
const dbRootIdBytes_manual = iqlabs.utils.toSeedBytes(DB_ROOT_ID);
const dbRootKey_manual = iqlabs.contract.getDbRootPda(dbRootIdBytes_manual);
const tSeedBytes_manual = iqlabs.utils.toSeedBytes(tSeed);
const tablePda_manual = iqlabs.contract.getTablePda(dbRootKey_manual, tSeedBytes_manual);

console.log("═══ Path 1: createExtTable (manual TX) ═══");
console.log("dbRootIdBytes:", Buffer.from(dbRootIdBytes_manual).toString("hex"));
console.log("dbRootKey:", dbRootKey_manual.toBase58());
console.log("tSeedBytes:", Buffer.from(tSeedBytes_manual).toString("hex"));
console.log("tablePda:", tablePda_manual.toBase58());

// ── Path 2: What writeRow SDK does internally ──
// Input: Buffer.from(toSeedBytes(DB_ROOT_ID)) → a Buffer(32)
// writeRow line 51: dbRootSeed = toSeedBytes(input)
//   → toSeedBytes receives Buffer → typeof !== "string" → return as-is
// writeRow line 53: dbRoot = getDbRootPda(dbRootSeed)
// writeRow line 54: ensureDbRootExists(conn, programId, dbRootSeed)
//   → ensureDbRootExists line 42: dbRootSeed2 = toSeedBytes(dbRootSeed)
//     → toSeedBytes receives Uint8Array → return as-is
//   → dbRoot2 = getDbRootPda(dbRootSeed2)
// writeRow line 55: ensureTableExists(conn, programId, dbRootSeed, tableSeedBytes)
//   → ensureTableExists line 50: dbRootSeed3 = toSeedBytes(dbRootSeed)
//     → same as above, return as-is
//   → tableSeedBytes2 = toSeedBytes(tableSeedBytes)
//     → return as-is
//   → tablePda = getTablePda(dbRoot3, tableSeedBytes2)

const input_dbRootId = Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID));
const input_tableSeed = Buffer.from(iqlabs.utils.toSeedBytes(tSeed));

// Step 1 in writeRow: toSeedBytes(input)
const dbRootSeed_sdk = iqlabs.utils.toSeedBytes(input_dbRootId);
const tableSeedBytes_sdk = iqlabs.utils.toSeedBytes(input_tableSeed);

// Step 2: getDbRootPda
const dbRoot_sdk = iqlabs.contract.getDbRootPda(dbRootSeed_sdk);

// Step 3: ensureTableExists internally
const dbRootSeed_ensure = iqlabs.utils.toSeedBytes(dbRootSeed_sdk);
const dbRoot_ensure = iqlabs.contract.getDbRootPda(dbRootSeed_ensure);
const tableSeedBytes_ensure = iqlabs.utils.toSeedBytes(tableSeedBytes_sdk);
const tablePda_ensure = iqlabs.contract.getTablePda(dbRoot_ensure, tableSeedBytes_ensure);

console.log("\n═══ Path 2: writeRow SDK internal ═══");
console.log("input dbRootId (Buffer):", input_dbRootId.toString("hex"), "len:", input_dbRootId.length);
console.log("input tableSeed (Buffer):", input_tableSeed.toString("hex"), "len:", input_tableSeed.length);
console.log("after toSeedBytes(Buffer):", Buffer.from(dbRootSeed_sdk).toString("hex"), "same?", Buffer.from(dbRootSeed_sdk).equals(input_dbRootId));
console.log("dbRoot (SDK):", dbRoot_sdk.toBase58());
console.log("tablePda (SDK):", tablePda_ensure.toBase58());

console.log("\n═══ COMPARISON ═══");
console.log("dbRoot match:", dbRootKey_manual.toBase58() === dbRoot_sdk.toBase58());
console.log("tablePda match:", tablePda_manual.toBase58() === tablePda_ensure.toBase58());
console.log("manual:", tablePda_manual.toBase58());
console.log("SDK:   ", tablePda_ensure.toBase58());

if (tablePda_manual.toBase58() !== tablePda_ensure.toBase58()) {
    console.log("\n❌ PDA MISMATCH — this is the bug!");
    console.log("writeRow writes to:", tablePda_ensure.toBase58());
    console.log("viewer reads from:", tablePda_manual.toBase58());
}
