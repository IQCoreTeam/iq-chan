import { Connection, PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";

const conn = new Connection(
    "https://mainnet.helius-rpc.com/?api-key=fbb113ce-eeb4-4277-8c44-7153632d175a",
);

const DB_ROOT_ID = "iqchan";
const FEED_SEED_PREFIX = "feedmY}AGBJiqLabs";
const PROGRAM_ID = iqlabs.contract.PROGRAM_ID;

const dbRootKey = iqlabs.contract.getDbRootPda(iqlabs.utils.toSeedBytes(DB_ROOT_ID));

// Feed PDA for "po"
const boardIdHash = iqlabs.utils.toSeedBytes("po");
const feedPda = PublicKey.findProgramAddressSync(
    [
        Buffer.from(FEED_SEED_PREFIX),
        PROGRAM_ID.toBuffer(),
        dbRootKey.toBuffer(),
        Buffer.from(boardIdHash),
    ],
    PROGRAM_ID,
)[0];

console.log("feedPda:", feedPda.toBase58());

const feedSigs = await conn.getSignaturesForAddress(feedPda, { limit: 20 });
console.log("Feed signatures:", feedSigs.length);

// Also check the replies table PDA — maybe the thread's replies table was created
// Check all recent txs from the signer
const signer = new PublicKey("FPSYQmFh1WhbrgNKoQCDBcrf3YLc9eoNCpTyAjHXrf1c");
console.log("\nChecking recent transactions from signer:", signer.toBase58());
const signerSigs = await conn.getSignaturesForAddress(signer, { limit: 20 });
console.log("Found", signerSigs.length, "recent transactions");
for (const s of signerSigs) {
    const tx = await conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
    const logs = tx?.meta?.logMessages || [];
    const instruction = logs.find(l => l.includes("Instruction:"));
    console.log("  -", s.signature.slice(0, 30) + "...", "| slot:", s.slot, "| err:", s.err, "|", instruction || "no-instruction-log");
}
