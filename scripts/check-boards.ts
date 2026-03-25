import { Connection } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { DB_ROOT_ID } from "../src/lib/constants";

async function main() {
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const { creator, tableSeeds, globalTableSeeds } = await iqlabs.reader.getTablelistFromRoot(connection, DB_ROOT_ID) as any;
    console.log("tableSeeds (onboarded):", tableSeeds);
    console.log("globalTableSeeds count:", globalTableSeeds?.length);
}
main().catch(console.error);
