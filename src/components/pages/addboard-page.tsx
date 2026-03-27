"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
// @ts-ignore — bn.js lacks type declarations
import BN from "bn.js";
import HashLink from "../hash-link";
import { FooterNav } from "../board-nav";
import {
    DB_ROOT_ID_BYTES,
    DB_ROOT_KEY,
    deriveTablePda,
    deriveInstructionTablePda,
} from "../../lib/constants";

const idl = require("iqlabs-sdk/idl/code_in.json");

export default function AddBoardPage() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [slug, setSlug] = useState("");
    const [title, setTitle] = useState("");
    const [gateEnabled, setGateEnabled] = useState(false);
    const [gateMint, setGateMint] = useState("");
    const [gateAmount, setGateAmount] = useState("1");
    const [gateType, setGateType] = useState(0); // 0 = Token, 1 = Collection
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [createdSeed, setCreatedSeed] = useState("");


    async function handleCreate() {
        if (!wallet.publicKey || !wallet.signTransaction) return;
        if (!slug) { setError("Board ID required"); return; }
        if (!title) { setError("Title required"); return; }

        setLoading(true);
        setError("");

        try {
            const builder = iqlabs.contract.createInstructionBuilder(idl, iqlabs.contract.PROGRAM_ID);
            const dbRootIdBytes = DB_ROOT_ID_BYTES;

            const gate = gateEnabled && gateMint ? {
                mint: new PublicKey(gateMint),
                amount: new BN(gateType === 1 ? 1 : parseInt(gateAmount) || 1),
                gate_type: gateType,
            } : null;

            // Step 1: Create board table (seed: slug) — goes into global_table_seeds
            const boardSeed = slug;
            const boardSeedBytes = Buffer.from(iqlabs.utils.toSeedBytes(boardSeed));
            const boardTablePda = new PublicKey(deriveTablePda(boardSeed));
            const boardInstrPda = new PublicKey(deriveInstructionTablePda(boardSeed));

            const boardIx = iqlabs.contract.createExtTableInstruction(builder, {
                signer: wallet.publicKey,
                db_root: DB_ROOT_KEY,
                table: boardTablePda,
                instruction_table: boardInstrPda,
                system_program: SystemProgram.programId,
            }, {
                db_root_id: dbRootIdBytes,
                table_seed: boardSeedBytes,
                table_name: Buffer.from(title),
                column_names: ["sub", "com", "name", "time", "img", "threadPda", "threadSeed"].map((c) => Buffer.from(c)),
                id_col: Buffer.from("time"),
                ext_keys: [],
                gate_opt: gate,
                writers_opt: null,
            });


            // Send board table creation tx
            const tx = new Transaction().add(boardIx);
            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            const signed = await wallet.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signed.serialize());
            await connection.confirmTransaction(sig, "confirmed");

            setCreatedSeed(boardSeed);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }

    if (createdSeed) {
        return (
            <>
                <div className="board" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <h2 className="boardTitle">Board Created</h2>
                    <p style={{ margin: "20px 0" }}><b>{title}</b></p>
                    <p style={{ fontSize: "11px", color: "#c33", marginBottom: "10px" }}>
                        Save this link — it cannot be recovered.
                    </p>
                    <p style={{ margin: "10px 0", fontFamily: "monospace", fontSize: "13px", wordBreak: "break-all", background: "#f0e0d6", padding: "8px", border: "1px solid #d9bfb7", cursor: "pointer" }}
                        onClick={() => { navigator.clipboard.writeText(`blockchan.xyz/#${createdSeed}`); }}
                        title="Click to copy"
                    >
                        blockchan.xyz/#{createdSeed}
                    </p>
                    <p>
                        <HashLink href={`/${createdSeed}`} className="quoteLink">
                            Go to your board &rarr;
                        </HashLink>
                    </p>
                    <p style={{ marginTop: "10px", fontSize: "11px", color: "#89a" }}>
                        This board is unlisted until an admin onboards it.
                    </p>
                </div>
                <FooterNav />
            </>
        );
    }

    return (
        <>
            <div className="boardBanner">
                <div className="boardTitle">Create New Board</div>
            </div>

            <div className="board" style={{ maxWidth: "480px", margin: "0 auto", padding: "10px 20px" }}>
                {!wallet.publicKey ? (
                    <p style={{ textAlign: "center", padding: "20px", color: "#89a" }}>Connect your wallet to create a board.</p>
                ) : (
                <div className="postForm">
                    <table>
                        <tbody>
                            <tr>
                                <td className="label">Board</td>
                                <td>
                                    <span style={{ fontSize: "10pt" }}>/</span>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                                        placeholder="biz"
                                        maxLength={10}
                                        style={{ width: "120px" }}
                                    /><span style={{ fontSize: "10pt" }}>/</span>
                                </td>
                            </tr>
                            <tr>
                                <td className="label">Title</td>
                                <td>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Solana General"
                                    />
                                    <input
                                        type="submit"
                                        onClick={(e) => { e.preventDefault(); handleCreate(); }}
                                        disabled={loading || !slug || !title}
                                        value={loading ? "Creating..." : "Create Board"}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td className="label">Token Gate</td>
                                <td>
                                    <label style={{ fontSize: "12px", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={gateEnabled}
                                            onChange={(e) => setGateEnabled(e.target.checked)}
                                            style={{ marginRight: "6px" }}
                                        />
                                        Enable token gate
                                    </label>
                                </td>
                            </tr>
                            {gateEnabled && (
                                <>
                                    <tr>
                                        <td className="label">Gate Type</td>
                                        <td>
                                            <select value={gateType} onChange={(e) => setGateType(Number(e.target.value))}>
                                                <option value={0}>Token — min amount required</option>
                                                <option value={1}>Collection — NFT ownership check</option>
                                            </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="label">Mint Address</td>
                                        <td>
                                            <input
                                                type="text"
                                                value={gateMint}
                                                onChange={(e) => setGateMint(e.target.value.trim())}
                                                placeholder="Token or collection mint"
                                                style={{ fontFamily: "monospace", fontSize: "11px", width: "300px" }}
                                            />
                                        </td>
                                    </tr>
                                    {gateType === 0 && (
                                        <tr>
                                            <td className="label">Min Amount</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={gateAmount}
                                                    onChange={(e) => setGateAmount(e.target.value)}
                                                    min="1"
                                                    style={{ width: "80px" }}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>

                    {error && <div style={{ color: "red", marginTop: "8px", fontSize: "12px" }}>{error}</div>}
                </div>
                )}

                <div style={{ marginTop: "16px", fontSize: "11px", color: "#89a", lineHeight: "1.6" }}>
                    <p>
                        Your board will be <b>unlisted</b> by default — it won't appear on the
                        homepage. Save your board ID and share the link directly with your
                        community.
                    </p>
                    <p style={{ marginTop: "6px" }}>
                        (<code>blockchan.xyz/#/your-board-id</code>)
                    </p>
                    <p style={{ marginTop: "8px" }}>
                        If your board gains traction and you'd like it listed on the main page,
                        reach out on our{" "}
                        <HashLink href="/feedback" style={{ color: "#34345C" }}>feedback page</HashLink>.
                        Active boards with real communities can be promoted to official status.
                    </p>
                </div>
            </div>
            <FooterNav />
        </>
    );
}
