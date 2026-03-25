import { Connection } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { DB_ROOT_ID } from "../src/lib/constants";

async function main() {
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    for (const boardId of ["iq", "po", "biz", "a", "g"]) {
        try {
            const meta = await iqlabs.reader.fetchTableMeta(connection, iqlabs.contract.PROGRAM_ID, DB_ROOT_ID, boardId);
            console.log(`[${boardId}]`, JSON.stringify({
                name: meta.name,
                gate_mint: meta.gate?.mint?.toBase58?.() ?? null,
                gate_amount: meta.gate?.amount?.toNumber?.() ?? null,
                gate_type: meta.gate?.gateType ?? null,
            }));
        } catch (e) {
            console.log(`[${boardId}] no table account`);
        }
    }
}
main().catch(console.error);
