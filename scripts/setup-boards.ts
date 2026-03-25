/**
 * setup-boards.ts
 *
 * Creates on-chain Table accounts for po/biz/a/g boards,
 * sets their names, and configures table creators.
 *
 * Usage: npx ts-node --esm scripts/setup-boards.ts
 * (or: npx tsx scripts/setup-boards.ts)
 *
 * Requires: ~/Desktop/deploy.json (keypair file)
 */

import fs from "fs";
import os from "os";
import path from "path";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { DB_ROOT_ID, DB_ROOT_ID_BYTES, DB_ROOT_KEY } from "../src/lib/constants";

const idl = require("iqlabs-sdk/idl/code_in.json");

const RPC_URL = "https://api.mainnet-beta.solana.com";

const BOARDS: { id: string; title: string }[] = [
    { id: "po", title: "Politically Incorrect" },
    { id: "biz", title: "Business & Finance" },
    { id: "a", title: "Anime & Manga" },
    { id: "g", title: "Technology" },
];

const NEW_TABLE_CREATOR = new PublicKey("B8d355pft6DfrQNetCqXNumRk8WoEs21waqeuPP3HUJC");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendTx(
    connection: Connection,
    payer: Keypair,
    ix: ReturnType<typeof iqlabs.contract.onboardTableInstruction>,
) {
    const tx = new Transaction().add(ix);
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(payer);
    const sig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(sig, "confirmed");
    console.log("  tx:", sig);
    await sleep(1500); // avoid rate limits
    return sig;
}

async function main() {
    // Load keypair
    const keypairPath = path.join(os.homedir(), "Desktop", "deploy.json");
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
    const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    console.log("Payer:", payer.publicKey.toBase58());

    const connection = new Connection(RPC_URL, "confirmed");
    const builder = iqlabs.contract.createInstructionBuilder(idl, iqlabs.contract.PROGRAM_ID);

    // Step 1: Create Table accounts for each board
    for (const board of BOARDS) {
        const seedBytes = iqlabs.utils.toSeedBytes(board.id);
        const tablePda = iqlabs.contract.getTablePda(DB_ROOT_KEY, seedBytes);
        const instructionTablePda = iqlabs.contract.getInstructionTablePda(DB_ROOT_KEY, seedBytes);

        // Check if table already exists
        const existing = await connection.getAccountInfo(tablePda);
        if (existing) {
            console.log(`[${board.id}] Table already exists at ${tablePda.toBase58()}, skipping create`);
        } else {
            console.log(`[${board.id}] Creating table at ${tablePda.toBase58()}...`);
            await sendTx(
                connection,
                payer,
                iqlabs.contract.createTableInstruction(builder, {
                    db_root: DB_ROOT_KEY,
                    receiver: payer.publicKey,
                    signer: payer.publicKey,
                    table: tablePda,
                    instruction_table: instructionTablePda,
                    system_program: SystemProgram.programId,
                }, {
                    db_root_id: Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID)),
                    table_seed: Buffer.from(iqlabs.utils.toSeedBytes(board.id)),
                    table_name: Buffer.from(board.title),
                    column_names: ["title", "description", "image", "time"].map((c) => Buffer.from(c)),
                    id_col: Buffer.from("time"),
                    ext_keys: [],
                    gate_opt: null,
                    writers_opt: null,
                }),
            );
            console.log(`[${board.id}] Created`);
        }

        // Step 2: Set table name via update_table (even if already existed)
        console.log(`[${board.id}] Setting name to "${board.title}"...`);

        let existingMeta: { columns: string[]; idCol: string } = { columns: [], idCol: "" };
        try {
            existingMeta = await iqlabs.reader.fetchTableMeta(
                connection, iqlabs.contract.PROGRAM_ID, DB_ROOT_ID, board.id,
            );
        } catch {
            // newly created — no existing meta to read
        }

        // Columns: ["title","description","image","time"] — matches addboard-page format
        const BOARD_COLUMNS = ["title", "description", "image", "time"];
        await sendTx(
            connection,
            payer,
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
        console.log(`[${board.id}] Name + columns set`);
    }

    // Step 3: Onboard boards (add to table_seeds / make public)
    await sleep(3000);
    for (const board of BOARDS) {
        console.log(`[${board.id}] Onboarding (adding to public table_seeds)...`);
        try {
            await sendTx(
                connection,
                payer,
                iqlabs.contract.onboardTableInstruction(builder, {
                    signer: payer.publicKey,
                    db_root: DB_ROOT_KEY,
                }, {
                    db_root_id: Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID)),
                    table_seed: Buffer.from(iqlabs.utils.toSeedBytes(board.id)),
                }),
            );
            console.log(`[${board.id}] Onboarded`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("already") || msg.includes("0x0")) {
                console.log(`[${board.id}] Already onboarded, skipping`);
            } else {
                throw e;
            }
        }
    }

    // Step 4: Set table creators (deploy.json wallet + B8d355... wallet)
    const creators = [payer.publicKey, NEW_TABLE_CREATOR];
    console.log(`\nSetting table creators to [${creators.map((c) => c.toBase58()).join(", ")}]...`);
    await sendTx(
        connection,
        payer,
        iqlabs.contract.manageTableCreatorsInstruction(builder, {
            signer: payer.publicKey,
            db_root: DB_ROOT_KEY,
            system_program: SystemProgram.programId,
        }, {
            db_root_id: Buffer.from(iqlabs.utils.toSeedBytes(DB_ROOT_ID)),
            table_creators: creators,
            ext_creators: [],
        }),
    );
    console.log("Table creators updated");

    console.log("\nDone!");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
