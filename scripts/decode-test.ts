import { Connection } from "@solana/web3.js";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import iqlabs from "iqlabs-sdk";
import { DB_ROOT_ID } from "../src/lib/constants";

const idl = require("iqlabs-sdk/idl/code_in.json");

async function main() {
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const coder = new BorshAccountsCoder(idl);
    const dbRootSeed = iqlabs.utils.toSeedBytes(DB_ROOT_ID);
    const dbRoot = iqlabs.contract.getDbRootPda(Buffer.from(dbRootSeed));
    const tableSeed = iqlabs.utils.toSeedBytes("iq");
    const tablePda = iqlabs.contract.getTablePda(dbRoot, tableSeed);
    const info = await connection.getAccountInfo(tablePda);
    if (!info) { console.log("no account"); return; }
    const decoded = coder.decode("Table", info.data) as any;
    console.log("gate keys:", Object.keys(decoded.gate));
    console.log("gate raw:", JSON.stringify(decoded.gate, null, 2));

    // Test SDK fetchTableMeta
    const meta = await iqlabs.reader.fetchTableMeta(connection, iqlabs.contract.PROGRAM_ID, DB_ROOT_ID, "iq");
    const gate = meta.gate as any;
    console.log("gate keys:", Object.keys(gate));
    console.log("mint type:", typeof gate.mint, gate.mint?.constructor?.name);
    console.log("mint toBase58:", gate.mint?.toBase58?.());
    console.log("mint toString:", gate.mint?.toString?.());
}
main().catch(console.error);
