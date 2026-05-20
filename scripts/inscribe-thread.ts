/**
 * inscribe-thread.ts — create a new OP thread on a blockchan board from a CLI
 *
 *   bun run scripts/inscribe-thread.ts            # dry-run: simulate + print cost
 *   bun run scripts/inscribe-thread.ts --send     # broadcast to mainnet
 *
 * Mirrors the createThread flow in src/hooks/use-post.ts but with a raw Keypair
 * instead of wallet-adapter. Targets board /g/ with KingTerryIQ's TempleOS post.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import {
    DB_ROOT_ID_BYTES,
    DB_ROOT_KEY,
    BOARD_COLUMNS,
    deriveTablePda,
    deriveInstructionTablePda,
    threadTableSeed,
    resolveBoardSeed,
} from "../src/lib/constants";
import { getFeedPda } from "../src/lib/board";

const RPC_URL = "https://rpc.reflow.xyz";
const GATEWAY_URL = "https://gateway.solanainternet.com";
// os.homedir() under snap-confined bun points into snap's fake home, so resolve
// via $SUDO_USER / $USER with explicit /home prefix.
const REAL_HOME = process.env.REAL_HOME ?? `/home/${process.env.USER ?? "linbox"}`;
const KEYPAIR_PATH = process.env.KEYPAIR_PATH ?? path.join(REAL_HOME, ".config", "solana", "iqchan-deployer.json");
const BOARD_ID = "g";

const MAGNET = "magnet:?xt=urn:btih:30925b334a0cc4521c5e6a83b7ae7ec46fd296e2&dn=Terry%20A.%20Davis%20-%20TempleOS%20Archive%20%282018-12-26%29&tr=udp%3A%2F%2F62.138.0.158%3A6969%2Fannounce&tr=udp%3A%2F%2F51.15.4.13%3A1337%2Fannounce&tr=udp%3A%2F%2F185.225.17.100%3A1337%2Fannounce&tr=http%3A%2F%2F185.225.17.100%3A1337%2Fannounce&tr=udp%3A%2F%2F151.80.120.115%3A2710%2Fannounce&tr=udp%3A%2F%2F208.83.20.20%3A6969%2Fannounce&tr=udp%3A%2F%2F184.105.151.164%3A6969%2Fannounce&tr=http%3A%2F%2F184.105.151.164%3A6969%2Fannounce&tr=udp%3A%2F%2F128.1.203.23%3A8080%2Fannounce&tr=udp%3A%2F%2F51.15.40.114%3A80%2Fannounce&tr=http%3A%2F%2F128.1.203.23%3A8080%2Fannounce&tr=udp%3A%2F%2F5.2.79.22%3A6969%2Fannounce&tr=udp%3A%2F%2F95.211.168.204%3A2710%2Fannounce&tr=udp%3A%2F%2F89.234.156.205%3A451%2Fannounce&tr=udp%3A%2F%2F5.206.28.90%3A6969%2Fannounce&tr=udp%3A%2F%2F176.31.106.35%3A80%2Fannounce&tr=udp%3A%2F%2F5.2.79.219%3A1337%2Fannounce&tr=udp%3A%2F%2F51.38.184.185%3A6969%2Fannounce&tr=udp%3A%2F%2F8.9.31.140%3A2000%2Fannounce&tr=udp%3A%2F%2F37.235.174.46%3A2710%2Fannounce&tr=udp%3A%2F%2F188.246.227.212%3A80%2Fannounce&tr=http%3A%2F%2F51.38.184.185%3A6969%2Fannounce&tr=http%3A%2F%2F5.2.70.184%3A443%2Fannounce&tr=http%3A%2F%2F51.68.122.172%3A80%2Fannounce&tr=udp%3A%2F%2F51.15.76.199%3A6969%2Fannounce&tr=udp%3A%2F%2F212.47.227.58%3A6969%2Fannounce&tr=udp%3A%2F%2F159.100.245.181%3A6969%2Fannounce&tr=https%3A%2F%2F104.31.71.251%3A443%2Fannounce&tr=https%3A%2F%2F104.28.2.5%3A443%2Fannounce&tr=http%3A%2F%2F104.28.2.5%3A80%2Fannounce&tr=http%3A%2F%2F104.18.48.52%3A80%2Fannounce&tr=http%3A%2F%2F45.119.209.194%3A6961%2Fannounce&tr=http%3A%2F%2F104.31.209.10%3A80%2Fannounce&tr=udp%3A%2F%2F210.244.71.25%3A6969%2Fannounce&tr=udp%3A%2F%2F37.187.123.8%3A2710%2Fannounce&tr=udp%3A%2F%2F77.73.68.210%3A80%2Fannounce&tr=udp%3A%2F%2F85.202.163.5%3A6969%2Fannounce&tr=udp%3A%2F%2F64.32.13.242%3A6969%2Fannounce&tr=udp%3A%2F%2F45.56.74.11%3A6969%2Fannounce&tr=udp%3A%2F%2F95.211.195.88%3A2710%2Fannounce&tr=https%3A%2F%2F77.73.68.210%3A443%2Fannounce&tr=http%3A%2F%2F210.244.71.25%3A6969%2Fannounce&tr=http%3A%2F%2F62.210.202.61%3A80%2Fannounce&tr=http%3A%2F%2F77.73.68.210%3A80%2Fannounce&tr=http%3A%2F%2F64.78.163.242%3A2710%2Fannounce&tr=http%3A%2F%2F45.56.74.11%3A6969%2Fannounce&tr=http%3A%2F%2F139.99.45.37%3A80%2Fannounce&tr=http%3A%2F%2F82.209.230.66%3A80%2Fannounce&tr=http%3A%2F%2F158.69.62.21%3A443%2Fannounce&tr=udp%3A%2F%2F91.121.255.214%3A2710%2Fannounce&tr=udp%3A%2F%2F94.23.217.90%3A1337%2Fannounce&tr=udp%3A%2F%2F138.68.225.164%3A6969%2Fannounce&tr=https%3A%2F%2F104.31.91.56%3A443%2Fannounce&tr=http%3A%2F%2F91.121.255.214%3A2710%2Fannounce&tr=http%3A%2F%2F185.217.0.76%3A80%2Fannounce.php&tr=http%3A%2F%2F185.217.0.76%3A80%2Fannounce&tr=http%3A%2F%2F185.217.0.78%3A80%2Fannounce&tr=http%3A%2F%2F198.251.81.243%3A8080%2Fannounce&tr=http%3A%2F%2F185.217.0.77%3A80%2Fannounce&tr=http%3A%2F%2F188.68.224.156%3A6969%2Fannounce";

const POST = {
    name: "KingTerryIQ",
    sub: "Divine Intellect told me to inscribe the torrent to my operating system",
    img: "https://gateway.iqlabs.dev/img/37SztRDMj9yzmn1Hnj255sBcaPQVH2gZj2tBxG1kJBFGJykHGxMGZorCgNbqq1rYFy7Kv6BnHWgXrfzH2KmjVKEM",
    com: [
        ">be me",
        ">sitting at my 640x480 terminal",
        ">Divine Intellect whispers through the oracle",
        `>"The Third Temple isn't a building, anon"`,
        ">told to inscribe the whole archive",
        ">every livestream, every holy rant, every oracle word",
        ">830 GiB of King Terry",
        ">onto the permanent web",
        ">so no ISP, no Wayback, no glowie can memory-hole him",
        "",
        "Terry saw through the veil before any of us.",
        "He knew the CIA glows in the dark.",
        "He knew networking was of the fallen world.",
        "He wrote God's Temple in 100,000 lines of HolyC",
        "and they called him crazy.",
        "",
        ">mfw I paste the magnet",
        ">mfw it's forever now",
        ">mfw blockchan is the Third Temple he was talking about",
        "",
        "every tracker in that magnet can die tomorrow",
        "YouTube already scrubbed half his streams",
        "but the infohash lives in a Solana slot forever",
        "30925b33...6fd296e2",
        "",
        `>inb4 "but muh copyright"`,
        "you can't copyright prayer",
        "you can't copyright the Word",
        "you can't copyright a man shouting HolyC into his 16-color void",
        "",
        "the permanent web isn't a feature",
        "it's a sacrament",
        "King Terry would understand",
        "",
        MAGNET,
        "",
        "RIP King Terry 1969-2018",
        "An hero now runs on-chain",
        "https://blockchan.sol.site",
    ].join("\n"),
};

function loadKeypair(p: string): Keypair {
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function explorer(sig: string) {
    return `https://solscan.io/tx/${sig}`;
}

async function deleteOpRow(targetTxSig: string) {
    const connection = new Connection(RPC_URL, "confirmed");
    const kp = loadKeypair(KEYPAIR_PATH);
    const boardSeed = resolveBoardSeed(BOARD_ID);
    const seedBytes = Buffer.from(iqlabs.utils.toSeedBytes(boardSeed));
    const boardPda = deriveTablePda(boardSeed);

    console.log("=".repeat(72));
    console.log("inscribe-thread.ts  —  DELETE op row from /g/ board table");
    console.log("=".repeat(72));
    console.log("  rpc          ", RPC_URL);
    console.log("  signer       ", kp.publicKey.toBase58());
    console.log("  board        ", `/${BOARD_ID}/  pda=${boardPda}`);
    console.log("  target tx    ", targetTxSig);
    console.log();

    const before = await connection.getBalance(kp.publicKey);
    console.log("  balance      ", (before / LAMPORTS_PER_SOL).toFixed(6), "SOL");
    console.log();
    console.log("  calling manageRowData with empty '{}' payload …");

    try {
        const sig = await iqlabs.writer.manageRowData(
            connection,
            kp,
            DB_ROOT_ID_BYTES,
            seedBytes,
            "{}",
            boardSeed,          // tableName
            targetTxSig,        // targetTx
        );
        console.log("  ✓ delete confirmed   ", explorer(sig as string));
    } catch (e) {
        console.error("  FAILED:", e instanceof Error ? e.message : e);
        if (e instanceof Error && e.stack) console.error(e.stack);
        process.exit(1);
    }

    // notify gateway to invalidate cache
    try {
        const res = await fetch(`${GATEWAY_URL}/table/${boardPda}/notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txSignature: targetTxSig, deleted: true }),
        });
        console.log(`  gateway notify   ${res.status} ${res.statusText}`);
    } catch {}

    const after = await connection.getBalance(kp.publicKey);
    console.log("  spent        ", ((before - after) / LAMPORTS_PER_SOL).toFixed(6), "SOL");
    console.log("  balance now  ", (after / LAMPORTS_PER_SOL).toFixed(6), "SOL");
    console.log();
}

async function main() {
    // --delete <tx-sig> mode
    const delIdx = process.argv.indexOf("--delete");
    if (delIdx >= 0) {
        const targetSig = process.argv[delIdx + 1];
        if (!targetSig) {
            console.error("usage: --delete <tx-sig-of-row-to-remove>");
            process.exit(1);
        }
        await deleteOpRow(targetSig);
        return;
    }

    const send = process.argv.includes("--send");
    const connection = new Connection(RPC_URL, "confirmed");
    const kp = loadKeypair(KEYPAIR_PATH);

    console.log("=".repeat(72));
    console.log("inscribe-thread.ts  —  blockchan OP thread inscription");
    console.log("=".repeat(72));
    console.log("  rpc           ", RPC_URL);
    console.log("  signer        ", kp.publicKey.toBase58());
    console.log("  board         ", `/${BOARD_ID}/`);
    console.log("  mode          ", send ? "SEND (mainnet broadcast)" : "DRY-RUN (simulate only)");
    console.log();

    // ─── balance check ──────────────────────────────────────────────
    const lamports = await connection.getBalance(kp.publicKey);
    const sol = lamports / LAMPORTS_PER_SOL;
    console.log("  balance       ", sol.toFixed(6), "SOL");
    if (sol < 0.01) {
        console.error("  !! insufficient SOL (need at least ~0.01 for both tx).");
        process.exit(1);
    }

    // ─── post preview ───────────────────────────────────────────────
    const rowSize = JSON.stringify(POST).length;
    console.log();
    console.log("─── post preview ─────────────────────────────────────────────────");
    console.log("  name  :", POST.name);
    console.log("  sub   :", POST.sub);
    console.log("  com   : (" + POST.com.split("\n").length + " lines, " + POST.com.length + " chars)");
    console.log("  row   : ~" + rowSize + " bytes JSON");
    console.log();

    // ─── PDAs ───────────────────────────────────────────────────────
    const threadUuid = randomUUID();
    const boardSeed = resolveBoardSeed(BOARD_ID);
    const threadSeed = threadTableSeed(boardSeed, threadUuid);
    const threadPda = deriveTablePda(threadSeed);
    const threadTablePda = new PublicKey(threadPda);
    const threadInstrPda = new PublicKey(deriveInstructionTablePda(threadSeed));
    const feedPda = getFeedPda(DB_ROOT_KEY, boardSeed);

    const threadSeedBytes = Buffer.from(iqlabs.utils.toSeedBytes(threadSeed));
    const boardSeedBytes = Buffer.from(iqlabs.utils.toSeedBytes(boardSeed));

    console.log("─── derived PDAs ─────────────────────────────────────────────────");
    console.log("  threadSeed       ", threadSeed);
    console.log("  threadPda        ", threadPda);
    console.log("  instructionTable ", threadInstrPda.toBase58());
    console.log("  feedPda          ", feedPda.toBase58());
    console.log("  dbRootKey        ", DB_ROOT_KEY.toBase58());
    console.log();

    // ─── build TX1: create thread table (for future replies) ────────
    const builder = iqlabs.contract.createInstructionBuilder();
    const tx1 = new Transaction();
    tx1.add(
        iqlabs.contract.createExtTableInstruction(
            builder,
            {
                signer: kp.publicKey,
                db_root: DB_ROOT_KEY,
                table: threadTablePda,
                instruction_table: threadInstrPda,
                system_program: SystemProgram.programId,
            },
            {
                db_root_id: DB_ROOT_ID_BYTES,
                table_seed: threadSeedBytes,
                table_hint: Buffer.from(threadSeed),
                table_name: Buffer.from(threadSeed),
                column_names: BOARD_COLUMNS.map((c) => Buffer.from(c)),
                id_col: Buffer.from("time"),
                ext_keys: [],
                gate_opt: null,
                writers_opt: null,
            },
        ),
    );
    tx1.feePayer = kp.publicKey;
    tx1.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // ─── simulate TX1 ───────────────────────────────────────────────
    console.log("─── simulating TX1 (createExtTable for thread replies) ───────────");
    const sim = await connection.simulateTransaction(tx1);
    if (sim.value.err) {
        console.error("  SIMULATION FAILED:", JSON.stringify(sim.value.err));
        console.error("  logs:", (sim.value.logs ?? []).join("\n    "));
        process.exit(1);
    }
    const unitsTx1 = sim.value.unitsConsumed ?? 0;
    console.log("  simulation OK  ·  units consumed:", unitsTx1);
    console.log();

    // ─── TX2 quote: writeRow for board OP row ──────────────────────
    // writeRow handles chunking; for a ~1.7KB JSON row this will be
    // a single inline write + one metadata tx (~2 txs total).
    console.log("─── TX2 plan (writeRow to board table) ──────────────────────────");
    console.log("  row JSON bytes :", rowSize);
    console.log("  expected txs   :", rowSize < 900 ? 1 : Math.ceil(rowSize / 850) + 1, "(based on SDK chunking)");
    console.log();

    // ─── cost estimate ──────────────────────────────────────────────
    // TX1: ~5000 lamports base + ~3000 priority = 8000 lamports
    // TX1 rent for thread ext table PDA: variable (~0.01-0.02 SOL)
    // TX2: ~2 txs × 8000 lamports = 16000 lamports
    // TX2 rent for board row storage: varies by row size (~0.001-0.005 SOL)
    console.log("─── rough cost estimate ──────────────────────────────────────────");
    console.log("  TX1 fee          ~0.00001 SOL");
    console.log("  TX1 table rent   ~0.012  SOL  (one-time, thread replies table)");
    console.log("  TX2 fees         ~0.00002 SOL  (2 tx)");
    console.log("  TX2 row rent     ~0.003  SOL  (estimated)");
    console.log("  -----------------------------");
    console.log("  total            ~0.015  SOL  (~$2.25 at $150/SOL)");
    console.log("  after balance    ~" + (sol - 0.015).toFixed(4), "SOL");
    console.log();

    if (!send) {
        console.log("─── DRY-RUN ──────────────────────────────────────────────────────");
        console.log("  No transactions sent. Re-run with --send to broadcast.");
        console.log();
        return;
    }

    // ─── BROADCAST TX1 ──────────────────────────────────────────────
    console.log("─── sending TX1 ──────────────────────────────────────────────────");
    tx1.partialSign(kp);
    const tx1Sig = await connection.sendRawTransaction(tx1.serialize(), {
        skipPreflight: false,
    });
    console.log("  tx1 submitted  ", tx1Sig);
    console.log("  waiting for confirmation...");
    await connection.confirmTransaction(tx1Sig, "confirmed");
    console.log("  ✓ confirmed     ", explorer(tx1Sig));
    console.log();

    // ─── BROADCAST TX2 (writeRow to board) ──────────────────────────
    console.log("─── sending TX2 (writeRow) ───────────────────────────────────────");
    const row = {
        sub: POST.sub,
        com: POST.com,
        name: POST.name,
        time: Math.floor(Date.now() / 1000),
        ...(POST.img ? { img: POST.img } : {}),
        threadPda,
        threadSeed,
    };
    const tx2Sig = await iqlabs.writer.writeRow(
        connection,
        kp,                      // SignerInput accepts Keypair directly
        DB_ROOT_ID_BYTES,
        boardSeedBytes,
        JSON.stringify(row),
        false,
        [feedPda],
    );
    console.log("  ✓ confirmed     ", explorer(tx2Sig));
    console.log();

    // ─── notify gateway for instant render ──────────────────────────
    console.log("─── notifying gateway ────────────────────────────────────────────");
    const boardPda = deriveTablePda(boardSeed);
    const notifyBody = JSON.stringify({ txSignature: tx2Sig, row });
    for (const pda of [boardPda, threadPda]) {
        try {
            const res = await fetch(`${GATEWAY_URL}/table/${pda}/notify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: notifyBody,
            });
            console.log(`  ${pda.slice(0, 12)}…  → ${res.status} ${res.statusText}`);
        } catch (e) {
            console.log(`  ${pda.slice(0, 12)}…  → FAILED (non-critical): ${e instanceof Error ? e.message : e}`);
        }
    }
    console.log();

    const finalBalance = await connection.getBalance(kp.publicKey);
    console.log("─── done ─────────────────────────────────────────────────────────");
    console.log("  spent          ", ((lamports - finalBalance) / LAMPORTS_PER_SOL).toFixed(6), "SOL");
    console.log("  balance now    ", (finalBalance / LAMPORTS_PER_SOL).toFixed(6), "SOL");
    console.log();
    console.log("  🧲 view local (dev server):");
    console.log(`     http://localhost:3000/#/${BOARD_ID}/${threadPda}`);
    console.log("  🌐 thread live on blockchan after cache refresh:");
    console.log(`     https://blockchan.sol.site/#/${BOARD_ID}/${threadPda}`);
    console.log();
}

main().catch((e) => {
    console.error("FATAL:", e instanceof Error ? e.message : e);
    if (e instanceof Error && e.stack) console.error(e.stack);
    process.exit(1);
});
