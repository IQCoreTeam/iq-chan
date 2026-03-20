"use client";

import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
// TODO: remove `as any` wallet casts once SDK publishes SignerInput support
// eslint-disable-next-line @typescript-eslint/no-var-requires
const idl = require("iqlabs-sdk/idl/code_in.json");
import {
    DB_ROOT_ID,
    threadTableSeed,
    deriveTablePda,
    deriveInstructionTablePda,
    DB_ROOT_KEY,
} from "../lib/constants";
import { getFeedPda } from "../lib/board";
import { notifyPost } from "../lib/gateway";

const THREAD_COLUMNS = ["sub", "com", "name", "time", "img", "threadPda", "threadSeed"];

export function usePost() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // ─── Create Thread (2 TXs: ext table + OP row) ──────────────────────────

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
                const randomId = crypto.randomUUID();
                const seed = threadTableSeed(boardId, randomId);
                const threadPda = deriveTablePda(seed);
                const dbRootKey = DB_ROOT_KEY;
                const feedPda = getFeedPda(dbRootKey, boardId);

                const tablePda = new PublicKey(threadPda);
                const instrPda = new PublicKey(deriveInstructionTablePda(seed));

                const builder = iqlabs.contract.createInstructionBuilder(
                    idl,
                    iqlabs.contract.PROGRAM_ID,
                );
                const dbRootIdBytes = Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID));
                const seedBytes = Buffer.from(iqlabs.utils.toSeedBytes(seed));

                // Check if dbRoot needs init
                const dbRootInfo = await connection.getAccountInfo(dbRootKey);

                // TX1: init dbRoot (if needed) + create thread ext table
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
                            table_seed: seedBytes,
                            table_name: Buffer.from(seed),
                            column_names: THREAD_COLUMNS.map((c) => Buffer.from(c)),
                            id_col: Buffer.from("time"),
                            ext_keys: [],
                            gate_mint_opt: null,
                            writers_opt: null,
                        },
                    ),
                );

                tx1.feePayer = wallet.publicKey;
                tx1.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

                const sim = await connection.simulateTransaction(tx1);
                if (sim.value.err) {
                    throw new Error(`createExtTable simulation failed: ${JSON.stringify(sim.value.err)}`);
                }

                const signed1 = await wallet.signTransaction(tx1);
                const tx1Sig = await connection.sendRawTransaction(signed1.serialize());
                await connection.confirmTransaction(tx1Sig, "confirmed");

                // TX2: write OP row
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
                    seedBytes,
                    JSON.stringify(row),
                    false,
                    [feedPda],
                );

                notifyPost(threadPda, txSig, row);
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
            threadSeed: string,
            threadPda: string,
            boardId: string,
            data: { com: string; name: string; img?: string },
        ) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            setLoading(true);
            setError(null);

            try {
                const feedPda = getFeedPda(DB_ROOT_KEY, boardId);
                const dbRootIdBytes = Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID));
                const seedBytes = Buffer.from(iqlabs.utils.toSeedBytes(threadSeed));

                const row = {
                    sub: "",
                    com: data.com,
                    name: data.name,
                    time: Math.floor(Date.now() / 1000),
                    ...(data.img ? { img: data.img } : {}),
                    threadPda,
                };

                const txSig = await iqlabs.writer.writeRow(
                    connection,
                    wallet as any,
                    dbRootIdBytes,
                    seedBytes,
                    JSON.stringify(row),
                    false,
                    [feedPda],
                );

                notifyPost(threadPda, txSig, row);
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
        async (threadSeed: string, targetTxSig: string, newCom: string) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            setLoading(true);
            setError(null);

            try {
                const dbRootIdBytes = Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID));
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
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [connection, wallet],
    );

    // ─── Delete Post (1 TX) ─────────────────────────────────────────────────

    const deletePost = useCallback(
        async (threadSeed: string, targetTxSig: string) => {
            if (!wallet.publicKey) throw new Error("Wallet not connected");
            setLoading(true);
            setError(null);

            try {
                const dbRootIdBytes = Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID));
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
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [connection, wallet],
    );

    return { createThread, postReply, editPost, deletePost, loading, error };
}
