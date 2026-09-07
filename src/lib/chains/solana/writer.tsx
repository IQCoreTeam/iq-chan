"use client";

// Solana writer. This is the write path that used to live in hooks/use-post.ts,
// moved behind the chain boundary unchanged (2-tx thread create, 1-tx reply with
// feed-PDA bump, soft edit/delete via the instruction table). SolanaProviders
// exposes its return through WriterContext, so usePost() consumers are untouched.

import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
// @ts-ignore — bn.js lacks type declarations
import BN from "bn.js";
import iqlabs from "iqlabs-sdk";
import {
    DB_ROOT_ID_BYTES,
    BUMP_LIMIT,
    threadTableSeed,
    deriveTablePda,
    deriveInstructionTablePda,
    DB_ROOT_KEY,
    BOARD_COLUMNS,
    resolveBoardSeed,
} from "../../constants";
import { getFeedPda } from "../../board";
import { notifyPost, checkGateFor } from "../../gateway";
import { useWalletModal } from "../../wallet-modal";
import type { Writer } from "../context";

function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

export function useSolanaWriter(): Writer {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { openWalletModal } = useWalletModal();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [step, setStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(0);
    const [error, setError] = useState<Error | null>(null);

    const checkGate = useCallback(async (boardPda: string) => {
        if (!wallet.publicKey) { openWalletModal(); throw new Error("Wallet not connected"); }
        const result = await checkGateFor(boardPda, wallet.publicKey.toBase58());
        if (!result.meetsGate) {
            throw new Error(result.sol < result.minSol ? "Insufficient SOL balance" : "You are not a holder");
        }
    }, [wallet.publicKey, openWalletModal]);

    // ─── Create Thread (2 TXs: create thread ext table + write OP row to board table) ──

    const createThread = useCallback(
        async (
            boardId: string,
            data: { sub: string; com: string; name: string; img?: string },
            gate?: { mint: string; amount: number; gateType: number },
        ) => {
            if (!wallet.publicKey || !wallet.signTransaction) {
                openWalletModal(); return;
            }
            setLoading(true);
            setTotalSteps(2);
            setStep(1);
            setStatus("Posting... sign 1/2");
            setError(null);

            try {
                const boardPda = deriveTablePda(resolveBoardSeed(boardId));
                await checkGate(boardPda);

                const randomId = crypto.randomUUID();
                const seed = threadTableSeed(resolveBoardSeed(boardId), randomId);
                const threadPda = deriveTablePda(seed);
                const dbRootKey = DB_ROOT_KEY;
                const feedPda = getFeedPda(dbRootKey, resolveBoardSeed(boardId));

                const tablePda = new PublicKey(threadPda);
                const instrPda = new PublicKey(deriveInstructionTablePda(seed));

                const builder = iqlabs.contract.createInstructionBuilder();
                const dbRootIdBytes = DB_ROOT_ID_BYTES;
                const threadSeedBytes = Buffer.from(iqlabs.utils.toSeedBytes(seed));
                const boardSeedBytes = Buffer.from(iqlabs.utils.toSeedBytes(boardId));

                const dbRootInfo = await connection.getAccountInfo(dbRootKey);

                const tx1 = new Transaction();

                if (!dbRootInfo) {
                    tx1.add(
                        iqlabs.contract.initializeDbRootInstruction(
                            builder,
                            {
                                db_root: dbRootKey,
                                signer: wallet.publicKey,
                                system_program: SystemProgram.programId,
                            },
                            { db_root_id: dbRootIdBytes },
                        ),
                    );
                }

                tx1.add(
                    iqlabs.contract.createExtTableInstruction(
                        builder,
                        {
                            signer: wallet.publicKey,
                            db_root: dbRootKey,
                            table: tablePda,
                            instruction_table: instrPda,
                            system_program: SystemProgram.programId,
                        },
                        {
                            db_root_id: dbRootIdBytes,
                            table_seed: threadSeedBytes,
                            table_hint: Buffer.from(seed),
                            table_name: Buffer.from(seed),
                            column_names: BOARD_COLUMNS.map((c) => Buffer.from(c)),
                            id_col: Buffer.from("time"),
                            ext_keys: [],
                            gate_opt: gate ? {
                                mint: new PublicKey(gate.mint),
                                amount: new BN(gate.amount),
                                gate_type: gate.gateType,
                            } : null,
                            writers_opt: null,
                        },
                    ),
                );

                tx1.feePayer = wallet.publicKey;
                tx1.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

                const sim = await connection.simulateTransaction(tx1);
                if (sim.value.err) {
                    const logs = sim.value.logs ?? [];
                    console.error("[blockchan] simulation logs:", logs);
                    const logsStr = logs.join("\n");
                    let msg: string;
                    if (logsStr.includes("insufficient") || logsStr.includes("lamports")) {
                        msg = "Insufficient SOL balance";
                    } else if (logsStr.includes("already in use")) {
                        msg = "Account already exists — please try again";
                    } else {
                        msg = logs.find(l => l.includes("Error"))
                            ?? `Transaction failed (${JSON.stringify(sim.value.err)})`;
                    }
                    throw new Error(msg);
                }

                const signed1 = await wallet.signTransaction(tx1);
                const tx1Sig = await connection.sendRawTransaction(signed1.serialize());
                await connection.confirmTransaction(tx1Sig, "confirmed");

                setStep(2);
                setStatus("Posting... sign 2/2");

                const row = {
                    sub: data.sub,
                    com: data.com,
                    name: data.name,
                    time: Math.floor(Date.now() / 1000),
                    ...(data.img ? { img: data.img } : {}),
                    threadPda,
                    threadSeed: seed,
                };

                const txSig = await iqlabs.writer.writeRow(
                    connection,
                    wallet as any,
                    dbRootIdBytes,
                    boardSeedBytes,
                    JSON.stringify(row),
                    false,
                    [feedPda],
                );

                const signer = wallet.publicKey.toBase58();
                await Promise.all([
                    notifyPost(boardPda, txSig, row, signer),
                    notifyPost(feedPda.toBase58(), txSig, row, signer),
                    notifyPost(threadPda, txSig, row, signer),
                ]);
                return { ...row, __txSignature: txSig, __signer: signer };
            } catch (e) {
                const msg = errorMessage(e);
                const err = new Error(msg);
                setError(err);
                setStatus(`Error: ${msg}`);
                throw err;
            } finally {
                setLoading(false);
                setStep(0);
                setTotalSteps(0);
            }
        },
        [connection, wallet],
    );

    // ─── Post Reply (1 TX: write reply row to thread table) ─────────────────

    const postReply = useCallback(
        async (
            threadSeed: string,
            threadPda: string,
            boardId: string,
            data: { com: string; name: string; img?: string; options?: string },
            replyCount = 0,
        ) => {
            if (!wallet.publicKey) { openWalletModal(); return; }
            setLoading(true);
            setTotalSteps(1);
            setStep(1);
            setStatus("Posting reply... 1 signature needed");
            setError(null);

            try {
                await checkGate(deriveTablePda(resolveBoardSeed(boardId)));

                const dbRootIdBytes = DB_ROOT_ID_BYTES;
                const seedBytes = Buffer.from(iqlabs.utils.toSeedBytes(threadSeed));

                const isSage = data.options === "sage";
                const overBumpLimit = replyCount >= BUMP_LIMIT;
                const shouldBump = !isSage && !overBumpLimit;

                const remaining = shouldBump
                    ? [getFeedPda(DB_ROOT_KEY, resolveBoardSeed(boardId))]
                    : [];

                const row = {
                    sub: "",
                    com: data.com,
                    name: data.name,
                    time: Math.floor(Date.now() / 1000),
                    ...(data.img ? { img: data.img } : {}),
                    threadPda,
                    threadSeed,
                };

                const txSig = await iqlabs.writer.writeRow(
                    connection,
                    wallet as any,
                    dbRootIdBytes,
                    seedBytes,
                    JSON.stringify(row),
                    false,
                    remaining,
                );

                const signer = wallet.publicKey.toBase58();
                const notifyTargets = [notifyPost(threadPda, txSig, row, signer)];
                if (shouldBump) {
                    const feedPda = getFeedPda(DB_ROOT_KEY, resolveBoardSeed(boardId));
                    notifyTargets.push(notifyPost(feedPda.toBase58(), txSig, row, signer));
                }
                await Promise.all(notifyTargets);
                return { ...row, __txSignature: txSig, __signer: signer };
            } catch (e) {
                const msg = errorMessage(e);
                const err = new Error(msg);
                setError(err);
                setStatus(`Error: ${msg}`);
                throw err;
            } finally {
                setLoading(false);
                setStep(0);
                setTotalSteps(0);
            }
        },
        [connection, wallet],
    );

    // ─── Edit / Delete (1 TX each, soft markers in the instruction table) ────
    // NOTE: not wired to any UI yet; the read side already merges them (parse.ts).

    const editPost = useCallback(
        async (threadSeed: string, targetTxSig: string, newCom: string) => {
            if (!wallet.publicKey) { openWalletModal(); return; }
            setLoading(true);
            setError(null);
            try {
                const dbRootIdBytes = DB_ROOT_ID_BYTES;
                const seedBytes = Buffer.from(iqlabs.utils.toSeedBytes(threadSeed));
                await iqlabs.writer.manageRowData(
                    connection,
                    wallet as any,
                    dbRootIdBytes,
                    seedBytes,
                    JSON.stringify({ target: targetTxSig, com: newCom }),
                    threadSeed,
                    targetTxSig,
                );
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                setError(err);
                setStatus(`Error: ${err.message}`);
                throw err;
            } finally {
                setLoading(false);
                setStep(0);
                setTotalSteps(0);
            }
        },
        [connection, wallet],
    );

    const deletePost = useCallback(
        async (threadSeed: string, targetTxSig: string) => {
            if (!wallet.publicKey) { openWalletModal(); return; }
            setLoading(true);
            setError(null);
            try {
                const dbRootIdBytes = DB_ROOT_ID_BYTES;
                const seedBytes = Buffer.from(iqlabs.utils.toSeedBytes(threadSeed));
                await iqlabs.writer.manageRowData(
                    connection,
                    wallet as any,
                    dbRootIdBytes,
                    seedBytes,
                    "{}",
                    threadSeed,
                    targetTxSig,
                );
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                setError(err);
                setStatus(`Error: ${err.message}`);
                throw err;
            } finally {
                setLoading(false);
                setStep(0);
                setTotalSteps(0);
            }
        },
        [connection, wallet],
    );

    const clearStatus = useCallback(() => { setStatus(""); setError(null); }, []);

    return { createThread, postReply, editPost, deletePost, loading, status, step, totalSteps, error, clearStatus };
}
