"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
// @ts-ignore — bn.js lacks type declarations
import BN from "bn.js";
import HashLink from "../hash-link";
import { FooterNav } from "../board-nav";
import { useBoards } from "../../hooks/use-boards";
import {
    DB_ROOT_ID_BYTES,
    DB_ROOT_KEY,
    deriveTablePda,
    deriveInstructionTablePda,
} from "../../lib/constants";

const idl = require("iqlabs-sdk/idl/code_in.json");
const METADATA_COLUMNS = ["title", "description", "image", "time"];

export default function AddBoardPage() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { creator } = useBoards();
    const [boardId, setBoardId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [gateMint, setGateMint] = useState("");
    const [gateAmount, setGateAmount] = useState("1");
    const [gateType, setGateType] = useState(0); // 0 = Token, 1 = Collection
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [created, setCreated] = useState(false);

    const isAdmin = wallet.publicKey?.toBase58() === creator;

    async function handleCreate() {
        if (!wallet.publicKey || !wallet.signTransaction) return;
        if (!boardId.match(/^[a-z0-9]{1,10}$/)) {
            setError("Board ID: 1-10 lowercase letters/numbers");
            return;
        }
        if (!title) { setError("Title required"); return; }

        setLoading(true);
        setError("");

        try {
            const builder = iqlabs.contract.createInstructionBuilder(idl, iqlabs.contract.PROGRAM_ID);
            const dbRootIdBytes = DB_ROOT_ID_BYTES;

            const gate = gateMint ? {
                mint: new PublicKey(gateMint),
                amount: new BN(parseInt(gateAmount) || 1),
                gate_type: gateType,
            } : null;

            // Step 1: Create board table (seed: boardId) — goes into global_table_seeds
            const boardSeedBytes = Buffer.from(iqlabs.utils.toSeedBytes(boardId));
            const boardTablePda = new PublicKey(deriveTablePda(boardId));
            const boardInstrPda = new PublicKey(deriveInstructionTablePda(boardId));

            const boardIx = iqlabs.contract.createExtTableInstruction(builder, {
                signer: wallet.publicKey,
                db_root: DB_ROOT_KEY,
                table: boardTablePda,
                instruction_table: boardInstrPda,
                system_program: SystemProgram.programId,
            }, {
                db_root_id: dbRootIdBytes,
                table_seed: boardSeedBytes,
                table_name: Buffer.from(boardId),
                column_names: METADATA_COLUMNS.map((c) => Buffer.from(c)),
                id_col: Buffer.from("time"),
                ext_keys: [],
                gate_opt: gate,
                writers_opt: null,
            });

            // Step 2: Create metadata table (seed: "{boardId}/metadata")
            const metaSeed = `${boardId}/metadata`;
            const metaSeedBytes = Buffer.from(iqlabs.utils.toSeedBytes(metaSeed));
            const metaTablePda = new PublicKey(deriveTablePda(metaSeed));
            const metaInstrPda = new PublicKey(deriveInstructionTablePda(metaSeed));

            const metaIx = iqlabs.contract.createExtTableInstruction(builder, {
                signer: wallet.publicKey,
                db_root: DB_ROOT_KEY,
                table: metaTablePda,
                instruction_table: metaInstrPda,
                system_program: SystemProgram.programId,
            }, {
                db_root_id: dbRootIdBytes,
                table_seed: metaSeedBytes,
                table_name: Buffer.from(metaSeed),
                column_names: METADATA_COLUMNS.map((c) => Buffer.from(c)),
                id_col: Buffer.from("time"),
                ext_keys: [],
                gate_opt: null,
                writers_opt: null,
            });

            // Send both table creations in one tx
            const tx = new Transaction().add(boardIx, metaIx);
            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            const signed = await wallet.signTransaction(tx);
            await connection.sendRawTransaction(signed.serialize());

            // Step 3: Write metadata row
            const metaRow = JSON.stringify({
                title,
                description,
                image: imageUrl,
                time: Date.now(),
            });
            await iqlabs.writer.writeRow(
                connection, wallet as any, dbRootIdBytes, metaSeedBytes, metaRow,
            );

            setCreated(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }

    if (created) {
        return (
            <>
                <div className="board" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <h2 className="boardTitle">Board Created</h2>
                    <p style={{ margin: "20px 0" }}>
                        <b>/{boardId}/</b> — {title}
                    </p>
                    <p>
                        <HashLink href={`/${boardId}`} className="quoteLink">
                            Go to /{boardId}/ &rarr;
                        </HashLink>
                    </p>
                    {!isAdmin && (
                        <p style={{ marginTop: "10px", fontSize: "11px", color: "#89a" }}>
                            This board is private until an admin onboards it.
                        </p>
                    )}
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
                                        value={boardId}
                                        onChange={(e) => setBoardId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
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
                                        disabled={loading || !boardId || !title}
                                        value={loading ? "Creating..." : "Create Board"}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td className="label">Description</td>
                                <td>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Discussion about Solana"
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td className="label">Image URL</td>
                                <td>
                                    <input
                                        type="text"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value.trim())}
                                        placeholder="https://... (optional)"
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td className="label">Token Gate</td>
                                <td>
                                    <input
                                        type="text"
                                        value={gateMint}
                                        onChange={(e) => setGateMint(e.target.value.trim())}
                                        placeholder="Mint address (optional)"
                                        style={{ fontFamily: "monospace", fontSize: "11px" }}
                                    />
                                </td>
                            </tr>
                            {gateMint && (
                                <>
                                    <tr>
                                        <td className="label">Gate Type</td>
                                        <td>
                                            <select value={gateType} onChange={(e) => setGateType(Number(e.target.value))}>
                                                <option value={0}>Token</option>
                                                <option value={1}>Collection</option>
                                            </select>
                                        </td>
                                    </tr>
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
                                </>
                            )}
                        </tbody>
                    </table>

                    {error && <div style={{ color: "red", marginTop: "8px", fontSize: "12px" }}>{error}</div>}
                </div>
                )}

                <div style={{ marginTop: "16px", fontSize: "11px", color: "#89a", lineHeight: "1.6" }}>
                    <p>
                        Your board will be <b>private</b> by default — it won't appear on the
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
