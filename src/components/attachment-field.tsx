"use client";

import { useEffect, useState } from "react";
import { resolveNetwork } from "../lib/chains/resolve";
import { parseInscriptionRef, inscriptionSiteUrl } from "../lib/inscription";
import PostAttachment from "./post-attachment";
import InventoryModal from "./inventory-modal";

// The attachment input, shared by the post form and the quick reply so the two
// never drift. One field takes either an off-chain link or an on-chain tx id
// (a bare signature, a ?post= link, or a gateway url). Pasted links retain their
// explicit chain. PostAttachment validates and renders the live preview.
export default function AttachmentField({
    img,
    setImg,
    disabled,
    onPendingChange,
}: {
    img: string;
    setImg: (v: string) => void;
    disabled?: boolean;
    onPendingChange: (pending: boolean) => void;
}) {
    const [showInventory, setShowInventory] = useState(false);
    const network = resolveNetwork();
    const uploader = inscriptionSiteUrl(network);
    const [upload, setUpload] = useState<{popup: Window; id: string; initialValue: string} | null>(null);
    const [status, setStatus] = useState("");
    useEffect(() => { onPendingChange(upload !== null); }, [upload, onPendingChange]);
    useEffect(() => () => onPendingChange(false), [onPendingChange]);
    useEffect(() => { if (!img) setStatus(""); }, [img]);

    useEffect(() => {
        if (!upload || !uploader) return;
        if (disabled || img !== upload.initialValue) { setUpload(null); return; }
        const { popup, id } = upload;
        let completed = false;
        const origin = new URL(uploader).origin;
        const timer = window.setTimeout(() => {
            setStatus("Still waiting for the uploader. If you already finished, copy its transaction ID and paste it here.");
        }, 10000);
        function receive(event: MessageEvent) {
            if (completed || event.origin !== origin || event.source !== popup || event.data?.requestId !== id) return;
            if (event.data.type === "iq:attachment-ready") {
                window.clearTimeout(timer);
                setStatus("Finish the upload in IQ Labs. Your attachment will return here automatically.");
                return;
            }
            if (event.data.type !== "iq:attachment-complete" || event.data.network !== network.id || typeof event.data.signature !== "string") return;
            const result = parseInscriptionRef(event.data.signature);
            if (!result || (result !== event.data.signature && result !== event.data.signature.toLowerCase()) ||
                (network.family === "evm" ? !result.startsWith("0x") : result.startsWith("0x"))) return;
            completed = true;
            setImg(result);
            popup.postMessage({ type: "iq:attachment-accepted", requestId: id }, origin);
            setUpload(null);
            setStatus("Attachment added. Review your post, then press Post when ready.");
            window.focus();
        }
        window.addEventListener("message", receive);
        const closed = window.setInterval(() => {
            if (upload.popup.closed) {
                setUpload(null);
                setStatus("Upload window closed. Your post draft is saved.");
            }
        }, 500);
        return () => {
            window.clearTimeout(timer);
            window.clearInterval(closed);
            window.removeEventListener("message", receive);
        };
    }, [upload, disabled, img, setImg, uploader, network]);

    function openUploader() {
        if (upload) { upload.popup.focus(); return; }
        if (!uploader) return;
        const id = crypto.randomUUID();
        const url = new URL(uploader);
        url.searchParams.set("attachmentOrigin", window.location.origin);
        url.searchParams.set("attachmentRequest", id);
        // The narrowly validated message exchange needs an opener. No wallet
        // credentials or draft text are sent to the uploader.
        const popup = window.open(url.href, "iq-attachment-" + id, "popup,width=1000,height=850");
        if (!popup) { setStatus("Allow the IQ Labs popup, then try again. Your draft is saved."); return; }
        setUpload({ popup, id, initialValue: img });
        setStatus("Opening IQ Labs uploader…");
    }


    return (
        <div>
            <input
                name="img"
                type="text"
                disabled={disabled}
                value={img}
                aria-label="Attachment link or transaction ID"
                onChange={(e) => { setUpload(null); setStatus(""); const v = e.target.value.trim(); setImg(v); }}
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

            <button type="button" disabled={disabled || !uploader} onClick={openUploader}>
                {upload ? "Return to uploader" : "Inscribe attachment"}
            </button>
            {upload && <button type="button" onClick={() => { setUpload(null); setStatus("Automatic return cancelled. Paste the completed transaction ID here when ready."); }}>Cancel attachment</button>}
            {status && <div role="status" style={{fontSize:11}}>{status}</div>}
            {img.trim() && (
                <div style={{ marginTop: 3 }}>
                    <PostAttachment img={img.trim()} />
                    {" "}
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => { setUpload(null); setStatus(""); setImg(""); }}
                        style={{ color: "#d00", fontSize: 11, background: "none", border: "none", cursor: "pointer" }}
                    >
                        [Remove]
                    </button>
                </div>
            )}

            {showInventory && (
                <InventoryModal
                    onPick={(sig) => { setUpload(null); setStatus(""); setImg(sig); }}
                    onClose={() => setShowInventory(false)}
                />
            )}
        </div>
    );
}
