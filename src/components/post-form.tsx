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
    }

    return (
        <form onSubmit={handleSubmit} style={{ textAlign: "center" }}>
            <table className="postForm" style={{ margin: "0 auto" }}>
                <tbody>
                    <tr>
                        <td>Name</td>
                        <td>
                            <input
                                name="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Anonymous"
                            />
                        </td>
                    </tr>
                    {mode === "thread" && (
                        <tr>
                            <td>Subject</td>
                            <td>
                                <input
                                    name="sub"
                                    type="text"
                                    value={sub}
                                    onChange={(e) => setSub(e.target.value)}
                                    placeholder="Subject"
                                />
                                <input
                                    type="submit"
                                    value={loading ? "Posting..." : "Post"}
                                    disabled={loading || !com.trim()}
                                />
                            </td>
                        </tr>
                    )}
                    <tr>
                        <td>Comment</td>
                        <td>
                            <textarea
                                name="com"
                                cols={48}
                                rows={4}
                                value={com}
                                onChange={(e) => setCom(e.target.value)}
                                required
                            />
                            {mode === "reply" && (
                                <input
                                    type="submit"
                                    value={loading ? "Posting..." : "Post"}
                                    disabled={loading || !com.trim()}
                                    style={{ marginLeft: 5 }}
                                />
                            )}
                        </td>
                    </tr>
                    <tr>
                        <td>Image URL</td>
                        <td>
                            <input
                                name="img"
                                type="url"
                                value={img}
                                onChange={(e) => setImg(e.target.value)}
                                placeholder="https://..."
                            />
                        </td>
                    </tr>
                    {img.trim() && (
                        <tr>
                            <td>Preview</td>
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
                                    style={{ color: "#d00", fontSize: 12, background: "none", border: "none", cursor: "pointer" }}
                                >
                                    [Remove]
                                </button>
                            </td>
                        </tr>
                    )}
                    <tr>
                        <td colSpan={2}>
                            <span className="postCost">~{ESTIMATED_SOL_COST[mode]} SOL per {mode}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </form>
    );
}
