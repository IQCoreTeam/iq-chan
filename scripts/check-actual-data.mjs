import iqlabs from "iqlabs-sdk";

const GATEWAY = "https://gateway.iqlabs.dev";

// The account writeRow actually writes to
const actualDataPda = "5wRQEaHEZL7dJH8QpuhwUebC527fWr3HyN5Dpjoj7UKS";
// The account the viewer reads from
const viewerPda = "4ufGt11rxQFrNMktQG6nA7QgyTKPsY3v2puiqxEbKSyK";

console.log("═══ Reading ACTUAL data (where writeRow stores data) ═══");
console.log("PDA:", actualDataPda);

const indexRes = await fetch(`${GATEWAY}/table/${actualDataPda}/index`);
const indexData = await indexRes.json();
const sigs = indexData.signatures || [];
console.log("Total signatures:", sigs.length);

// Get the latest few rows
const sliceSigs = sigs.slice(0, 10);
const sliceRes = await fetch(`${GATEWAY}/table/${actualDataPda}/slice?sigs=${sliceSigs.join(",")}`);
const sliceData = await sliceRes.json();
const rows = sliceData.rows || [];

console.log("\nRows found:", rows.length);
for (const row of rows) {
    console.log("┌─────────────────────────────────");
    console.log("│ no:", row.no);
    console.log("│ sub:", row.sub);
    console.log("│ com:", (row.com || "").slice(0, 100));
    console.log("│ name:", row.name);
    console.log("│ time:", row.time, row.time ? `(${new Date(row.time * 1000).toISOString()})` : "");
    console.log("└─────────────────────────────────");
}

// Now check: how does the SDK derive the write PDA internally?
// writeRow takes: dbRootIdSeed, tableSeed
// The table PDA for reads uses: getTablePda(dbRootKey, seedBytes)
// Let's check if writeRow creates a data_code_in account vs table account

console.log("\n═══ PDA Derivation Investigation ═══");
const DB_ROOT_ID = "iqchan";
const threadsSeed = "boards/po/threads";

const dbRootIdBytes = iqlabs.utils.toSeedBytes(DB_ROOT_ID);
const threadsSeedBytes = iqlabs.utils.toSeedBytes(threadsSeed);
const dbRootKey = iqlabs.contract.getDbRootPda(dbRootIdBytes);

console.log("getTablePda (viewer uses):", iqlabs.contract.getTablePda(dbRootKey, threadsSeedBytes).toBase58());

// Check if there's a getDataPda or similar
console.log("\niqlabs.contract methods:", Object.keys(iqlabs.contract).filter(k => typeof iqlabs.contract[k] === 'function'));
console.log("\niqlabs.writer methods:", Object.keys(iqlabs.writer).filter(k => typeof iqlabs.writer[k] === 'function'));

// Check if there's a data code PDA function
if (iqlabs.contract.getDataCodePda) {
    console.log("getDataCodePda:", iqlabs.contract.getDataCodePda(dbRootKey, threadsSeedBytes).toBase58());
}
if (iqlabs.contract.getDbCodeInPda) {
    console.log("getDbCodeInPda:", iqlabs.contract.getDbCodeInPda(dbRootKey, threadsSeedBytes).toBase58());
}

// Try all contract methods that return PDAs
for (const [key, fn] of Object.entries(iqlabs.contract)) {
    if (typeof fn === 'function' && key.toLowerCase().includes('pda')) {
        try {
            const result = fn(dbRootKey, threadsSeedBytes);
            if (result?.toBase58) {
                console.log(`${key}:`, result.toBase58());
            }
        } catch (e) {
            // Skip if wrong args
        }
    }
}
