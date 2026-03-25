/**
 * update-board-columns.ts
 *
 * Updates po/biz/a/g board table columns to the new post format:
 * ["sub", "com", "name", "time", "img", "threadPda", "threadSeed"]
 *
 * Usage: npx tsx scripts/update-board-columns.ts
 * Requires: ~/Desktop/deploy.json
 */

import fs from "fs";
import os from "os";
import path from "path";
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { DB_ROOT_ID, DB_ROOT_KEY } from "../src/lib/constants";

const idl = require("iqlabs-sdk/idl/code_in.json");
const RPC_URL = "https://api.mainnet-beta.solana.com";

const BOARDS: { id: string; title: string }[] = [
    { id: "po",  title: "Politically Incorrect" },
    { id: "biz", title: "Business & Finance" },
    { id: "a",   title: "Anime & Manga" },
    { id: "g",   title: "Technology" },
    { id: "iq",  title: "IQ" },
];

const BOARD_COLUMNS = ["sub", "com", "name", "time", "img", "threadPda", "threadSeed"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendTx(connection: Connection, payer: Keypair, ix: any) {
    const tx = new Transaction().add(ix);
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(payer);
    const sig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(sig, "confirmed");
    console.log("  sig:", sig);
    await sleep(1500);
}

async function main() {
    const keypairPath = path.join(os.homedir(), "Desktop", "deploy.json");
    const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8"))));
    console.log("Payer:", payer.publicKey.toBase58());

    const connection = new Connection(RPC_URL, "confirmed");
    const builder = iqlabs.contract.createInstructionBuilder(idl, iqlabs.contract.PROGRAM_ID);

    for (const board of BOARDS) {
        const seedBytes = iqlabs.utils.toSeedBytes(board.id);
        const tablePda = iqlabs.contract.getTablePda(DB_ROOT_KEY, seedBytes);

        console.log(`\n[${board.id}] Updating columns → ${BOARD_COLUMNS.join(", ")}`);
        await sendTx(connection, payer,
            iqlabs.contract.updateTableInstruction(builder, {
                signer: payer.publicKey,
                db_root: DB_ROOT_KEY,
                table: tablePda,
            }, {
                db_root_id: Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID)),
                table_seed: Buffer.from(seedBytes),
                table_name: Buffer.from(board.title),
                column_names: BOARD_COLUMNS.map((c) => Buffer.from(c)),
                id_col: Buffer.from("time"),
                ext_keys: [],
                gate_opt: null,
                writers_opt: null,
            }),
        );
        console.log(`[${board.id}] Done`);
    }

    console.log("\nAll boards updated!");
}

main().catch((e) => { console.error(e); process.exit(1); });
