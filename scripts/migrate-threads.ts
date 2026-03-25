/**
 * migrate-threads.ts
 *
 * Reads existing thread PDAs from feed PDA (gateway),
 * fetches OP row from each thread table,
 * then writes the OP row into the board table so they appear in the new board-table-based feed.
 *
 * Usage: npx tsx scripts/migrate-threads.ts
 * Requires: ~/Desktop/deploy.json
 */

import fs from "fs";
import os from "os";
import path from "path";
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { DB_ROOT_ID, DB_ROOT_ID_BYTES, DB_ROOT_KEY } from "../src/lib/constants";

const idl = require("iqlabs-sdk/idl/code_in.json");
const RPC_URL = "https://api.mainnet-beta.solana.com";
const GATEWAY = "https://gateway.solanainternet.com";

const BOARDS = ["po", "biz", "a", "g", "iq"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchRows(pda: string, limit = 200): Promise<any[]> {
    const res = await fetch(`${GATEWAY}/table/${pda}/rows?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.rows ?? [];
}

async function main() {
    const keypairPath = path.join(os.homedir(), "Desktop", "deploy.json");
    const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8"))));
    console.log("Payer:", payer.publicKey.toBase58());

    const connection = new Connection(RPC_URL, "confirmed");
    const builder = iqlabs.contract.createInstructionBuilder(idl, iqlabs.contract.PROGRAM_ID);

    for (const boardId of BOARDS) {
        console.log(`\n=== [${boardId}] ===`);

        const boardSeedBytes = iqlabs.utils.toSeedBytes(boardId);
        const boardPda = iqlabs.contract.getTablePda(DB_ROOT_KEY, boardSeedBytes).toBase58();

        // Check existing board table rows (already migrated)
        const existingRows = await fetchRows(boardPda);
        const existingThreadPdas = new Set(existingRows.map((r: any) => r.threadPda).filter(Boolean));
        console.log(`  Board table already has ${existingRows.length} rows`);

        // Read feed PDA to get known thread PDAs
        const FEED_SEED_PREFIX = "feedmY}AGBJiqLabs";
        const PROGRAM_ID = iqlabs.contract.PROGRAM_ID;
        const feedPda = iqlabs.contract.getTablePda(
            DB_ROOT_KEY,
            Buffer.from(iqlabs.utils.toSeedBytes(boardId)),
        );

        // Get feed rows from gateway
        const feedRows = await fetchRows(feedPda.toBase58(), 200);
        console.log(`  Feed has ${feedRows.length} rows`);

        // Collect unique threadPdas from feed
        const threadPdas = [...new Set(feedRows.map((r: any) => r.threadPda).filter(Boolean))] as string[];
        console.log(`  Found ${threadPdas.length} unique thread PDAs`);

        let migrated = 0;
        let skipped = 0;

        for (const threadPda of threadPdas) {
            if (existingThreadPdas.has(threadPda)) {
                skipped++;
                continue;
            }

            // Fetch OP row from thread table
            const threadRows = await fetchRows(threadPda, 50);
            const op = threadRows.find((r: any) => !!r.threadSeed);
            if (!op) {
                console.log(`  [skip] ${threadPda.slice(0, 8)}... — no OP row found`);
                skipped++;
                continue;
            }

            const row = {
                sub: op.sub ?? "",
                com: op.com ?? "",
                name: op.name ?? "",
                time: op.time ?? Math.floor(Date.now() / 1000),
                ...(op.img ? { img: op.img } : {}),
                threadPda,
                threadSeed: op.threadSeed,
            };

            try {
                const txSig = await iqlabs.writer.writeRow(
                    connection,
                    { publicKey: payer.publicKey, signTransaction: async (tx: Transaction) => { tx.sign(payer); return tx; } } as any,
                    DB_ROOT_ID_BYTES,
                    Buffer.from(boardSeedBytes),
                    JSON.stringify(row),
                    false,
                    [],
                );
                console.log(`  [ok] ${threadPda.slice(0, 8)}... "${op.sub || op.com?.slice(0, 20)}" → ${txSig.slice(0, 12)}...`);
                migrated++;
                await sleep(1200);
            } catch (e: any) {
                console.log(`  [err] ${threadPda.slice(0, 8)}...: ${e.message}`);
                await sleep(500);
            }
        }

        console.log(`  Migrated: ${migrated}, Skipped: ${skipped}`);
    }

    console.log("\nDone!");
}

main().catch((e) => { console.error(e); process.exit(1); });
