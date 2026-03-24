import { Connection, PublicKey } from "@solana/web3.js";

const conn = new Connection(
    "process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"",
);

const signer = new PublicKey("FPSYQmFh1WhbrgNKoQCDBcrf3YLc9eoNCpTyAjHXrf1c");
const signerSigs = await conn.getSignaturesForAddress(signer, { limit: 20 });

// Find the DbCodeIn txs
for (const s of signerSigs) {
    const tx = await conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
    const logs = tx?.meta?.logMessages || [];
    const instruction = logs.find(l => l.includes("Instruction:"));

    if (instruction && instruction.includes("DbCodeIn")) {
        console.log("═══ DbCodeIn TX ═══");
        console.log("Full sig:", s.signature);
        console.log("Slot:", s.slot);
        console.log("Error:", tx.meta?.err);
        console.log("Account keys:");
        for (const key of tx.transaction.message.accountKeys) {
            console.log("  -", key.pubkey.toBase58(),
                key.signer ? "(signer)" : "",
                key.writable ? "(writable)" : "");
        }
        console.log("All logs:");
        for (const log of logs) {
            console.log("  ", log);
        }
        console.log("");
    }
}

// Also check: what happened right after the second batch of CreateExtTable
// Let's look at the sequence more carefully
console.log("\n═══ Full TX Timeline (most recent first) ═══");
for (const s of signerSigs) {
    const tx = await conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
    const logs = tx?.meta?.logMessages || [];
    const instruction = logs.find(l => l.includes("Instruction:")) || "unknown";
    const accounts = tx?.transaction?.message?.accountKeys?.map(k => k.pubkey.toBase58()) || [];
    console.log(`slot=${s.slot} | ${instruction.replace("Program log: Instruction: ", "")} | accounts: ${accounts.length}`);
    // For DbCodeIn, show which table PDA it wrote to (3rd account usually)
    if (instruction.includes("DbCodeIn") && accounts.length > 2) {
        console.log("  → table account:", accounts[1], "or", accounts[2]);
    }
}
