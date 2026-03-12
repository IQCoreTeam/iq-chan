import { PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";

const DB_ROOT_ID = "iqchan";
const dbRootIdBytes = iqlabs.utils.toSeedBytes(DB_ROOT_ID);
const dbRootKey = iqlabs.contract.getDbRootPda(dbRootIdBytes);

const threadsSeed = "boards/po/threads";
const threadsSeedBytes = iqlabs.utils.toSeedBytes(threadsSeed);

console.log("DB_ROOT_ID:", DB_ROOT_ID);
console.log("dbRootIdBytes:", Buffer.from(dbRootIdBytes).toString("hex"));
console.log("dbRootKey:", dbRootKey.toBase58());
console.log("");

console.log("threadsSeed:", threadsSeed);
console.log("threadsSeedBytes:", Buffer.from(threadsSeedBytes).toString("hex"));
console.log("threadsSeedBytes (length):", threadsSeedBytes.length);
console.log("");

// Method 1: getTablePda (used by viewer/gateway)
const tablePda1 = iqlabs.contract.getTablePda(dbRootKey, threadsSeedBytes);
console.log("getTablePda result:", tablePda1.toBase58());

// The writeRow uses Buffer.from(iqlabs.utils.toSeedBytes(tSeed)) as seed
// Let's check what exactly gets passed
const bufferSeed = Buffer.from(iqlabs.utils.toSeedBytes(threadsSeed));
console.log("Buffer.from(toSeedBytes):", bufferSeed.toString("hex"), "len:", bufferSeed.length);

// Check the 5wRQ account — is it a data account or table PDA?
console.log("");
console.log("── Known accounts ──");
console.log("Threads table PDA (viewer):", "4ufGt11rxQFrNMktQG6nA7QgyTKPsY3v2puiqxEbKSyK");
console.log("DbCodeIn wrote to:          5wRQEaHEZL7dJH8QpuhwUebC527fWr3HyN5Dpjoj7UKS");
console.log("These are DIFFERENT — PDA mismatch between writeRow and viewer!");
console.log("");

// Check: is 5wRQ the *data storage* account rather than the table PDA?
// writeRow might create a separate data account

// Let's also check: does gateway know about 5wRQ?
const res = await fetch(`https://gateway.iqlabs.dev/table/5wRQEaHEZL7dJH8QpuhwUebC527fWr3HyN5Dpjoj7UKS/index`);
console.log("Gateway index for 5wRQ:", res.status);
if (res.ok) {
    const data = await res.json();
    console.log("  signatures:", (data.signatures || []).length);
    if (data.signatures?.length > 0) {
        console.log("  first sig:", data.signatures[0]);
    }
}

// Also try EWNST (another writable account in DbCodeIn)
const res2 = await fetch(`https://gateway.iqlabs.dev/table/EWNSTD8tikwqHMcRNuuNbZrnYJUiJdKq9UXLXSEU4wZ1/index`);
console.log("\nGateway index for EWNST:", res2.status);
if (res2.ok) {
    const data = await res2.json();
    console.log("  signatures:", (data.signatures || []).length);
}

// And Eo4C (from the more recent DbCodeIn)
const res3 = await fetch(`https://gateway.iqlabs.dev/table/Eo4Cyt4MsiCUvJ5oyzrUEnCWAySqCGYYQVo2Wnxa1m88/index`);
console.log("\nGateway index for Eo4C:", res3.status);
if (res3.ok) {
    const data = await res3.json();
    console.log("  signatures:", (data.signatures || []).length);
}

// BWg1 (from the more recent DbCodeIn - remaining account = feedPda?)
console.log("\nBWg1 (remainingAccount from latest DbCodeIn):", "BWg1LzP3jVuhTxkaP2PXxou61sWEKW1VVRYdPieYtJtg");
console.log("Expected feedPda:", "6u1KufyKGqj52zKBcD6c2s5EbV5yssjBcHRy7dvvki5");
console.log("These are also DIFFERENT!");
