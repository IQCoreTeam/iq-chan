"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ESTIMATED_SOL_COST } from "../lib/constants";
import PostingOverlay from "./posting-overlay";

export default function QuickReply({
    threadSig,
    onSubmit,
    loading,
    statusText,
    step,
    totalSteps,
    onClose,
    initialQuote,
}: {
    threadSig: string;
    onSubmit: (data: { com: string; name: string; img?: string; options?: string }) => void;
    loading: boolean;
    statusText?: string;
    step?: number;
    totalSteps?: number;
    onClose: () => void;
    initialQuote?: string;
}) {
    const { publicKey } = useWallet();
    const [dismissed, setDismissed] = useState(false);
    const isError = !!statusText?.startsWith("Error:");
    const showOverlay = statusText && !dismissed && (loading || isError);

    useEffect(() => { if (loading) setDismissed(false); }, [loading]);

    const [name, setName] = useState("");
    const [com, setCom] = useState(initialQuote ? `>>${initialQuote}\n` : "");
    const [img, setImg] = useState("");
    const [options, setOptions] = useState("");
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Center initially
        setPos({
            x: Math.max(0, window.innerWidth - 350) * 0.7,
            y: window.innerHeight * 0.2,
        });
    }, []);

    useEffect(() => {
        if (initialQuote && textareaRef.current) {
            const val = textareaRef.current.value;
            if (!val.includes(`>>${initialQuote}`)) {
                setCom((prev) => prev + `>>${initialQuote}\n`);
            }
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
        }
    }, [initialQuote]);

    function handleMouseDown(e: React.MouseEvent) {
        setDragging(true);
        dragOffset.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y,
        };
    }

    useEffect(() => {
        if (!dragging) return;
        function onMove(e: MouseEvent) {
            setPos({
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y,
            });
        }
        function onUp() { setDragging(false); }
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [dragging]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!com.trim()) return;
        onSubmit({
            com: com.trim(),
            name: name.trim() || "Anonymous",
            ...(img.trim() ? { img: img.trim() } : {}),
            ...(options.trim() ? { options: options.trim().toLowerCase() } : {}),
        });
        setCom("");
        setImg("");
        setOptions("");
        onClose();
    }

    if (!publicKey) return null;

    return (
        <>
        {showOverlay && <PostingOverlay statusText={statusText} step={step} totalSteps={totalSteps} isError={isError} onDismiss={() => setDismissed(true)} />}
        <div
            ref={panelRef}
            id="quickReply"
            className="extPanel reply"
            style={{
                position: "fixed",
                top: pos.y,
                left: pos.x,
                zIndex: 100,
                background: "#d6daf0",
                border: "1px solid #b7c5d9",
                boxShadow: "2px 2px 4px rgba(0,0,0,0.2)",
                minWidth: 350,
                width: "auto",
                fontSize: 13,
            }}
        >
            <div
                id="qrHeader"
                className="drag postblock"
                onMouseDown={handleMouseDown}
                style={{
                    background: "#98b0d7",
                    padding: "2px 5px",
                    cursor: "move",
                    fontWeight: "bold",
                    fontSize: 12,
                    textAlign: "center",
                    position: "relative",
                    userSelect: "none",
                }}
            >
                <span>Reply to Thread No.{threadSig.slice(0, 8)}</span>
                <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); onClose(); }}
                    style={{ color: "#34345c", textDecoration: "none", fontSize: 14, position: "absolute", right: 5, top: 2 }}
                >
                    X
                </a>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 5 }}>
                <div style={{ marginBottom: 3 }}>
                    <input
                        name="name"
                        type="text"
                        placeholder="Anonymous"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ width: "100%", fontSize: 12, padding: "1px 3px", border: "1px solid #aaa", boxSizing: "border-box", outline: "none" }}
                    />
                </div>
                <div style={{ marginBottom: 3 }}>
                    <input
                        name="email"
                        type="text"
                        placeholder="Options"
                        value={options}
                        onChange={(e) => setOptions(e.target.value)}
                        style={{ width: "100%", fontSize: 12, padding: "1px 3px", border: "1px solid #aaa", boxSizing: "border-box", outline: "none" }}
                    />
                </div>
                <div style={{ marginBottom: 3 }}>
                    <textarea
                        ref={textareaRef}
                        name="com"
                        cols={48}
                        rows={4}
                        value={com}
                        onChange={(e) => setCom(e.target.value)}
                        placeholder="Comment"
                        style={{ width: "100%", fontSize: 12, padding: "2px 3px", border: "1px solid #aaa", boxSizing: "border-box", resize: "both", outline: "none" }}
                    />
                </div>
                <div style={{ marginBottom: 3, fontSize: 11, color: "#707070" }}>
                    ~{ESTIMATED_SOL_COST.reply} SOL per reply
                </div>
                <div style={{ marginBottom: 3 }}>
                    <input
                        name="img"
                        type="url"
                        placeholder="Image URL"
                        value={img}
                        onChange={(e) => setImg(e.target.value)}
                        style={{ width: 200, fontSize: 12, padding: "1px 3px", border: "1px solid #aaa", outline: "none" }}
                    />
                    <input
                        type="submit"
                        value={loading ? (statusText || "Posting...") : "Post"}
                        disabled={loading || !com.trim()}
                        style={{ marginLeft: 5, background: "#f0e0d6", border: "1px solid #c0a89a", padding: "1px 6px", fontSize: 12, cursor: "pointer" }}
                    />
                </div>
            </form>
        </div>
        </>
    );
}
