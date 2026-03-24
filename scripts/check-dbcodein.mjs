import { Connection, PublicKey } from "@solana/web3.js";

const conn = new Connection(
    "process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"",
);

// The DbCodeIn transactions (potential writeRow calls)
const sigs = [
    "4QzYCAQ7ZrU8WgrbxBGzorBSnSsUbYmBSdnZGPfRNcjANNWmzRQPEjZoC1MhYG9AMfbEeRJ3g2J6nDLipFX3G3o",
    "3SfdwYWxtn4rXsAS4BMdEhBFEnCzHK9LkKsqLVmSMNcbuwRCuACFaSRHy4s3U3MzmFw63b2YJV4RL6QnuNVH9VdL",
];

for (const sig of sigs) {
    console.log("\n═══ TX:", sig.slice(0, 40) + "...");
    const tx = await conn.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 });
    if (tx === null) {
        console.log("  Not found");
        continue;
    }
    console.log("  Slot:", tx.slot);
    console.log("  Error:", tx.meta?.err);

    console.log("  Account keys:");
    for (const key of tx.transaction.message.accountKeys) {
        console.log("    -", key.pubkey.toBase58(),
            key.signer ? "(signer)" : "",
            key.writable ? "(writable)" : "");
    }

    console.log("  Log messages:");
    for (const log of tx.meta?.logMessages || []) {
        console.log("    ", log);
    }

    // Check inner instructions for memo/data
    const innerInstr = tx.meta?.innerInstructions || [];
    if (innerInstr.length > 0) {
        console.log("  Inner instructions:", JSON.stringify(innerInstr, null, 2).slice(0, 500));
    }
}

// Also check: what PDA does the threads table resolve to for the second attempt?
// The second set of CreateExtTable txs might have created a different table
const createExtSigs = [
    "5w11koGdP8rcXCBcsEZHApdve4QN9Npp7h5VxmjYoqAyxAXjjWzq4EAFPKp2bK8bCXqQb28QrjGfCQWpyqGGhN2",
    "4RsMjfDHM3hLsJeXJrK8zb9ng7kKkLCCLi2FtNLDwk3HH5pSkPUQmBdEiHFWYhU1X4LtXeKkVR8QiNFzCnW9NVA",
];

console.log("\n\n═══ Checking the CreateExtTable txs from the second attempt ═══");
for (const sig of createExtSigs) {
    console.log("\n── TX:", sig.slice(0, 40) + "...");
    const tx = await conn.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 });
    if (tx === null) { console.log("  Not found"); continue; }
    console.log("  Slot:", tx.slot);
    console.log("  Account keys:");
    for (const key of tx.transaction.message.accountKeys) {
        console.log("    -", key.pubkey.toBase58(),
            key.signer ? "(signer)" : "",
            key.writable ? "(writable)" : "");
    }
    console.log("  Logs:");
    for (const log of tx.meta?.logMessages || []) {
        console.log("    ", log);
    }
}
