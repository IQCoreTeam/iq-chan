import { Connection } from "@solana/web3.js";

const conn = new Connection(
    "https://mainnet.helius-rpc.com/?api-key=fbb113ce-eeb4-4277-8c44-7153632d175a",
);

const sigs = [
    "yJ5XJLowM8rioz6rQu1iGnt7gzvcCUFTjoVQ6aGCEcVtVsyG5RRFmmTEGTcaGfpZor317AzyYJVgHu1DH2S2PaU",
    "21L8GNotkF3Fotm5Gd7ee6WnnsgUecjUimAQ72d1ESQaDaukB5fJXkXWXwvnbpNXJswEMH28Crqm65uZqeeVeuu2",
];

for (const sig of sigs) {
    console.log("\n── TX:", sig.slice(0, 40) + "...");
    const tx = await conn.getParsedTransaction(sig, {
        maxSupportedTransactionVersion: 0,
    });
    if (tx === null) {
        console.log("  Not found");
        continue;
    }
    console.log("  Slot:", tx.slot);
    console.log("  Error:", tx.meta?.err);
    console.log("  Account keys:");
    for (const key of tx.transaction.message.accountKeys) {
        console.log("    -", key.pubkey.toBase58(), key.signer ? "(signer)" : "", key.writable ? "(writable)" : "");
    }
    console.log("  Log messages:");
    for (const log of tx.meta?.logMessages || []) {
        console.log("    ", log);
    }
}
