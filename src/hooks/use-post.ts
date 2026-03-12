"use client";

import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import {
    DB_ROOT_ID,
    threadsTableSeed,
    repliesTableSeed,
    deriveTablePda,
    deriveInstructionTablePda,
    getDbRootKey,
} from "../lib/constants";
import { getFeedPda } from "../lib/board";

export function usePost() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // ─── Create Thread (2 TXs) ──────────────────────────────────────────────

    const createThread = useCallback(
        async (
            boardId: string,
            data: { sub: string; com: string; name: string; img?: string },
        ) => {
            if (!wallet.publicKey || !wallet.signTransaction)
                throw new Error("Wallet not connected");
            setLoading(true);
            setError(null);

            try {
                const threadNo = Date.now();
                const tSeed = threadsTableSeed(boardId);
                const rSeed = repliesTableSeed(boardId, threadNo);
                const dbRootKey = getDbRootKey();
                const feedPda = getFeedPda(dbRootKey, boardId);

                const tTablePda = new PublicKey(deriveTablePda(tSeed));
                const tInstrPda = new PublicKey(
                    deriveInstructionTablePda(tSeed),
                );
                const rTablePda = new PublicKey(deriveTablePda(rSeed));
                const rInstrPda = new PublicKey(
                    deriveInstructionTablePda(rSeed),
                );

                console.log("[iqchan:createThread] ──────────────────────────");
                console.log("[iqchan:createThread] boardId:", boardId);
                console.log("[iqchan:createThread] threadNo:", threadNo);
                console.log("[iqchan:createThread] threadsSeed:", tSeed);
                console.log("[iqchan:createThread] repliesSeed:", rSeed);
                console.log("[iqchan:createThread] dbRootKey:", dbRootKey.toBase58());
                console.log("[iqchan:createThread] feedPda:", feedPda.toBase58());
                console.log("[iqchan:createThread] threadsTablePda:", tTablePda.toBase58());
                console.log("[iqchan:createThread] repliesTablePda:", rTablePda.toBase58());

                // Check which accounts need initialization
                const [dbRootInfo, threadsTableInfo, repliesTableInfo] =
                    await Promise.all([
                        connection.getAccountInfo(dbRootKey),
                        connection.getAccountInfo(tTablePda),
                        connection.getAccountInfo(rTablePda),
                    ]);

                console.log("[iqchan:createThread] dbRoot exists:", !!dbRootInfo);
                console.log("[iqchan:createThread] threadsTable exists:", !!threadsTableInfo);
                console.log("[iqchan:createThread] repliesTable exists:", !!repliesTableInfo);

                const builder = iqlabs.contract.createInstructionBuilder(
                    require("iqlabs-sdk/idl/code_in.json"),
                    iqlabs.contract.PROGRAM_ID,
                );
                const dbRootIdBytes = Buffer.from(
                    iqlabs.utils.toSeedBytes(DB_ROOT_ID),
                );
                const tSeedBytes = Buffer.from(
                    iqlabs.utils.toSeedBytes(tSeed),
                );
                const threadsColumns = [
                    "no",
                    "sub",
                    "com",
                    "name",
                    "time",
                    "img",
                ].map((c) => Buffer.from(c));

                // TX0: Initialize db_root + create/update threads table
                if (!dbRootInfo || !threadsTableInfo) {
                    const tx0 = new Transaction();

                    if (!dbRootInfo) {
                        tx0.add(
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

                    if (!threadsTableInfo) {
                        tx0.add(
                            iqlabs.contract.createExtTableInstruction(
                                builder,
                                {
                                    signer: wallet.publicKey,
                                    db_root: dbRootKey,
                                    table: tTablePda,
                                    instruction_table: tInstrPda,
                                    system_program: SystemProgram.programId,
                                },
                                {
                                    db_root_id: dbRootIdBytes,
                                    table_seed: tSeedBytes,
                                    table_name: Buffer.from(tSeed),
                                    column_names: threadsColumns,
                                    id_col: Buffer.from("no"),
                                    ext_keys: [Buffer.from("replies")],
                                    gate_mint_opt: null,
                                    writers_opt: null,
                                },
                            ),
                        );
                    }

                    tx0.feePayer = wallet.publicKey;
                    tx0.recentBlockhash = (
                        await connection.getLatestBlockhash()
                    ).blockhash;
                    const signed0 = await wallet.signTransaction(tx0);
                    console.log("[iqchan:createThread] TX0 signed, sending (init dbRoot/threadsTable)...");
                    const tx0Sig = await connection.sendRawTransaction(
                        signed0.serialize(),
                    );
                    console.log("[iqchan:createThread] TX0 sent:", tx0Sig);
                    await connection.confirmTransaction(tx0Sig, "confirmed");
                    console.log("[iqchan:createThread] TX0 confirmed ✓");
                }

                // TX1: Create replies ext table for this thread
                if (!repliesTableInfo) {
                    const tx1 = new Transaction();
                    tx1.add(
                        iqlabs.contract.createExtTableInstruction(
                            builder,
                            {
                                signer: wallet.publicKey,
                                db_root: dbRootKey,
                                table: rTablePda,
                                instruction_table: rInstrPda,
                                system_program: SystemProgram.programId,
                            },
                            {
                                db_root_id: dbRootIdBytes,
                                table_seed: Buffer.from(
                                    iqlabs.utils.toSeedBytes(rSeed),
                                ),
                                table_name: Buffer.from(rSeed),
                                column_names: [
                                    "no",
                                    "com",
                                    "name",
                                    "time",
                                    "img",
                                ].map((c) => Buffer.from(c)),
                                id_col: Buffer.from("no"),
                                ext_keys: [],
                                gate_mint_opt: null,
                                writers_opt: null,
                            },
                        ),
                    );

                    tx1.feePayer = wallet.publicKey;
                    tx1.recentBlockhash = (
                        await connection.getLatestBlockhash()
                    ).blockhash;

                    // Simulate first to get meaningful error before wallet popup
                    const sim = await connection.simulateTransaction(tx1);
                    if (sim.value.err) {
                        console.error("[iqchan:createThread] TX1 simulation FAILED:", sim.value.err);
                        console.error("[iqchan:createThread] TX1 simulation logs:", sim.value.logs);
                        throw new Error(`createExtTable simulation failed: ${JSON.stringify(sim.value.err)}`);
                    }
                    console.log("[iqchan:createThread] TX1 simulation OK, requesting signature...");

                    const signed1 = await wallet.signTransaction(tx1);
                    console.log("[iqchan:createThread] TX1 signed, sending (create repliesTable)...");
                    const tx1Sig = await connection.sendRawTransaction(
                        signed1.serialize(),
                    );
                    console.log("[iqchan:createThread] TX1 sent:", tx1Sig);
                    await connection.confirmTransaction(tx1Sig, "confirmed");
                    console.log("[iqchan:createThread] TX1 confirmed ✓");
                }

                // TX2: Write thread row
                const rowJson = JSON.stringify({
                    no: threadNo,
                    sub: data.sub,
                    com: data.com,
                    name: data.name,
                    time: Math.floor(Date.now() / 1000),
                    ...(data.img ? { img: data.img } : {}),
                });

                console.log("[iqchan:createThread] TX2 writeRow payload:", rowJson);
                console.log("[iqchan:createThread] TX2 dbRootIdSeed:", DB_ROOT_ID);
                console.log("[iqchan:createThread] TX2 tableSeed:", tSeed);
                console.log("[iqchan:createThread] TX2 remainingAccounts (feedPda):", feedPda.toBase58());

                // writeRow needs pre-hashed Buffer (SDK passes to Borsh which requires Buffer(32))
                const writeResult = await iqlabs.writer.writeRow(
                    connection,
                    wallet as any,
                    Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID)),
                    Buffer.from(iqlabs.utils.toSeedBytes(tSeed)),
                    rowJson,
                    false,
                    [feedPda],
                );

                console.log("[iqchan:createThread] TX2 writeRow result:", writeResult);
                console.log("[iqchan:createThread] ✅ Thread created successfully! threadNo:", threadNo);
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                console.error("[iqchan:createThread] ❌ FAILED:", err.message);
                console.error("[iqchan:createThread] Full error:", e);
                setError(err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [connection, wallet],
    );

    // ─── Post Reply (1 TX) ──────────────────────────────────────────────────

    const postReply = useCallback(
        async (
            boardId: string,
            threadNo: number,
            data: { com: string; name: string; img?: string },
        ) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            setLoading(true);
            setError(null);

            try {
                const rSeed = repliesTableSeed(boardId, threadNo);
                const feedPda = getFeedPda(getDbRootKey(), boardId);
                const threadsPda = new PublicKey(
                    deriveTablePda(threadsTableSeed(boardId)),
                );

                const replyNo = Date.now();
                const rowJson = JSON.stringify({
                    no: replyNo,
                    com: data.com,
                    name: data.name,
                    time: Math.floor(Date.now() / 1000),
                    ...(data.img ? { img: data.img } : {}),
                });

                console.log("[iqchan:postReply] ──────────────────────────");
                console.log("[iqchan:postReply] boardId:", boardId, "threadNo:", threadNo, "replyNo:", replyNo);
                console.log("[iqchan:postReply] repliesSeed:", rSeed);
                console.log("[iqchan:postReply] payload:", rowJson);

                // writeRow needs pre-hashed Buffer (SDK passes to Borsh which requires Buffer(32))
                const writeResult = await iqlabs.writer.writeRow(
                    connection,
                    wallet as any,
                    Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID)),
                    Buffer.from(iqlabs.utils.toSeedBytes(rSeed)),
                    rowJson,
                    false,
                    [feedPda, threadsPda],
                );

                console.log("[iqchan:postReply] ✅ Reply posted! result:", writeResult);
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                console.error("[iqchan:postReply] ❌ FAILED:", err.message);
                console.error("[iqchan:postReply] Full error:", e);
                setError(err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [connection, wallet],
    );

    // ─── Edit Post (1 TX) ───────────────────────────────────────────────────

    const editPost = useCallback(
        async (
            boardId: string,
            threadNo: number,
            targetTxSig: string,
            newCom: string,
        ) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            setLoading(true);
            setError(null);

            try {
                const rSeed = repliesTableSeed(boardId, threadNo);
                // manageRowData needs pre-hashed Buffer (SDK passes to Borsh which requires Buffer(32))
                await iqlabs.writer.manageRowData(
                    connection,
                    wallet as any,
                    Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID)),
                    Buffer.from(iqlabs.utils.toSeedBytes(rSeed)),
                    JSON.stringify({ target: targetTxSig, com: newCom }),
                    rSeed,
                    targetTxSig,
                );
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                setError(err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [connection, wallet],
    );

    // ─── Delete Post (1 TX) ─────────────────────────────────────────────────

    const deletePost = useCallback(
        async (boardId: string, threadNo: number, targetTxSig: string) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            setLoading(true);
            setError(null);

            try {
                const rSeed = repliesTableSeed(boardId, threadNo);
                // manageRowData needs pre-hashed Buffer (SDK passes to Borsh which requires Buffer(32))
                await iqlabs.writer.manageRowData(
                    connection,
                    wallet as any,
                    Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID)),
                    Buffer.from(iqlabs.utils.toSeedBytes(rSeed)),
                    "{}",
                    rSeed,
                    targetTxSig,
                );
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                setError(err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [connection, wallet],
    );

    return { createThread, postReply, editPost, deletePost, loading, error };
}
