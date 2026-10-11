"use client";

import { useState } from "react";
import { parseInscriptionRef } from "../lib/inscription";
import PostAttachment from "./post-attachment";
import InventoryModal from "./inventory-modal";

// The attachment input, shared by the post form and the quick reply so the two
// never drift. One field takes either an off-chain link or an on-chain tx id
// (a bare signature, a ?post= link, or a gateway url). parseInscriptionRef
// normalizes an inscription reference down to its bare signature, stored
// verbatim on chain; a plain link is kept as typed. PostAttachment renders the
// live preview, auto-detecting url vs inscription.
export default function AttachmentField({
    img,
    setImg,
    disabled,
}: {
    img: string;
    setImg: (v: string) => void;
    disabled?: boolean;
}) {
    const [showInventory, setShowInventory] = useState(false);

    return (
        <div>
            <input
                name="img"
                type="text"
                disabled={disabled}
                value={img}
                onChange={(e) => { const v = e.target.value.trim(); setImg(parseInscriptionRef(v) ?? v); }}
                placeholder="paste a link, or an on-chain tx / ?post= link"
                style={{ width: "100%", maxWidth: 420, fontSize: 12, padding: "1px 3px", border: "1px solid #aaa", outline: "none" }}
            />

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 3 }}>
                <span style={{ fontSize: 11, color: "#555" }}>
                    A link stays off-chain. A tx id loads on-chain data.
                </span>
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
                    onPick={(sig) => setImg(sig)}
                    onClose={() => setShowInventory(false)}
                />
            )}
        </div>
    );
}
