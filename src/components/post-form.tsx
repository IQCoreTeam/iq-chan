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
            <div className="border border-gray-300 bg-[#f0e0d6] p-3 text-center text-sm text-gray-600">
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
        <form
            onSubmit={handleSubmit}
            className="border border-gray-300 bg-[#f0e0d6] p-3 space-y-2"
        >
            {/* ─── Subject (thread only) ────────────────────────── */}
            {mode === "thread" && (
                <input
                    type="text"
                    placeholder="Subject"
                    value={sub}
                    onChange={(e) => setSub(e.target.value)}
                    className="w-full border border-gray-400 px-2 py-1 text-sm"
                />
            )}

            {/* ─── Comment ──────────────────────────────────────── */}
            <textarea
                placeholder="Comment"
                value={com}
                onChange={(e) => setCom(e.target.value)}
                rows={4}
                className="w-full border border-gray-400 px-2 py-1 text-sm resize-y"
                required
            />

            {/* ─── Image URL ───────────────────────────────────── */}
            <input
                type="url"
                placeholder="Image URL (optional)"
                value={img}
                onChange={(e) => setImg(e.target.value)}
                className="w-full border border-gray-400 px-2 py-1 text-sm"
            />

            {/* ─── Image preview ──────────────────────────────── */}
            {img.trim() && (
                <div className="flex items-center gap-2">
                    <img
                        src={img.trim()}
                        alt="preview"
                        className="max-h-20 max-w-[120px] border border-gray-400 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <button
                        type="button"
                        onClick={() => setImg("")}
                        className="text-xs text-red-600 hover:underline"
                    >
                        Remove
                    </button>
                </div>
            )}

            {/* ─── Name ─────────────────────────────────────────── */}
            <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-400 px-2 py-1 text-sm"
            />

            {/* ─── Submit ───────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                    ~{ESTIMATED_SOL_COST[mode]} SOL
                </span>
                <button
                    type="submit"
                    disabled={loading || !com.trim()}
                    className="bg-gray-200 border border-gray-400 px-4 py-1 text-sm hover:bg-gray-300 disabled:opacity-50"
                >
                    {loading ? "Posting..." : mode === "thread" ? "Create Thread" : "Post Reply"}
                </button>
            </div>
        </form>
    );
}
