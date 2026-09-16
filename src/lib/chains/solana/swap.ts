import { VersionedTransaction } from "@solana/web3.js";

export const SOL_MINT = "So11111111111111111111111111111111111111112";

export type JupiterOrder = {
    transaction: string;
    requestId: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    otherAmountThreshold: string;
    slippageBps: number;
    feeBps: number;
    signatureFeeLamports: number;
    prioritizationFeeLamports: number;
    rentFeeLamports: number;
};

export async function getJupiterOrder(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    taker: string;
}): Promise<JupiterOrder> {
    const response = await fetch(`https://api.jup.ag/swap/v2/order?${new URLSearchParams(params)}`, {
        signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
        throw new Error(
            response.status === 429
                ? "Jupiter is busy. Wait a moment and try again."
                : `Jupiter quote failed (${response.status})`,
        );
    const order = await response.json();
    if (
        typeof order.transaction !== "string" ||
        !order.transaction ||
        typeof order.requestId !== "string" ||
        !order.requestId
    )
        throw new Error(order.errorMessage || "No swap route available");
    if (
        order.inputMint !== params.inputMint ||
        order.outputMint !== params.outputMint ||
        order.inAmount !== params.amount ||
        !/^\d+$/.test(order.outAmount) ||
        BigInt(order.outAmount) <= BigInt(0) ||
        !/^\d+$/.test(order.otherAmountThreshold) ||
        BigInt(order.otherAmountThreshold) <= BigInt(0) ||
        BigInt(order.otherAmountThreshold) > BigInt(order.outAmount) ||
        order.slippageBps > 10000 ||
        order.feeBps > 10000 ||
        ![
            order.slippageBps,
            order.feeBps,
            order.signatureFeeLamports,
            order.prioritizationFeeLamports,
            order.rentFeeLamports,
        ].every((n) => Number.isSafeInteger(n) && n >= 0)
    ) {
        throw new Error("Jupiter returned an invalid quote");
    }
    const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, "base64"));
    if (
        !tx.message.staticAccountKeys
            .slice(0, tx.message.header.numRequiredSignatures)
            .some((key) => key.toBase58() === params.taker)
    ) {
        throw new Error("Quote does not match the connected wallet");
    }
    return order;
}

export async function executeJupiterOrder(order: JupiterOrder, signed: VersionedTransaction): Promise<string> {
    const original = VersionedTransaction.deserialize(Buffer.from(order.transaction, "base64"));
    if (!Buffer.from(original.message.serialize()).equals(Buffer.from(signed.message.serialize())))
        throw new Error("Wallet changed the swap transaction");
    const response = await fetch("https://api.jup.ag/swap/v2/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            signedTransaction: Buffer.from(signed.serialize()).toString("base64"),
            requestId: order.requestId,
        }),
        signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error("Swap status is unknown. Check your wallet before retrying.");
    const result = await response.json();
    if (result.status !== "Success" || typeof result.signature !== "string")
        throw new Error(result.error || "Swap was not confirmed. Check your wallet before retrying.");
    return result.signature;
}
