/**
 * check-chain.mjs — Verify on-chain state for iqchan boards/threads
 *
 * Usage:
 *   node scripts/check-chain.mjs [boardId]
 *
 * Default boardId: "po"
 *
 * This script checks:
 *   1. DB Root account exists
 *   2. Threads table PDA + gateway index
 *   3. Thread rows from gateway
 *   4. Feed PDA signatures (bump order)
 *
 * Result tells you if the problem is writer-side or viewer-side.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";

// ── Config ─────────────────────────────────────────────────────────────────

const RPC_URL =
    process.env.NEXT_PUBLIC_RPC_ENDPOINT ||
    "process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"";
const GATEWAY = "https://gateway.iqlabs.dev";
const DB_ROOT_ID = "iqchan";
const FEED_SEED_PREFIX = "feedmY}AGBJiqLabs";
const PROGRAM_ID = iqlabs.contract.PROGRAM_ID;

const boardId = process.argv[2] || "po";

const connection = new Connection(RPC_URL, "confirmed");

// ── Helpers ────────────────────────────────────────────────────────────────

function getDbRootKey() {
    return iqlabs.contract.getDbRootPda(iqlabs.utils.toSeedBytes(DB_ROOT_ID));
}

function deriveTablePda(seed) {
    const dbRootKey = getDbRootKey();
    const seedBytes = iqlabs.utils.toSeedBytes(seed);
    return iqlabs.contract.getTablePda(dbRootKey, seedBytes);
}

function getFeedPda(boardId) {
    const dbRootKey = getDbRootKey();
    const boardIdHash = iqlabs.utils.toSeedBytes(boardId);
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(FEED_SEED_PREFIX),
            PROGRAM_ID.toBuffer(),
            dbRootKey.toBuffer(),
            Buffer.from(boardIdHash),
        ],
        PROGRAM_ID,
    )[0];
}

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { _error: true, status: res.status, body };
    }
    return res.json();
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  iqchan On-Chain Checker");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("RPC:     ", RPC_URL.replace(/api-key=.*/, "api-key=***"));
    console.log("Gateway: ", GATEWAY);
    console.log("Board:   ", boardId);
    console.log("");

    // ── 1. DB Root ─────────────────────────────────────────────────────
    const dbRootKey = getDbRootKey();
    console.log("── Step 1: DB Root ──────────────────────────────────────");
    console.log("  dbRootKey:", dbRootKey.toBase58());

    const dbRootInfo = await connection.getAccountInfo(dbRootKey);
    if (dbRootInfo) {
        console.log("  ✅ DB Root account EXISTS (size:", dbRootInfo.data.length, "bytes)");
    } else {
        console.log("  ❌ DB Root account DOES NOT EXIST");
        console.log("  → Writer problem: DB has never been initialized");
        return;
    }
    console.log("");

    // ── 2. Threads Table PDA ───────────────────────────────────────────
    const threadsSeed = `boards/${boardId}/threads`;
    const threadsTablePda = deriveTablePda(threadsSeed);

    console.log("── Step 2: Threads Table ────────────────────────────────");
    console.log("  seed:", threadsSeed);
    console.log("  PDA: ", threadsTablePda.toBase58());

    const threadsTableInfo = await connection.getAccountInfo(threadsTablePda);
    if (threadsTableInfo) {
        console.log("  ✅ Threads table account EXISTS (size:", threadsTableInfo.data.length, "bytes)");
    } else {
        console.log("  ❌ Threads table account DOES NOT EXIST on-chain");
        console.log("  → Writer problem: createExtTable for threads was never called (or failed)");
        return;
    }
    console.log("");

    // ── 3. Gateway Index ───────────────────────────────────────────────
    console.log("── Step 3: Gateway Index ────────────────────────────────");
    const indexUrl = `${GATEWAY}/table/${threadsTablePda.toBase58()}/index`;
    console.log("  URL:", indexUrl);

    const indexData = await fetchJson(indexUrl);
    if (indexData._error) {
        console.log("  ❌ Gateway returned HTTP", indexData.status);
        console.log("  Response:", indexData.body);
        console.log("");
        console.log("  → The on-chain table exists but gateway can't read it.");
        console.log("  → Possible: gateway hasn't indexed yet, or PDA mismatch.");
        console.log("");

        // Try RPC direct check
        console.log("  Trying direct RPC getSignaturesForAddress...");
        const directSigs = await connection.getSignaturesForAddress(threadsTablePda, { limit: 10 });
        console.log("  RPC signatures for threadsTablePda:", directSigs.length);
        for (const s of directSigs) {
            console.log("    -", s.signature, "| slot:", s.slot, "| err:", s.err);
        }
        return;
    }

    const sigs = indexData.signatures ?? [];
    console.log("  ✅ Gateway returned", sigs.length, "signatures");

    if (sigs.length === 0) {
        console.log("");
        console.log("  ⚠️  Table exists on-chain but gateway index is EMPTY.");
        console.log("  → Checking RPC directly for transactions on this PDA...");
        console.log("");

        const directSigs = await connection.getSignaturesForAddress(threadsTablePda, { limit: 10 });
        console.log("  RPC signatures for threadsTablePda:", directSigs.length);
        for (const s of directSigs) {
            console.log("    -", s.signature, "| slot:", s.slot, "| err:", s.err);
        }

        if (directSigs.length > 0) {
            console.log("");
            console.log("  DIAGNOSIS: On-chain data EXISTS but gateway hasn't indexed it yet.");
            console.log("  → Viewer problem: Gateway is behind or not syncing this PDA.");
        } else {
            console.log("");
            console.log("  DIAGNOSIS: Table account exists but NO writeRow transactions found.");
            console.log("  → Writer problem: writeRow may have silently failed or wrote to wrong PDA.");
        }
        return;
    }

    console.log("  First 5 sigs:");
    for (const s of sigs.slice(0, 5)) {
        console.log("    -", s);
    }
    console.log("");

    // ── 4. Fetch Thread Rows ───────────────────────────────────────────
    console.log("── Step 4: Fetch Thread Rows ────────────────────────────");
    const sliceUrl = `${GATEWAY}/table/${threadsTablePda.toBase58()}/slice?sigs=${sigs.slice(0, 10).join(",")}`;
    const sliceData = await fetchJson(sliceUrl);

    if (sliceData._error) {
        console.log("  ❌ Gateway slice returned HTTP", sliceData.status);
        console.log("  Response:", sliceData.body);
        console.log("  → Viewer problem: Gateway can index but can't decode row data.");
        return;
    }

    const rows = sliceData.rows ?? [];
    console.log("  ✅ Got", rows.length, "thread rows from gateway");
    for (const row of rows) {
        console.log("  ┌ no:", row.no);
        console.log("  │ sub:", row.sub);
        console.log("  │ com:", (row.com || "").slice(0, 80) + ((row.com || "").length > 80 ? "..." : ""));
        console.log("  │ name:", row.name);
        console.log("  │ time:", row.time, row.time ? `(${new Date(row.time * 1000).toISOString()})` : "");
        console.log("  └ img:", row.img || "(none)");
        console.log("");
    }

    // ── 5. Feed PDA (Bump Order) ───────────────────────────────────────
    console.log("── Step 5: Feed PDA (Bump Order) ────────────────────────");
    const feedPda = getFeedPda(boardId);
    console.log("  feedPda:", feedPda.toBase58());

    const feedSigs = await connection.getSignaturesForAddress(feedPda, { limit: 20 });
    console.log("  Feed signatures (RPC):", feedSigs.length);
    for (const s of feedSigs.slice(0, 5)) {
        console.log("    -", s.signature, "| slot:", s.slot);
    }
    console.log("");

    // ── Summary ────────────────────────────────────────────────────────
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  SUMMARY");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  DB Root:        ✅ exists");
    console.log("  Threads Table:  ✅ exists on-chain");
    console.log("  Gateway Index:  " + (sigs.length > 0 ? `✅ ${sigs.length} signatures` : "❌ empty"));
    console.log("  Thread Rows:    " + (rows.length > 0 ? `✅ ${rows.length} rows readable` : "❌ no rows"));
    console.log("  Feed (Bump):    " + (feedSigs.length > 0 ? `✅ ${feedSigs.length} entries` : "⚠️  empty (bump order won't work)"));
    console.log("");

    if (rows.length > 0) {
        console.log("  → Data IS on-chain and readable via gateway.");
        console.log("  → Problem is likely in VIEWER code (use-threads.ts).");
        console.log("  → Check that the PDA derived in the browser matches:");
        console.log("    " + threadsTablePda.toBase58());
    }
}

main().catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
});
