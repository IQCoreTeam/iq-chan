import { test, expect } from "bun:test";
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getJupiterOrder, executeJupiterOrder, checkSwapStatus, SwapExecutionError, SOL_MINT } from "../src/lib/chains/solana/swap";

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
            return Response.json({ status: "Success", signature: "4".repeat(88) });
        }) as unknown as typeof fetch;
        const changed = VersionedTransaction.deserialize(tx.serialize());
        changed.message.recentBlockhash = Keypair.generate().publicKey.toBase58();
        await expect(executeJupiterOrder(order, changed)).rejects.toThrow("changed");
        expect(calls).toBe(0);
        expect(await executeJupiterOrder(order, tx)).toBe("4".repeat(88));
        globalThis.fetch = (async () =>
            Response.json({ status: "Failed", code: -2003, error: "expired" })) as unknown as typeof fetch;
        await expect(executeJupiterOrder(order, tx)).rejects.toThrow("expired");
        globalThis.fetch = (async () => new Response("", { status: 503 })) as unknown as typeof fetch;
        await expect(executeJupiterOrder(order, tx)).rejects.toThrow("Confirmation unavailable");
    } finally {
        globalThis.fetch = original;
    }
});


test("optional referral charges exactly 125 bps and rejects silent fee fallback", async () => {
    const original = globalThis.fetch;
    const previous = process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT;
    const referral = Keypair.generate().publicKey.toBase58();
    let requested = "";
    let result = { ...order, referralAccount: referral, feeBps: 125 };
    globalThis.fetch = (async (url: string) => {
        requested = url;
        return Response.json(result);
    }) as unknown as typeof fetch;
    try {
        process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT = referral;
        expect((await getJupiterOrder(params)).feeBps).toBe(125);
        expect(new URL(requested).searchParams.get("referralFee")).toBe("125");
        expect(new URL(requested).searchParams.get("referralAccount")).toBe(referral);
        result = { ...result, feeBps: 10 };
        await expect(getJupiterOrder(params)).rejects.toThrow("Referral fee is unavailable");
        result = { ...result, feeBps: 126 };
        await expect(getJupiterOrder(params)).rejects.toThrow("Referral fee is unavailable");
        result = { ...result, feeBps: 125, referralAccount: wallet.publicKey.toBase58() };
        await expect(getJupiterOrder(params)).rejects.toThrow("Referral fee is unavailable");
        delete process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT;
        result = { ...order, referralAccount: "", feeBps: 0 };
        expect((await getJupiterOrder(params)).feeBps).toBe(0);
        expect(new URL(requested).searchParams.has("referralFee")).toBe(false);
    } finally {
        globalThis.fetch = original;
        if (previous === undefined) delete process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT;
        else process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT = previous;
    }
});


test("timeouts preserve the signed receipt; status checks never execute again", async () => {
    const original = globalThis.fetch;
    const signed = VersionedTransaction.deserialize(tx.serialize());
    signed.sign([wallet]);
    let calls = 0;
    globalThis.fetch = (async () => { calls++; throw new Error("timeout"); }) as unknown as typeof fetch;
    try {
        let failure: SwapExecutionError | undefined;
        try { await executeJupiterOrder(order, signed); } catch (e) { failure = e as SwapExecutionError; }
        expect(failure?.uncertain).toBe(true);
        expect(failure?.signature?.length).toBeGreaterThan(63);
        for (const [status, expected] of [
            [null, "unknown"],
            [{ err: null, confirmationStatus: "processed" }, "unknown"],
            [{ err: null, confirmationStatus: "finalized" }, "confirmed"],
            [{ err: { InstructionError: [0, "Custom"] }, confirmationStatus: "confirmed" }, "failed"],
        ] as const) {
            const connection = { getSignatureStatuses: async (s: string[], opts: unknown) => {
                expect(s).toEqual([failure!.signature!]);
                expect(opts).toEqual({ searchTransactionHistory: true });
                return { value: [status] };
            } };
            expect(await checkSwapStatus(connection as any, failure!.signature!)).toBe(expected);
        }
        expect(calls).toBe(1);
    } finally { globalThis.fetch = original; }
});

test("Jupiter rejection is distinct from ambiguous errors and malformed responses", async () => {
    const original = globalThis.fetch;
    try {
        for (const [body, uncertain] of [
            [{ status: "Failed", code: -2003, error: "Quote expired" }, false],
            [{ status: "Failed", code: -1003, error: "Transaction not fully signed" }, false],
            [{ status: "Failed", code: -1001, error: "Unknown error" }, true],
            [null, true],
        ] as const) {
            globalThis.fetch = (async () => Response.json(body)) as unknown as typeof fetch;
            try { await executeJupiterOrder(order, tx); throw Error("Expected rejection"); }
            catch (e) { expect(e).toBeInstanceOf(SwapExecutionError); expect((e as SwapExecutionError).uncertain).toBe(uncertain); }
        }
    } finally { globalThis.fetch = original; }
});
