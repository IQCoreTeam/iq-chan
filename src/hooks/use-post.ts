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

                // Check which accounts need initialization
                const [dbRootInfo, threadsTableInfo, repliesTableInfo] =
                    await Promise.all([
                        connection.getAccountInfo(dbRootKey),
                        connection.getAccountInfo(tTablePda),
                        connection.getAccountInfo(rTablePda),
                    ]);

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
                    const tx0Sig = await connection.sendRawTransaction(
                        signed0.serialize(),
                    );
                    await connection.confirmTransaction(tx0Sig, "confirmed");
                }

                // Update threads table columns if it already existed (e.g. missing img column)
                if (threadsTableInfo) {
                    const txUpdate = new Transaction();
                    txUpdate.add(
                        iqlabs.contract.updateTableInstruction(
                            builder,
                            {
                                db_root: dbRootKey,
                                table: tTablePda,
                                signer: wallet.publicKey,
                            },
                            {
                                db_root_id: dbRootIdBytes,
                                table_seed: tSeedBytes,
                                table_name: Buffer.from(tSeed),
                                column_names: threadsColumns,
                                id_col: Buffer.from("no"),
                                ext_keys: [Buffer.from("replies")],
                                writers_opt: null,
                            },
                        ),
                    );
                    txUpdate.feePayer = wallet.publicKey;
                    txUpdate.recentBlockhash = (
                        await connection.getLatestBlockhash()
                    ).blockhash;
                    const signedUpdate =
                        await wallet.signTransaction(txUpdate);
                    const updateSig = await connection.sendRawTransaction(
                        signedUpdate.serialize(),
                    );
                    await connection.confirmTransaction(
                        updateSig,
                        "confirmed",
                    );
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
                    const signed1 = await wallet.signTransaction(tx1);
                    const tx1Sig = await connection.sendRawTransaction(
                        signed1.serialize(),
                    );
                    await connection.confirmTransaction(tx1Sig, "confirmed");
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

                await iqlabs.writer.writeRow(
                    connection,
                    wallet as any,
                    Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID)),
                    Buffer.from(iqlabs.utils.toSeedBytes(tSeed)),
                    rowJson,
                    false,
                    [feedPda],
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

                const rowJson = JSON.stringify({
                    no: Date.now(),
                    com: data.com,
                    name: data.name,
                    time: Math.floor(Date.now() / 1000),
                    ...(data.img ? { img: data.img } : {}),
                });

                await iqlabs.writer.writeRow(
                    connection,
                    wallet as any,
                    Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID)),
                    Buffer.from(iqlabs.utils.toSeedBytes(rSeed)),
                    rowJson,
                    false,
                    [feedPda, threadsPda],
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
