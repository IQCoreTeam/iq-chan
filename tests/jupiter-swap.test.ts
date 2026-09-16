import { test, expect } from "bun:test";
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getJupiterOrder, executeJupiterOrder, SOL_MINT } from "../src/lib/chains/solana/swap";

// Local fixtures only. No connection or transaction broadcast occurs.
const wallet = Keypair.generate();
const outputMint = Keypair.generate().publicKey.toBase58();
const tx = new VersionedTransaction(
    new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: Keypair.generate().publicKey.toBase58(),
        instructions: [
            SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: wallet.publicKey, lamports: 1 }),
        ],
    }).compileToV0Message(),
);
const params = { inputMint: SOL_MINT, outputMint, amount: "100", taker: wallet.publicKey.toBase58() };
const order = {
    transaction: Buffer.from(tx.serialize()).toString("base64"),
    requestId: "local",
    inputMint: SOL_MINT,
    outputMint,
    inAmount: "100",
    outAmount: "90",
    otherAmountThreshold: "89",
    slippageBps: 100,
    feeBps: 0,
    signatureFeeLamports: 5000,
    prioritizationFeeLamports: 0,
    rentFeeLamports: 0,
};

test("Jupiter orders reject mismatched tokens, amounts, wallets and zero minimums", async () => {
    const original = globalThis.fetch;
    try {
        for (const patch of [
            {},
            { inputMint: outputMint },
            { inAmount: "999" },
            { otherAmountThreshold: "0" },
            { outAmount: "no" },
            { transaction: "" },
            { feeBps: undefined },
        ]) {
            globalThis.fetch = (async () => Response.json({ ...order, ...patch })) as unknown as typeof fetch;
            if (Object.keys(patch).length) await expect(getJupiterOrder(params)).rejects.toThrow();
            else expect((await getJupiterOrder(params)).outAmount).toBe("90");
        }
        globalThis.fetch = (async () => Response.json(order)) as unknown as typeof fetch;
        await expect(getJupiterOrder({ ...params, taker: Keypair.generate().publicKey.toBase58() })).rejects.toThrow(
            "wallet",
        );
        globalThis.fetch = (async () => new Response("", { status: 429 })) as unknown as typeof fetch;
        await expect(getJupiterOrder(params)).rejects.toThrow("busy");
    } finally {
        globalThis.fetch = original;
    }
});

test("execution requires the reviewed message and a confirmed success response", async () => {
    const original = globalThis.fetch;
    let calls = 0;
    try {
        globalThis.fetch = (async () => {
            calls++;
            return Response.json({ status: "Success", signature: "local-signature" });
        }) as unknown as typeof fetch;
        const changed = VersionedTransaction.deserialize(tx.serialize());
        changed.message.recentBlockhash = Keypair.generate().publicKey.toBase58();
        await expect(executeJupiterOrder(order, changed)).rejects.toThrow("changed");
        expect(calls).toBe(0);
        expect(await executeJupiterOrder(order, tx)).toBe("local-signature");
        globalThis.fetch = (async () =>
            Response.json({ status: "Failed", error: "expired" })) as unknown as typeof fetch;
        await expect(executeJupiterOrder(order, tx)).rejects.toThrow("expired");
        globalThis.fetch = (async () => new Response("", { status: 503 })) as unknown as typeof fetch;
        await expect(executeJupiterOrder(order, tx)).rejects.toThrow("unknown");
    } finally {
        globalThis.fetch = original;
    }
});
