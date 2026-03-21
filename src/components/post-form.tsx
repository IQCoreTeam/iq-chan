"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ESTIMATED_SOL_COST } from "../lib/constants";
import PostingOverlay from "./posting-overlay";

export default function PostForm({
    mode,
    onSubmit,
    loading,
    statusText,
    step,
    totalSteps,
}: {
    mode: "thread" | "reply";
    onSubmit: (data: { sub?: string; com: string; name: string; img?: string; options?: string }) => void;
    loading: boolean;
    statusText?: string;
    step?: number;
    totalSteps?: number;
}) {
    const { publicKey } = useWallet();
    const [showForm, setShowForm] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const isError = !!statusText?.startsWith("Error:");
    const showOverlay = statusText && !dismissed && (loading || isError);

    useEffect(() => { if (loading) setDismissed(false); }, [loading]);
    const [sub, setSub] = useState("");
    const [com, setCom] = useState("");
    const [name, setName] = useState("");
    const [img, setImg] = useState("");
    const [options, setOptions] = useState("");

    if (!publicKey) {
        return (
            <div style={{ textAlign: "center", padding: 10, fontSize: 13, color: "#707070" }}>
                Connect your wallet to post
            </div>
        );
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!com.trim()) return;
        onSubmit({
            ...(mode === "thread" && sub.trim() ? { sub: sub.trim() } : {}),
            com: com.trim(),
            name: name.trim() || "Anonymous",
            ...(img.trim() ? { img: img.trim() } : {}),
            ...(options.trim() ? { options: options.trim().toLowerCase() } : {}),
        });
        setSub("");
        setCom("");
        setImg("");
        setOptions("");
        setShowForm(false);
    }

    const label = mode === "thread" ? "Start a New Thread" : "Post a Reply";

    return (
        <form onSubmit={handleSubmit} style={{ textAlign: "center" }}>
            {showOverlay && <PostingOverlay statusText={statusText} step={step} totalSteps={totalSteps} isError={isError} onDismiss={() => setDismissed(true)} />}
            <div id="togglePostFormLink" style={{ display: showForm ? "none" : "block" }}>
                [<a href="#" onClick={(e) => { e.preventDefault(); setShowForm(true); }}>{label}</a>]
            </div>
            <table
                className="postForm"
                id="postForm"
                style={{ margin: "0 auto", display: showForm ? "table" : "none" }}
            >
                <tbody>
                    <tr data-type="Name">
                        <td>Name</td>
                        <td>
                            <input
                                name="name"
                                type="text"
                                tabIndex={1}
                                placeholder="Anonymous"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </td>
                    </tr>
                    <tr data-type="Options">
                        <td>Options</td>
                        <td>
                            <input
                                name="email"
                                type="text"
                                tabIndex={2}
                                value={options}
                                onChange={(e) => setOptions(e.target.value)}
                            />
                            {mode === "reply" && (
                                <input
                                    type="submit"
                                    value={loading ? (statusText || "Posting...") : "Post"}
                                    disabled={loading || !com.trim()}
                                    tabIndex={10}
                                />
                            )}
                        </td>
                    </tr>
                    {mode === "thread" && (
                        <tr data-type="Subject">
                            <td>Subject</td>
                            <td>
                                <input
                                    name="sub"
                                    type="text"
                                    tabIndex={3}
                                    placeholder="Subject"
                                    value={sub}
                                    onChange={(e) => setSub(e.target.value)}
                                />
                                <input
                                    type="submit"
                                    value={loading ? (statusText || "Posting...") : "Post"}
                                    disabled={loading || !com.trim()}
                                    tabIndex={10}
                                />
                            </td>
                        </tr>
                    )}
                    <tr data-type="Comment">
                        <td>Comment</td>
                        <td>
                            <textarea
                                name="com"
                                cols={48}
                                rows={4}
                                wrap="soft"
                                tabIndex={4}
                                value={com}
                                onChange={(e) => setCom(e.target.value)}
                                required
                            />
                        </td>
                    </tr>
                    <tr data-type="File">
                        <td>Image URL</td>
                        <td>
                            <input
                                name="img"
                                type="url"
                                tabIndex={8}
                                value={img}
                                onChange={(e) => setImg(e.target.value)}
                                placeholder="https://..."
                            />
                        </td>
                    </tr>
                    {img.trim() && (
                        <tr>
                            <td></td>
                            <td>
                                <img
                                    src={img.trim()}
                                    alt="preview"
                                    className="imgPreview"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                                {" "}
                                <button
                                    type="button"
                                    onClick={() => setImg("")}
                                    style={{ color: "#d00", fontSize: 11, background: "none", border: "none", cursor: "pointer" }}
                                >
                                    [Remove]
                                </button>
                            </td>
                        </tr>
                    )}
                    <tr className="rules">
                        <td colSpan={2}>
                            <ul>
                                <li>Your {mode === "thread" ? "thread" : "reply"} is permanently stored on the Solana blockchain and cannot be deleted.</li>
                            </ul>
                        </td>
                    </tr>
                </tbody>
            </table>
        </form>
    );
}
