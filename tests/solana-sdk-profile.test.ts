import { expect, test } from "bun:test";
import { Connection, Keypair, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";

test("browser wallet stays on the supported legacy profile without exposing a secret key", async () => {
    const keypair = Keypair.generate();
    const wallet = { publicKey: keypair.publicKey, signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) => tx };
    const connection = new Connection("http://127.0.0.1:19099");
    connection.getAccountInfo = async () => { throw new Error("wallet profile must not require feature probing"); };
    expect(iqlabs.utils.canSignV1(wallet)).toBe(false);
    expect((await iqlabs.utils.resolveTxProfile(connection, wallet)).version).toBe("legacy");
    expect(iqlabs.utils.canSignV1(keypair)).toBe(true);
});
