"use client";

import { useEffect, useState } from "react";
import Attachment from "./attachment";
import { parseInscription, inscriptionSiteUrl } from "../lib/attachment";
import { resolveNetwork } from "../lib/chains/resolve";


export default function AttachmentField({ value, onChange, disabled, onPendingChange }: {
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    onPendingChange: (pending: boolean) => void;
}) {
    const network = resolveNetwork();
    const uploader = inscriptionSiteUrl(network);
    const [upload, setUpload] = useState<{ popup: Window; id: string; initialValue: string } | null>(null);
    const [status, setStatus] = useState("");
    const parsedDraft = parseInscription(value, network);
    const invalid = !!value.trim() && (!parsedDraft || parsedDraft.network.id !== network.id || /^https?:/i.test(value.trim()));
    useEffect(() => { onPendingChange(upload !== null || invalid); }, [upload, invalid, onPendingChange]);
    useEffect(() => () => onPendingChange(false), [onPendingChange]);
    useEffect(() => { if (!value) setStatus(""); }, [value]);

    useEffect(() => {
        if (!upload || !uploader) return;
        if (disabled || value !== upload.initialValue) { setUpload(null); return; }
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
            const result = parseInscription(event.data.signature, network);
            if (!result || result.network.id !== network.id) return;
            completed = true;
            onChange(result.id);
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
    }, [upload, disabled, value, onChange, uploader, network]);

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
        setUpload({ popup, id, initialValue: value });
        setStatus("Opening IQ Labs uploader…");
    }

    return <div>
        <input name="img" type="text" style={{width: "100%", boxSizing: "border-box", marginBottom: 4}} aria-label="Inscription transaction ID" placeholder="Paste an inscription transaction ID"
            value={value} disabled={disabled} aria-invalid={invalid} onChange={event => {
                const next = event.target.value.trim();
                setUpload(null); setStatus("");
                const result = parseInscription(next, network);
                const valid = result && result.network.id === network.id && !/^https?:/i.test(next);
                onChange(valid ? result.id : event.target.value);
            }} />
        {invalid && <div role="alert">Paste a {network.theme.chainLabel} inscription transaction ID.</div>}

        <button type="button" onClick={openUploader} disabled={disabled || !uploader} tabIndex={8}>
            {upload ? "Return to uploader" : parsedDraft && !invalid ? "Replace inscription" : "Inscribe attachment"}
        </button>
        {upload && <button type="button" onClick={() => {
            setUpload(null);
            setStatus("Automatic return cancelled. The upload window is still open. You can paste its completed transaction ID here.");
        }}>Cancel attachment</button>}
        {!value && !status && <div style={{ fontSize: 11 }}>Already inscribed? Paste its transaction ID, or inscribe a new file.</div>}
        {status && <div role="status" style={{ fontSize: 12 }}>{status}</div>}

        {value.trim() && !invalid && <div>
            <Attachment key={value.trim()} url={value.trim()} name="Attachment preview" />
            <button type="button" disabled={disabled} onClick={() => { setUpload(null); setStatus(""); onChange(""); }}>[Remove]</button>
        </div>}
    </div>;
}
