"use client";

import { useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { formatUnits, parseUnits } from "ethers";
import { useWalletModal } from "../lib/wallet-modal";
import { executeJupiterOrder, getJupiterOrder, SOL_MINT, type JupiterOrder } from "../lib/chains/solana/swap";

export default function SolanaTrade({ mint, symbol }: { mint: string; symbol: string }) {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { openWalletModal } = useWalletModal();
    const address = wallet.publicKey?.toBase58();
    const currentAddress = useRef(address);
    currentAddress.current = address;
    const operation = useRef(0);
    const [balance, setBalance] = useState<{ raw: bigint; decimals: number } | null>(null);
    const [quote, setQuote] = useState<{
        order: JupiterOrder;
        expires: number;
        address: string;
        buy: boolean;
        decimals: number;
    } | null>(null);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");
    const [signature, setSignature] = useState("");
    const [balanceRefresh, setBalanceRefresh] = useState(0);
    const [balanceUnavailable, setBalanceUnavailable] = useState(false);

    useEffect(() => {
        operation.current++;
        setQuote(null);
        setBusy(false);
        setStatus("");
        setSignature("");
        return () => {
            operation.current++;
        };
    }, [address, mint]);

    useEffect(() => {
        const controller = { cancelled: false };
        setBalance(null);
        setBalanceUnavailable(false);
        if (address)
            connection
                .getParsedTokenAccountsByOwner(new PublicKey(address), { mint: new PublicKey(mint) })
                .then(({ value }) => {
                    if (controller.cancelled) return;
                    const amounts = value.map((account) => account.account.data.parsed.info.tokenAmount);
                    setBalance({
                        raw: amounts.reduce((sum, amount) => sum + BigInt(amount.amount), BigInt(0)),
                        decimals: amounts[0]?.decimals ?? 0,
                    });
                })
                .catch(() => {
                    if (!controller.cancelled) setBalanceUnavailable(true);
                });
        return () => {
            controller.cancelled = true;
        };
    }, [address, mint, connection, balanceRefresh]);

    useEffect(() => {
        if (!quote) return;
        const timer = setTimeout(
            () => {
                setQuote(null);
                setStatus("Quote expired. Request a new quote.");
            },
            Math.max(0, quote.expires - Date.now()),
        );
        return () => clearTimeout(timer);
    }, [quote]);

    async function getQuote(buy: boolean, amount: string) {
        if (!address || busy) return;
        const id = ++operation.current;
        setBusy(true);
        setQuote(null);
        setStatus("");
        try {
            const decimals = buy
                ? (await connection.getTokenSupply(new PublicKey(mint))).value.decimals
                : balance!.decimals;
            const order = await getJupiterOrder({
                inputMint: buy ? SOL_MINT : mint,
                outputMint: buy ? mint : SOL_MINT,
                amount,
                taker: address,
            });
            if (id === operation.current) setQuote({ order, expires: Date.now() + 30000, address, buy, decimals });
        } catch (e) {
            if (id === operation.current) setStatus(e instanceof Error ? e.message : "Quote failed");
        } finally {
            if (id === operation.current) setBusy(false);
        }
    }

    async function confirm() {
        if (!quote || busy || !wallet.signTransaction) return;
        if (quote.address !== currentAddress.current || Date.now() >= quote.expires) {
            setQuote(null);
            setStatus("Quote expired or wallet changed. Request a new quote.");
            return;
        }
        const id = ++operation.current;
        setBusy(true);
        setStatus("");
        setQuote(null);
        let submitted = false;
        try {
            const signed = await wallet.signTransaction(
                VersionedTransaction.deserialize(Buffer.from(quote.order.transaction, "base64")),
            );
            if (id !== operation.current || currentAddress.current !== quote.address) return;
            if (Date.now() >= quote.expires)
                throw new Error("Quote expired while awaiting approval. Request a new quote.");
            submitted = true;
            const sig = await executeJupiterOrder(quote.order, signed);
            if (id === operation.current) {
                setSignature(sig);
                setStatus("Swap confirmed.");
                setBalanceRefresh((n) => n + 1);
            }
        } catch (e) {
            if (id === operation.current)
                setStatus(
                    submitted
                        ? "Swap status is uncertain. Check your wallet before retrying."
                        : e instanceof Error
                          ? e.message
                          : "Swap cancelled",
                );
        } finally {
            if (id === operation.current) setBusy(false);
        }
    }

    const button = {
        flex: 1,
        padding: "7px 0",
        border: "1px solid var(--edge)",
        borderRadius: 4,
        cursor: "pointer",
        background: "var(--accent-dark)",
        color: "white",
        fontWeight: 700,
    };
    return (
        <div
            className="solana-trade"
            style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}
        >
            {!address ? (
                <button style={button} onClick={openWalletModal}>
                    Connect wallet to trade
                </button>
            ) : (
                <>
                    <div style={{ display: "flex", gap: 6 }}>
                        {["0.1", "0.5", "1"].map((amount) => (
                            <button
                                key={amount}
                                style={button}
                                disabled={busy}
                                onClick={() => getQuote(true, parseUnits(amount, 9).toString())}
                            >
                                Buy {amount} SOL
                            </button>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        {[25, 50, 100].map((percent) => (
                            <button
                                key={percent}
                                style={button}
                                disabled={
                                    busy || !balance || (balance.raw * BigInt(percent)) / BigInt(100) <= BigInt(0)
                                }
                                onClick={() =>
                                    getQuote(false, ((balance!.raw * BigInt(percent)) / BigInt(100)).toString())
                                }
                            >
                                Sell {percent}%
                            </button>
                        ))}
                    </div>
                    <div>
                        Balance:{" "}
                        {balance
                            ? formatUnits(balance.raw, balance.decimals)
                            : balanceUnavailable
                              ? "Unavailable"
                              : "Loading…"}{" "}
                        {symbol}{" "}
                        {balanceUnavailable && (
                            <button onClick={() => setBalanceRefresh((n) => n + 1)}>Retry balance</button>
                        )}
                    </div>
                </>
            )}
            {busy && <div role="status">{quote ? "Preparing swap…" : "Waiting for Jupiter or wallet…"}</div>}
            {quote && (
                <div>
                    <div>
                        Pay {formatUnits(quote.order.inAmount, quote.buy ? 9 : quote.decimals)}{" "}
                        {quote.buy ? "SOL" : symbol}
                    </div>
                    <div>
                        Receive ≈ {formatUnits(quote.order.outAmount, quote.buy ? quote.decimals : 9)}{" "}
                        {quote.buy ? symbol : "SOL"}
                    </div>
                    <div>
                        Minimum: {formatUnits(quote.order.otherAmountThreshold, quote.buy ? quote.decimals : 9)}{" "}
                        {quote.buy ? symbol : "SOL"}
                    </div>
                    <div>
                        Slippage: {quote.order.slippageBps / 100}% · Jupiter fee: {quote.order.feeBps / 100}%
                    </div>
                    <div>
                        Network fee + rent:{" "}
                        {formatUnits(
                            BigInt(
                                quote.order.signatureFeeLamports +
                                    quote.order.prioritizationFeeLamports +
                                    quote.order.rentFeeLamports,
                            ),
                            9,
                        )}{" "}
                        SOL
                    </div>
                    <button disabled={busy || !wallet.signTransaction} onClick={confirm}>
                        Confirm in wallet
                    </button>{" "}
                    <button onClick={() => setQuote(null)}>Cancel</button>
                </div>
            )}
            {status && <div role="status">{status}</div>}
            {signature && (
                <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">
                    View confirmed swap
                </a>
            )}
            <div>Swaps route through Jupiter. Review the quote before signing.</div>
        </div>
    );
}
