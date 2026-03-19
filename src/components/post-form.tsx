"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ESTIMATED_SOL_COST } from "../lib/constants";

export default function PostForm({
    mode,
    onSubmit,
    loading,
}: {
    mode: "thread" | "reply";
    onSubmit: (data: { sub?: string; com: string; name: string; img?: string }) => void;
    loading: boolean;
}) {
    const { publicKey } = useWallet();
    const [showForm, setShowForm] = useState(false);
    const [sub, setSub] = useState("");
    const [com, setCom] = useState("");
    const [name, setName] = useState("Anonymous");
    const [img, setImg] = useState("");

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
        });
        setSub("");
        setCom("");
        setImg("");
        setShowForm(false);
    }

    const label = mode === "thread" ? "Start a New Thread" : "Post a Reply";

    return (
        <form onSubmit={handleSubmit} style={{ textAlign: "center" }}>
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
                    {mode === "thread" && (
                        <tr data-type="Subject">
                            <td>Subject</td>
                            <td>
                                <input
                                    name="sub"
                                    type="text"
                                    tabIndex={2}
                                    placeholder="Subject"
                                    value={sub}
                                    onChange={(e) => setSub(e.target.value)}
                                />
                                <input
                                    type="submit"
                                    value={loading ? "Posting..." : "Post"}
                                    disabled={loading || !com.trim()}
                                    tabIndex={10}
                                />
                            </td>
                        </tr>
                    )}
                    {mode === "reply" && (
                        <tr data-type="Options">
                            <td>Options</td>
                            <td>
                                <input name="email" type="text" tabIndex={2} placeholder="sage" />
                                <input
                                    type="submit"
                                    value={loading ? "Posting..." : "Post"}
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
                            <ul className="rules" style={{ listStyle: "none", padding: 0, margin: "5px 0", fontSize: 11, color: "#707070" }}>
                                <li>Every post is a Solana transaction (~{ESTIMATED_SOL_COST[mode]} SOL).</li>
                            </ul>
                        </td>
                    </tr>
                </tbody>
            </table>
        </form>
    );
}
