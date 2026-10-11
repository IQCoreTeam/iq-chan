"use client";

import { useState } from "react";
import { parseInscriptionRef } from "../lib/inscription";
import { resolveNetwork } from "../lib/chains/resolve";
import PostAttachment from "./post-attachment";
import InventoryModal from "./inventory-modal";

// The attachment input, shared by the post form and the quick reply so the two
// never drift. Two input modes over one img state: a plain URL, or an on-chain
// inscription referenced by its bare tx signature. The write path is unchanged;
// both modes set the same img, stored verbatim on chain. parseInscriptionRef
// normalizes a pasted ?post= link or gateway url down to the bare signature, and
// PostAttachment renders the live preview (auto-detecting url vs inscription).
export default function AttachmentField({
    img,
    setImg,
    disabled,
}: {
    img: string;
    setImg: (v: string) => void;
    disabled?: boolean;
}) {
    const net = resolveNetwork();
    const [tab, setTab] = useState<"url" | "onchain">(parseInscriptionRef(img) ? "onchain" : "url");
    const [showInventory, setShowInventory] = useState(false);

    const tabButton = (id: "url" | "onchain", label: string) => (
        <button
            type="button"
            disabled={disabled}
            onClick={() => setTab(id)}
            style={{
                fontSize: 11,
                padding: "1px 8px",
                cursor: disabled ? "default" : "pointer",
                background: tab === id ? net.theme.accent : "var(--panel)",
                color: tab === id ? "#fff" : "inherit",
                border: "1px solid var(--edge)",
                fontWeight: tab === id ? "bold" : "normal",
            }}
        >
            {label}
        </button>
    );

    const inputStyle: React.CSSProperties = {
        width: 240, maxWidth: "100%", fontSize: 12, padding: "1px 3px",
        border: "1px solid #aaa", outline: "none",
    };

    return (
        <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 3 }}>
                {tabButton("url", "URL")}
                {tabButton("onchain", "On-chain")}
            </div>

            {tab === "url" ? (
                <input
                    name="img"
                    type="url"
                    disabled={disabled}
                    value={img}
                    onChange={(e) => setImg(e.target.value)}
                    placeholder="https://..."
                    style={inputStyle}
                />
            ) : (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        disabled={disabled}
                        value={img}
                        onChange={(e) => { const v = e.target.value.trim(); setImg(parseInscriptionRef(v) ?? v); }}
                        placeholder="inscription tx or ?post= link"
                        style={inputStyle}
                    />
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setShowInventory(true)}
                        style={{
                            fontSize: 11, padding: "1px 6px", cursor: disabled ? "default" : "pointer",
                            background: "var(--panel)", border: "1px solid var(--edge)",
                        }}
                    >
                        Browse my inscriptions
                    </button>
                </div>
            )}

            {img.trim() && (
                <div style={{ marginTop: 3 }}>
                    <PostAttachment img={img.trim()} />
                    {" "}
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setImg("")}
                        style={{ color: "#d00", fontSize: 11, background: "none", border: "none", cursor: "pointer" }}
                    >
                        [Remove]
                    </button>
                </div>
            )}

            {showInventory && (
                <InventoryModal
                    onPick={(sig) => { setImg(sig); setTab("onchain"); }}
                    onClose={() => setShowInventory(false)}
                />
            )}
        </div>
    );
}
