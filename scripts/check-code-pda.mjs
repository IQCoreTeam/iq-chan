import iqlabs from "iqlabs-sdk";

const DB_ROOT_ID = "iqchan";
const dbRootIdBytes = iqlabs.utils.toSeedBytes(DB_ROOT_ID);
const dbRootKey = iqlabs.contract.getDbRootPda(dbRootIdBytes);
const threadsSeed = "boards/po/threads";
const threadsSeedBytes = iqlabs.utils.toSeedBytes(threadsSeed);

console.log("getTablePda:", iqlabs.contract.getTablePda(dbRootKey, threadsSeedBytes).toBase58());
console.log("Expected writeRow target:", "5wRQEaHEZL7dJH8QpuhwUebC527fWr3HyN5Dpjoj7UKS");

// Try getCodeAccountPda with different arg combos
try {
    const r1 = iqlabs.contract.getCodeAccountPda(dbRootIdBytes, threadsSeedBytes);
    console.log("getCodeAccountPda(dbRootIdBytes, threadsSeedBytes):", r1.toBase58());
} catch(e) { console.log("getCodeAccountPda(2 args) failed:", e.message); }

try {
    const r2 = iqlabs.contract.getCodeAccountPda(dbRootKey, threadsSeedBytes);
    console.log("getCodeAccountPda(dbRootKey, threadsSeedBytes):", r2.toBase58());
} catch(e) { console.log("getCodeAccountPda(key, bytes) failed:", e.message); }

try {
    const r3 = iqlabs.contract.getCodeAccountPda(threadsSeedBytes);
    console.log("getCodeAccountPda(threadsSeedBytes):", r3.toBase58());
} catch(e) { console.log("getCodeAccountPda(1 arg) failed:", e.message); }

// The writeRow function signature: writeRow(connection, wallet, dbRootIdSeed, tableSeed, data, isUpdate, remainingAccounts)
// The SDK internally derives a "code account" PDA from these seeds
// Let's check: the 5wRQ could be getCodeAccountPda

// Also check: does gateway's /table/ endpoint work with the table PDA or the code account?
// The viewer uses getTablePda which gives 4ufG, but data lives at 5wRQ
// Let's try reading from 4ufG gateway (the table PDA)
const res = await fetch(`https://gateway.iqlabs.dev/table/4ufGt11rxQFrNMktQG6nA7QgyTKPsY3v2puiqxEbKSyK/index`);
const data = await res.json();
console.log("\n4ufG (table PDA) gateway index:", data.signatures?.length || 0, "signatures");

// Check: maybe we need to use the code account PDA in the viewer
// Or maybe gateway works differently
