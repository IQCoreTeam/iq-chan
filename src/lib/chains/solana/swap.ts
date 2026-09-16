import { encodeBase58 } from "ethers";
import { type Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

export const SOL_MINT = "So11111111111111111111111111111111111111112";

export type JupiterOrder = {
    transaction: string;
    requestId: string;
    lastValidBlockHeight?: string;
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
    const query = new URLSearchParams(params);
    const referralAccount = process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT;
    if (referralAccount) {
        query.set("referralAccount", new PublicKey(referralAccount).toBase58());
        query.set("referralFee", "125");
    }
    const response = await fetch(`https://api.jup.ag/swap/v2/order?${query}`, {
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
    if (referralAccount && (order.referralAccount !== referralAccount || order.feeBps !== 125))
        throw new Error("Referral fee is unavailable. Please try again later.");
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

export class SwapExecutionError extends Error {
    constructor(message: string, public readonly uncertain: boolean, public readonly signature?: string) {
        super(message);
        this.name = "SwapExecutionError";
    }
}

// Read only: never re-submit a transaction while resolving an ambiguous response.
export async function checkSwapStatus(connection: Pick<Connection, "getSignatureStatuses">, signature: string) {
    const { value } = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
    const status = value[0];
    if (!status) return "unknown";
    if (status.err) return "failed";
    return status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized"
        ? "confirmed" : "unknown";
}

export async function executeJupiterOrder(order: JupiterOrder, signed: VersionedTransaction): Promise<string> {
    const original = VersionedTransaction.deserialize(Buffer.from(order.transaction, "base64"));
    if (!Buffer.from(original.message.serialize()).equals(Buffer.from(signed.message.serialize())))
        throw new SwapExecutionError("Wallet changed the swap transaction. Nothing was submitted.", false);
    // The first signature identifies the transaction. A sponsored order may not have it yet.
    const first = signed.signatures[0];
    const signature = first?.some((byte) => byte !== 0) ? encodeBase58(first) : undefined;
    let response: Response;
    let result: { status?: string; signature?: string; code?: number; error?: string };
    try {
        response = await fetch("https://api.jup.ag/swap/v2/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                signedTransaction: Buffer.from(signed.serialize()).toString("base64"),
                requestId: order.requestId,
                ...(order.lastValidBlockHeight ? { lastValidBlockHeight: order.lastValidBlockHeight } : {}),
            }),
            signal: AbortSignal.timeout(30000),
        });
        result = await response.json();
    } catch {
        throw new SwapExecutionError("Confirmation unavailable. Check status before trading again.", true, signature);
    }
    const receipt = typeof result?.signature === "string" && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(result.signature)
        ? result.signature : signature;
    if (response.ok && result?.status === "Success" && receipt) return receipt;
    const detail = typeof result?.error === "string" ? result.error.slice(0, 240) : `HTTP ${response.status}`;
    // These documented codes reject execution before landing. Unknown/landing errors remain ambiguous.
    const rejected = result?.status === "Failed" && [-1, -2, -3, -1002, -1003, -1004, -2002, -2003, -2004].includes(result.code!);
    throw new SwapExecutionError(
        rejected ? `Swap rejected: ${detail}` : `Confirmation unavailable: ${detail}. Check status before trading again.`,
        !rejected,
        receipt,
    );
}
