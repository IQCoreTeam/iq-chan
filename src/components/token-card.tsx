"use client";

// FOMO-style token card for the Tranches board: a CA in a post renders its
// DexScreener chart plus one-tap Buy/Sell that swap through the connected
// wallet on Robinhood Chain (Uniswap V3). Only mounted on EVM networks.
import { useEffect, useMemo, useState } from "react";
import { JsonRpcProvider, formatUnits } from "ethers";
import { resolveNetwork } from "../lib/chains/resolve";
import { dexScreenerEmbed } from "../lib/dexscreener";
import { useEvmWallet } from "../lib/chains/evm/wallet";
import {
    buyToken,
    sellToken,
    getTokenInfo,
    getTokenBalance,
    findFeeTier,
    type TokenInfo,
} from "../lib/chains/evm/swap";

const BUY_PRESETS = ["0.01", "0.05", "0.1"]; // ETH
const SELL_PRESETS = [25, 50, 100]; // %

export default function TokenCard({ ca }: { ca: string }) {
    const net = resolveNetwork();
    const accent = net.theme.accent || "#00c805";
    const { address, connect, getSigner } = useEvmWallet();
    const reader = useMemo(
        () => new JsonRpcProvider(net.rpcUrl, net.chainId ? { chainId: net.chainId, name: net.id } : undefined),
        [net.rpcUrl, net.chainId, net.id],
    );

    const [info, setInfo] = useState<TokenInfo | null>(null);
    const [tradable, setTradable] = useState<boolean | null>(null);
    const [balance, setBalance] = useState<string>("0");
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ kind: "ok" | "err" | "pending"; text: string; hash?: string } | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [i, fee] = await Promise.all([getTokenInfo(reader, ca), findFeeTier(reader, ca)]);
                if (!alive) return;
                setInfo(i);
                setTradable(fee != null);
            } catch {
                if (alive) setTradable(false);
            }
        })();
        return () => { alive = false; };
    }, [reader, ca]);

    const refreshBalance = async () => {
        if (!address) return;
        try {
            const b = await getTokenBalance(reader, ca, address);
            setBalance(b.text);
        } catch { /* ignore */ }
    };
    useEffect(() => { refreshBalance(); /* eslint-disable-next-line */ }, [address, reader, ca]);

    const run = async (label: string, fn: () => Promise<string>) => {
        if (busy) return;
        setBusy(true);
        setStatus({ kind: "pending", text: `${label}…` });
        try {
            const hash = await fn();
            setStatus({ kind: "ok", text: `${label} sent`, hash });
            setTimeout(refreshBalance, 4000);
        } catch (e: unknown) {
            const msg = e instanceof Error ? (e.message.length > 120 ? e.message.slice(0, 120) + "…" : e.message) : String(e);
            setStatus({ kind: "err", text: msg });
        } finally {
            setBusy(false);
        }
    };

    const onBuy = (eth: string) => run(`Buy ${eth} ETH`, async () => buyToken(await getSigner(), ca, eth));
    const onSell = (pct: number) =>
        run(`Sell ${pct}%`, async () => {
            const b = await getTokenBalance(reader, ca, address!);
            const amount = (b.raw * BigInt(pct)) / BigInt(100);
            if (amount <= BigInt(0)) throw new Error("No token balance");
            return sellToken(await getSigner(), ca, formatUnits(amount, b.info.decimals));
        });

    const box: React.CSSProperties = {
        border: `1px solid ${accent}`, borderRadius: 6, margin: "8px 0", maxWidth: 480,
        background: "rgba(0,0,0,0.15)", overflow: "hidden", fontSize: 13,
    };
    const btn = (bg: string): React.CSSProperties => ({
        flex: 1, padding: "7px 0", border: "none", borderRadius: 4, cursor: busy ? "default" : "pointer",
        background: bg, color: "#fff", fontWeight: 700, opacity: busy ? 0.6 : 1,
    });

    if (tradable === false) return null; // not a tradable token on this chain — render nothing

    return (
        <div style={box}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: accent, color: "#fff", fontWeight: 700 }}>
                <span>{info ? `$${info.symbol}` : "Loading token…"}</span>
                <a href={`${net.explorerTxUrl.replace(/\/tx\/$/, "/token/")}${ca}`} target="_blank" rel="noreferrer" style={{ color: "#fff", fontWeight: 400, fontSize: 11 }}>
                    {ca.slice(0, 6)}…{ca.slice(-4)}
                </a>
            </div>

            <iframe title="chart" src={dexScreenerEmbed("robinhood", ca)} style={{ width: "100%", height: 260, border: "none", display: "block" }} loading="lazy" />

            <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {!address ? (
                    <button style={btn(accent)} onClick={() => connect()}>Connect wallet to trade</button>
                ) : (
                    <>
                        <div style={{ display: "flex", gap: 6 }}>
                            {BUY_PRESETS.map((eth) => (
                                <button key={eth} style={btn(accent)} disabled={busy} onClick={() => onBuy(eth)}>Buy {eth}</button>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                            {SELL_PRESETS.map((pct) => (
                                <button key={pct} style={btn("#c0392b")} disabled={busy} onClick={() => onSell(pct)}>Sell {pct}%</button>
                            ))}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>Balance: {Number(balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} {info?.symbol ?? ""}</div>
                    </>
                )}

                {status && (
                    <div style={{ fontSize: 11, color: status.kind === "err" ? "#e74c3c" : status.kind === "ok" ? accent : "inherit" }}>
                        {status.text}
                        {status.hash && (
                            <> · <a href={`${net.explorerTxUrl}${status.hash}`} target="_blank" rel="noreferrer" style={{ color: accent }}>view tx</a></>
                        )}
                    </div>
                )}
                <div style={{ fontSize: 10, opacity: 0.5 }}>Swaps route through Uniswap V3 on {net.theme.chainLabel}. 3% slippage. Trade at your own risk.</div>
            </div>
        </div>
    );
}
