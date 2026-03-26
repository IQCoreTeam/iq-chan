const { Connection, PublicKey } = require("@solana/web3.js");
const iqlabs = require("iqlabs-sdk").default;

async function main() {
    const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=f27e768e-586d-4e00-a35e-ef4d504101f5", "confirmed");
    const DB_ROOT_ID_BYTES = Buffer.from(iqlabs.utils.toSeedBytes("iqchan"));
    const DB_ROOT_KEY = iqlabs.contract.getDbRootPda(DB_ROOT_ID_BYTES);
    console.log("DB_ROOT_KEY:", DB_ROOT_KEY.toBase58());

    const { BorshAccountsCoder } = require("@coral-xyz/anchor");
    const idl = require("iqlabs-sdk/idl/code_in.json");
    const coder = new BorshAccountsCoder(idl);
    const info = await connection.getAccountInfo(DB_ROOT_KEY);
    if (!info) { console.log("DbRoot not found"); return; }
    const decoded = coder.decode("DbRoot", info.data);
    console.log("creator:", decoded.creator?.toBase58());
    console.log("table_creators:", (decoded.table_creators ?? []).map((pk: any) => pk.toBase58()));
    console.log("ext_creators:", (decoded.ext_creators ?? []).map((pk: any) => pk.toBase58()));

    const target = "B8d355pft6DfrQNetCqXNumRk8WoEs21waqeuPP3HUJC";
    const isCreator = decoded.creator?.toBase58() === target;
    const isTableCreator = (decoded.table_creators ?? []).some((pk: any) => pk.toBase58() === target);
    const isExtCreator = (decoded.ext_creators ?? []).some((pk: any) => pk.toBase58() === target);
    console.log(`\n${target}:`);
    console.log("  isCreator:", isCreator);
    console.log("  isTableCreator:", isTableCreator);
    console.log("  isExtCreator:", isExtCreator);
}
main().catch(console.error);
