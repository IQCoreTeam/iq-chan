import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

async function main() {
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const wallet = new PublicKey("FPSYQmFh1WhbrgNKoQCDBcrf3YLc9eoNCpTyAjHXrf1c");
    const iqMint = new PublicKey("3uXACfojUrya7VH51jVC1DCHq3uzK4A7g469Q954LABS");

    const ata = getAssociatedTokenAddressSync(iqMint, wallet);
    const balance = await connection.getTokenAccountBalance(ata);
    console.log("IQ balance:", balance.value.uiAmount);
}
main().catch(e => console.log("No ATA:", e.message));
