"use client";

// EVM writer. Uses ethereum-sdk's writeRow (which sends dbCodeIn +
// updateTableTxChainTail — 2 signatures, keeping the table readable by the
// stock SDK) with the injected wallet's signer.
//
//   createThread = createTable(thread) + writeRow(OP -> board table)  -> 3 sigs
//   postReply    = writeRow(reply -> thread table)                    -> 2 sigs
//
// No double-write: replies go only to the thread table. Which thread is "bumped"
// (feed order) is a gateway-derived view from DbCodeInEvent (issue #6), not an
// extra on-chain write. Edit/delete (manageRowData) is out of scope for v1.

import { useState, useCallback } from "react";
import { writer as evmWriter, setNetwork } from "@iqlabs-official/ethereum-sdk";
import { useEvmWallet } from "./wallet";
import { resolveNetwork } from "../resolve";
import { getGatewayUrl } from "../../config";
import { notifyGateway } from "../../notify-gateway";
import { gwFetch } from "../../gateway";
import { DB_ROOT_ID, BOARD_COLUMNS, resolveBoardSeed } from "../../board-config";
import type { Writer } from "../context";

const enc = encodeURIComponent;

function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

export function useEvmWriter(): Writer {
    const net = resolveNetwork();
    const netParam = net.gatewayNetworkParam;
    const { address, connect, getSigner } = useEvmWallet();

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [step, setStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(0);
    const [error, setError] = useState<Error | null>(null);

    const query = useCallback((extra: Record<string, string> = {}) => {
        const q = new URLSearchParams(extra);
        if (netParam) q.set("network", netParam);
        return q.toString();
    }, [netParam]);

    const checkGate = useCallback(async (boardSeed: string, wallet: string) => {
        const res = await gwFetch(`/gate/${enc(DB_ROOT_ID)}/${enc(boardSeed)}/check/${enc(wallet)}?${query()}`);
        if (!res.ok) return; // table not registered/gated on the gateway yet — allow
        const d = await res.json();
        if (d.meetsGate === false) {
            throw new Error(d.gate ? "You are not a holder" : `Insufficient ${net.currency} balance`);
        }
    }, [query, net.currency]);

    const notify = useCallback(async (tableName: string, txHash: string, row: unknown, signer: string) => {
        return notifyGateway(`${getGatewayUrl()}/table/${enc(DB_ROOT_ID)}/${enc(tableName)}/notify?${query()}`, { txHash, row, signer });
    }, [query]);

    const createThread = useCallback(
        async (
            boardId: string,
            data: { sub: string; com: string; name: string; img?: string },
        ) => {
            if (!address) { await connect(); return; }
            setLoading(true);
            setTotalSteps(3);
            setStep(1);
            setStatus("Creating thread... sign 1/3");
            setError(null);

            try {
                const signer = await getSigner();
                setNetwork(net.sdkMode as Parameters<typeof setNetwork>[0], net.rpcUrl);

                const boardSeed = resolveBoardSeed(boardId);
                await checkGate(boardSeed, address);

                const threadName = `${boardSeed}-thread-${crypto.randomUUID()}`;
                await evmWriter.createTable(signer, DB_ROOT_ID, threadName, BOARD_COLUMNS, "time");

                setStep(2);
                setStatus("Writing post... approve 2 signatures");

                const row = {
                    sub: data.sub,
                    com: data.com,
                    name: data.name,
                    time: Math.floor(Date.now() / 1000),
                    ...(data.img ? { img: data.img } : {}),
                    threadPda: threadName,
                    threadSeed: threadName,
                };

                const txHash = await evmWriter.writeRow(signer, DB_ROOT_ID, boardSeed, JSON.stringify(row));

                await Promise.all([
                    notify(boardSeed, txHash, row, address),
                    notify(threadName, txHash, row, address),
                ]);
                return { ...row, __txSignature: txHash, __signer: address };
            } catch (e) {
                const err = new Error(errorMessage(e));
                setError(err);
                setStatus(`Error: ${err.message}`);
                throw err;
            } finally {
                setLoading(false);
                setStep(0);
                setTotalSteps(0);
            }
        },
        [address, connect, getSigner, net.sdkMode, net.rpcUrl, checkGate, notify],
    );

    const postReply = useCallback(
        async (
            threadSeed: string,
            threadPda: string,
            boardId: string,
            data: { com: string; name: string; img?: string; options?: string },
        ) => {
            if (!address) { await connect(); return; }
            setLoading(true);
            setTotalSteps(2);
            setStep(1);
            setStatus("Posting reply... approve 2 signatures");
            setError(null);

            try {
                const signer = await getSigner();
                setNetwork(net.sdkMode as Parameters<typeof setNetwork>[0], net.rpcUrl);

                await checkGate(resolveBoardSeed(boardId), address);

                // On EVM threadPda and threadSeed are both the thread table name.
                const threadName = threadPda || threadSeed;
                const row = {
                    sub: "",
                    com: data.com,
                    name: data.name,
                    time: Math.floor(Date.now() / 1000),
                    ...(data.img ? { img: data.img } : {}),
                    threadPda: threadName,
                    threadSeed: threadName,
                };

                const txHash = await evmWriter.writeRow(signer, DB_ROOT_ID, threadName, JSON.stringify(row));

                await notify(threadName, txHash, row, address);
                return { ...row, __txSignature: txHash, __signer: address };
            } catch (e) {
                const err = new Error(errorMessage(e));
                setError(err);
                setStatus(`Error: ${err.message}`);
                throw err;
            } finally {
                setLoading(false);
                setStep(0);
                setTotalSteps(0);
            }
        },
        [address, connect, getSigner, net.sdkMode, net.rpcUrl, checkGate, notify],
    );

    const notSupported = useCallback(async () => {
        throw new Error("Editing is not supported on this chain yet");
    }, []);

    const clearStatus = useCallback(() => { setStatus(""); setError(null); }, []);

    return {
        createThread,
        postReply,
        editPost: notSupported,
        deletePost: notSupported,
        loading,
        status,
        step,
        totalSteps,
        error,
        clearStatus,
    };
}
