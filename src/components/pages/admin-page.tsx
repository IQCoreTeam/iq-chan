"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import iqlabs from "iqlabs-sdk";
import { FooterNav } from "../board-nav";
import { DB_ROOT_ID, DB_ROOT_ID_BYTES, DB_ROOT_KEY, BOARD_COLUMNS } from "../../lib/constants";
import { SEED_TO_BOARD_ID } from "../../lib/board";

const idl = require("iqlabs-sdk/idl/code_in.json");

export default function AdminPage() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [creator, setCreator] = useState<string | null>(null);
    const [status, setStatus] = useState("");
    const [tableSeeds, setTableSeeds] = useState<string[]>([]);
    const [globalTableSeeds, setGlobalTableSeeds] = useState<string[]>([]);
    // seedHex → on-chain table name (only for seeds that have a named Table account)
    const [tableNames, setTableNames] = useState<Map<string, string>>(new Map());
    const [onboardInput, setOnboardInput] = useState("");
    const [creatorList, setCreatorList] = useState<string[]>([]);
    const [updateSeed, setUpdateSeed] = useState("");
    const [updateName, setUpdateName] = useState("");

    const pubkey = wallet.publicKey?.toBase58();
    const isOwner = pubkey === creator;
    const isTableCreator = creatorList.includes(pubkey ?? "");
    const isAdmin = isOwner || isTableCreator;

    useEffect(() => {
        iqlabs.reader.getTablelistFromRoot(connection, DB_ROOT_ID)
            .then(async (result: any) => {
                const { tableSeeds: ts, globalTableSeeds: gs, creator: c } = result;
                setTableSeeds(ts as string[]);
                setGlobalTableSeeds(gs as string[]);
                if (c) setCreator(c);

                // Load existing table_creators by decoding DbRoot account directly
                try {
                    const { BorshAccountsCoder } = await import("@coral-xyz/anchor");
                    const idl = require("iqlabs-sdk/idl/code_in.json");
                    const coder = new BorshAccountsCoder(idl);
                    const info = await connection.getAccountInfo(DB_ROOT_KEY);
                    if (info) {
                        const decoded = coder.decode("DbRoot", info.data) as any;
                        const creators: PublicKey[] = decoded.table_creators ?? [];
                        if (creators.length > 0) {
                            setCreatorList(creators.map((pk: PublicKey) => pk.toBase58()));
                        }
                    }
                } catch { /* ignore */ }

                // Fetch on-chain Table.name for each seed — only board Tables will have one.
                // Thread/metadata tables (e.g. "po/thread/...", "po/metadata") won't match a
                // top-level Table PDA and fetchTableMeta will throw — we just skip those.
                const names = new Map<string, string>();
                await Promise.allSettled(
                    (gs as string[]).map(async (hex) => {
                        try {
                            const meta = await iqlabs.reader.fetchTableMeta(
                                connection, iqlabs.contract.PROGRAM_ID, DB_ROOT_ID,
                                Buffer.from(hex, "hex"),
                            );
                            if (meta.name) names.set(hex, meta.name);
                        } catch { /* not a named board table */ }
                    }),
                );
                setTableNames(names);
            })
            .catch(() => {});
    }, [connection]);

    const tableSeedSet = new Set(tableSeeds);

    // Returns { id, name } for display. id = short hex or known boardId, name = on-chain Table.name if any.
    function seedInfo(hex: string): { id: string; name: string | null } {
        const known = SEED_TO_BOARD_ID.get(hex);
        const id = known ? known : hex.slice(0, 12) + "...";
        const name = tableNames.get(hex) ?? null;
        return { id, name };
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
                    table_seed: Buffer.from(iqlabs.utils.toSeedBytes(onboardInput)),
                }),
            );
            setStatus(`/${onboardInput}/ onboarded`);
            setOnboardInput("");
        } catch (e) {
            setStatus(e instanceof Error ? e.message : String(e));
        }
    }

    async function handleUpdateTable(updateColumns = false) {
        if (!updateSeed || !updateName) return;
        setStatus(`Updating /${updateSeed}/...`);
        try {
            const builder = iqlabs.contract.createInstructionBuilder(idl, iqlabs.contract.PROGRAM_ID);
            const seedBytes = iqlabs.utils.toSeedBytes(updateSeed);
            const tablePda = iqlabs.contract.getTablePda(DB_ROOT_KEY, seedBytes);

            const columns = updateColumns
                ? BOARD_COLUMNS.map((c) => Buffer.from(c))
                : (await iqlabs.reader.fetchTableMeta(
                    connection, iqlabs.contract.PROGRAM_ID, DB_ROOT_ID, updateSeed,
                )).columns.map((c: string) => Buffer.from(c));

            await sendInstruction(
                iqlabs.contract.updateTableInstruction(builder, {
                    signer: wallet.publicKey!,
                    db_root: DB_ROOT_KEY,
                    table: tablePda,
                }, {
                    db_root_id: DB_ROOT_ID_BYTES,
                    table_seed: Buffer.from(seedBytes),
                    table_name: Buffer.from(updateName),
                    column_names: columns,
                    id_col: Buffer.from("time"),
                    ext_keys: [],
                    gate_opt: null,
                    writers_opt: null,
                }),
            );
            setStatus(`/${updateSeed}/ updated — name: "${updateName}"${updateColumns ? ", columns: board layout" : ""}`);
            setUpdateSeed("");
            setUpdateName("");
        } catch (e) {
            setStatus(e instanceof Error ? e.message : String(e));
        }
    }

    async function handleManageCreators() {
        const valid = creatorList.filter((s) => s.trim());
        if (valid.length === 0) return;
        setStatus("Updating table creators...");
        try {
            const builder = iqlabs.contract.createInstructionBuilder(idl, iqlabs.contract.PROGRAM_ID);
            await sendInstruction(
                iqlabs.contract.manageTableCreatorsInstruction(builder, {
                    signer: wallet.publicKey!,
                    db_root: DB_ROOT_KEY,
                    system_program: SystemProgram.programId,
                }, {
                    db_root_id: DB_ROOT_ID_BYTES,
                    table_creators: valid.map((s) => new PublicKey(s.trim())),
                    ext_creators: [],
                }),
            );
            setStatus("Table creators updated");
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
                            <div style={{ fontFamily: "monospace", fontSize: "11px", padding: "4px 0" }}>
                                {tableSeeds.length === 0
                                    ? <span style={{ color: "#89a" }}>None onboarded yet</span>
                                    : tableSeeds.map((s) => {
                                        const { id, name } = seedInfo(s);
                                        return (
                                            <span key={s} style={{ color: "#789922", marginRight: "12px" }}>
                                                {id}{name && name !== id ? ` (${name})` : ""}
                                            </span>
                                        );
                                    })}
                            </div>
                        </div>

                        <div style={{ fontSize: "12px", marginBottom: "16px" }}>
                            <b>All tables</b> (global_table_seeds — {globalTableSeeds.length} total. Not all are boards — some are threads or metadata. Make sure to onboard only actual boards.):
                            <div style={{ fontFamily: "monospace", fontSize: "10px", padding: "4px 0", maxHeight: "180px", overflow: "auto" }}>
                                {tableNames.size === 0 && globalTableSeeds.length > 0 && (
                                    <div style={{ color: "#89a" }}>Loading names...</div>
                                )}
                                {globalTableSeeds.map((s) => {
                                    const { id, name } = seedInfo(s);
                                    const isPublic = tableSeedSet.has(s);
                                    return (
                                        <div key={s} style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                                            <span style={{ width: "58px", flexShrink: 0, color: isPublic ? "#789922" : "#89a" }}>
                                                {isPublic ? "[Public]" : "[Private]"}
                                            </span>
                                            <span style={{ color: "#556", fontSize: "9px", flexShrink: 0 }}>ID:</span>
                                            <span style={{ color: "#aaa", minWidth: "100px" }}>{id}</span>
                                            {name && <>
                                                <span style={{ color: "#556", fontSize: "9px", flexShrink: 0 }}>Name:</span>
                                                <span style={{ color: isPublic ? "#789922" : "#c96" }}>{name}</span>
                                            </>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Update table name — owner only */}
                        <div className="postForm" style={{ marginBottom: "16px", opacity: isOwner ? 1 : 0.5 }}>
                            <table>
                                <tbody>
                                    <tr>
                                        <td className="label">Set Name</td>
                                        <td>
                                            <span style={{ fontSize: "10pt" }}>/</span>
                                            <input
                                                type="text"
                                                value={updateSeed}
                                                disabled={!isOwner}
                                                onChange={(e) => setUpdateSeed(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                                                placeholder="boardid"
                                                style={{ width: "100px" }}
                                            />
                                            <span style={{ fontSize: "10pt" }}>/</span>
                                            {" → "}
                                            <input
                                                type="text"
                                                value={updateName}
                                                disabled={!isOwner}
                                                onChange={(e) => setUpdateName(e.target.value)}
                                                placeholder="Board Title"
                                                style={{ width: "160px" }}
                                            />
                                            {" "}
                                            <input
                                                type="submit"
                                                onClick={(e) => { e.preventDefault(); handleUpdateTable(false); }}
                                                disabled={!isOwner || !updateSeed || !updateName}
                                                value="Name Only"
                                                title={!isOwner ? "Only the DbRoot owner can update tables" : ""}
                                            />
                                            {/* Name + Columns button hidden — columns should not be modified */}
                                            {!isOwner && (
                                                <div style={{ fontSize: "10px", color: "#c33", marginTop: "4px" }}>
                                                    Only the DbRoot owner can update tables.
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
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
                                            <div style={{ marginTop: "5px", fontSize: "10px", color: "#c33" }}>
                                                * Tip: boards have a short readable ID (e.g. <code>biz</code>, <code>po</code>). Threads have a numeric/random ID. Check the list above before onboarding.
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Manage table creators — owner only */}
                        <div className="postForm" style={{ opacity: isOwner ? 1 : 0.5 }}>
                            <table>
                                <tbody>
                                    <tr>
                                        <td className="label" style={{ verticalAlign: "top", paddingTop: "6px" }}>Admins</td>
                                        <td>
                                            {creatorList.map((pk, i) => (
                                                <div key={i} style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                                                    <input
                                                        type="text"
                                                        value={pk}
                                                        disabled={!isOwner}
                                                        onChange={(e) => {
                                                            const next = [...creatorList];
                                                            next[i] = e.target.value.trim();
                                                            setCreatorList(next);
                                                        }}
                                                        style={{ fontFamily: "monospace", fontSize: "11px", width: "340px" }}
                                                    />
                                                    <input
                                                        type="submit"
                                                        value="×"
                                                        disabled={!isOwner}
                                                        title={!isOwner ? "Only the DbRoot owner can manage admins" : ""}
                                                        onClick={(e) => { e.preventDefault(); setCreatorList(creatorList.filter((_, j) => j !== i)); }}
                                                        style={{ color: "#c33", cursor: isOwner ? "pointer" : "not-allowed" }}
                                                    />
                                                </div>
                                            ))}
                                            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                                                <input
                                                    type="submit"
                                                    value="+ Add"
                                                    disabled={!isOwner}
                                                    title={!isOwner ? "Only the DbRoot owner can manage admins" : ""}
                                                    onClick={(e) => { e.preventDefault(); setCreatorList([...creatorList, ""]); }}
                                                />
                                                <input
                                                    type="submit"
                                                    value="Save Admins"
                                                    disabled={!isOwner || creatorList.filter((s) => s.trim()).length === 0}
                                                    title={!isOwner ? "Only the DbRoot owner can manage admins" : ""}
                                                    onClick={(e) => { e.preventDefault(); handleManageCreators(); }}
                                                />
                                            </div>
                                            {!isOwner && (
                                                <div style={{ fontSize: "10px", color: "#c33", marginTop: "4px" }}>
                                                    Only the DbRoot owner can manage admins.
                                                </div>
                                            )}
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
