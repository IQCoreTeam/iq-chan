"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { FooterNav } from "../board-nav";
import { useBoards } from "../../hooks/use-boards";
import { DB_ROOT_ID, DB_ROOT_ID_BYTES, DB_ROOT_KEY } from "../../lib/constants";
import { SEED_TO_BOARD_ID } from "../../lib/board";

const idl = require("iqlabs-sdk/idl/code_in.json");

export default function AdminPage() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { creator } = useBoards();
    const [status, setStatus] = useState("");
    const [tableSeeds, setTableSeeds] = useState<string[]>([]);
    const [globalTableSeeds, setGlobalTableSeeds] = useState<string[]>([]);
    const [onboardInput, setOnboardInput] = useState("");
    const [adminInput, setAdminInput] = useState("");

    const isAdmin = wallet.publicKey?.toBase58() === creator;

    useEffect(() => {
        iqlabs.reader.getTablelistFromRoot(connection, DB_ROOT_ID)
            .then(({ tableSeeds: ts, globalTableSeeds: gs }) => {
                setTableSeeds(ts as string[]);
                setGlobalTableSeeds(gs as string[]);
            })
            .catch(() => {});
    }, [connection]);

    const tableSeedSet = new Set(tableSeeds);

    function seedLabel(hex: string): string {
        const known = SEED_TO_BOARD_ID.get(hex);
        return known ? `/${known}/` : hex.slice(0, 12) + "...";
    }

    async function sendInstruction(ix: ReturnType<typeof iqlabs.contract.onboardTableInstruction>) {
        if (!wallet.publicKey || !wallet.signTransaction) return;
        const tx = new Transaction().add(ix);
        tx.feePayer = wallet.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signed = await wallet.signTransaction(tx);
        await connection.sendRawTransaction(signed.serialize());
    }

    async function handleOnboard() {
        if (!onboardInput) return;
        setStatus(`Onboarding /${onboardInput}/...`);
        try {
            const builder = iqlabs.contract.createInstructionBuilder(idl, iqlabs.contract.PROGRAM_ID);
            await sendInstruction(
                iqlabs.contract.onboardTableInstruction(builder, {
                    signer: wallet.publicKey!,
                    db_root: DB_ROOT_KEY,
                }, {
                    db_root_id: DB_ROOT_ID_BYTES,
                    table_seed: iqlabs.utils.toSeedBytes(onboardInput),
                }),
            );
            setStatus(`/${onboardInput}/ onboarded`);
            setOnboardInput("");
        } catch (e) {
            setStatus(e instanceof Error ? e.message : String(e));
        }
    }

    async function handleManageCreators() {
        if (!adminInput) return;
        setStatus("Updating table creators...");
        try {
            const builder = iqlabs.contract.createInstructionBuilder(idl, iqlabs.contract.PROGRAM_ID);
            const admins = adminInput.split(",").map((s) => new PublicKey(s.trim()));
            await sendInstruction(
                iqlabs.contract.manageTableCreatorsInstruction(builder, {
                    signer: wallet.publicKey!,
                    db_root: DB_ROOT_KEY,
                    system_program: SystemProgram.programId,
                }, {
                    db_root_id: DB_ROOT_ID_BYTES,
                    table_creators: admins,
                    ext_creators: [],
                }),
            );
            setStatus("Table creators updated");
            setAdminInput("");
        } catch (e) {
            setStatus(e instanceof Error ? e.message : String(e));
        }
    }

    return (
        <>
            <div className="boardBanner">
                <div className="boardTitle">/admin/ - Board Management</div>
            </div>

            <div className="board" style={{ maxWidth: "700px", margin: "0 auto", padding: "10px 20px" }}>
                {!wallet.publicKey ? (
                    <p style={{ textAlign: "center", padding: "20px", color: "#89a" }}>Connect wallet</p>
                ) : !isAdmin ? (
                    <p style={{ textAlign: "center", padding: "20px", color: "#c33" }}>
                        Not authorized (dbRoot creator: {creator ? `${creator.slice(0, 8)}...` : "unknown"})
                    </p>
                ) : (
                    <>
                        {/* Board seeds — Public vs Private */}
                        <div style={{ fontSize: "12px", marginBottom: "16px" }}>
                            <b>Public boards</b> (in table_seeds — shown on homepage):
                            <div style={{ fontFamily: "monospace", fontSize: "11px", padding: "4px 0", color: "#789922" }}>
                                {tableSeeds.length === 0
                                    ? <span style={{ color: "#89a" }}>None onboarded yet</span>
                                    : tableSeeds.map((s) => seedLabel(s)).join(", ")}
                            </div>
                        </div>

                        <div style={{ fontSize: "12px", marginBottom: "16px" }}>
                            <b>All tables</b> (global_table_seeds — {globalTableSeeds.length} total):
                            <div style={{ fontFamily: "monospace", fontSize: "10px", padding: "4px 0", maxHeight: "120px", overflow: "auto" }}>
                                {globalTableSeeds.map((s) => (
                                    <div key={s} style={{ color: tableSeedSet.has(s) ? "#789922" : "#89a" }}>
                                        {tableSeedSet.has(s) ? "[Public] " : "[Private] "}
                                        {seedLabel(s)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Onboard */}
                        <div className="postForm" style={{ marginBottom: "16px" }}>
                            <table>
                                <tbody>
                                    <tr>
                                        <td className="label">Onboard</td>
                                        <td>
                                            <span style={{ fontSize: "10pt" }}>/</span>
                                            <input
                                                type="text"
                                                value={onboardInput}
                                                onChange={(e) => setOnboardInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                                                placeholder="boardid"
                                                style={{ width: "120px" }}
                                            />
                                            <span style={{ fontSize: "10pt" }}>/</span>
                                            {" "}
                                            <input
                                                type="submit"
                                                onClick={(e) => { e.preventDefault(); handleOnboard(); }}
                                                disabled={!onboardInput}
                                                value="Onboard"
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Manage table creators */}
                        <div className="postForm">
                            <table>
                                <tbody>
                                    <tr>
                                        <td className="label">Admins</td>
                                        <td>
                                            <input
                                                type="text"
                                                value={adminInput}
                                                onChange={(e) => setAdminInput(e.target.value)}
                                                placeholder="pubkey1, pubkey2"
                                            />
                                            {" "}
                                            <input
                                                type="submit"
                                                onClick={(e) => { e.preventDefault(); handleManageCreators(); }}
                                                disabled={!adminInput}
                                                value="Set Creators"
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {status && <p style={{ marginTop: "10px", fontSize: "11px", color: "#789922" }}>{status}</p>}
                    </>
                )}
            </div>
            <FooterNav />
        </>
    );
}
