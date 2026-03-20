"use client";

import { useState, useEffect, useRef } from "react";
import { formatPostMessage } from "../lib/format";
import { scrollToPost, highlightPost } from "../lib/highlight";

export default function Post({
    txSig,
    com,
    name,
    time,
    sub,
    img,
    isOp,
    replyLink,
    backlinks,
    onQuote,
}: {
    txSig: string;
    com: string;
    name: string;
    time: number;
    sub?: string;
    img?: string;
    isOp?: boolean;
    replyLink?: string;
    backlinks?: string[];
    onQuote?: (sig: string) => void;
}) {
    const display = txSig.slice(0, 8);
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [menuOpen]);

    let fileName = "";
    if (img) {
        try { fileName = decodeURIComponent(new URL(img).pathname.split("/").pop() ?? "image"); }
        catch { fileName = "image"; }
    }

    const fileBlock = img ? (
        <div className="file" id={`f${txSig}`}>
            <div className="fileText" id={`fT${txSig}`}>
                File: <a href={img} target="_blank" rel="noopener noreferrer">{fileName}</a>
            </div>
            <a
                className={`fileThumb${expanded ? " fileThumbExpanded" : ""}`}
                href={img}
                onClick={(e) => { e.preventDefault(); setExpanded((v) => !v); }}
            >
                <img
                    src={img}
                    alt={fileName}
                    style={expanded
                        ? { maxWidth: "100%", maxHeight: "none" }
                        : { maxHeight: isOp ? 250 : 125, maxWidth: isOp ? 250 : 125 }
                    }
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/404.png"; }}
                />
            </a>
        </div>
    ) : null;

    const digitsLink = onQuote
        ? <a href="#" title="Reply to this post" onClick={(e) => { e.preventDefault(); onQuote(txSig); }}>{display}</a>
        : replyLink
            ? <a href={replyLink} title="Reply to this post">{display}</a>
            : <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer" title="View on Solscan">{display}</a>;

    const postInfoBlock = (
        <div className="postInfo desktop" id={`pi${txSig}`}>
            <input type="checkbox" name={txSig} value="delete" />
            {" "}
            {sub && <span className="subject">{sub}</span>}
            {" "}
            <span className="nameBlock">
                <span className="name">{name}</span>
                {" "}
            </span>
            {" "}
            <span className="dateTime" data-utc={time}>{new Date(time * 1000).toLocaleString()}</span>
            {" "}
            <span className="postNum desktop">
                <a href={replyLink ?? `#p${txSig}`} title="Link to this post">No.</a>
                {digitsLink}
                {replyLink && (
                    <> &nbsp; <span>[<a href={replyLink} className="replylink">Reply</a>]</span></>
                )}
            </span>
            <span ref={menuRef} style={{ position: "relative" }}>
                <a
                    href="#"
                    className={`postMenuBtn${menuOpen ? " menuOpen" : ""}`}
                    title="Post menu"
                    data-cmd="post-menu"
                    onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
                >
                    ▶
                </a>
                {menuOpen && (
                    <div className="dd-menu" style={{ position: "absolute", top: "100%", left: 0, background: "#d6daf0", border: "1px solid #b7c5d9", zIndex: 9999, boxShadow: "1px 1px 2px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
                        <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 12 }}>
                            <li style={{ padding: "3px 10px", cursor: "pointer" }} onClick={() => { window.open(`https://solscan.io/tx/${txSig}`, "_blank"); setMenuOpen(false); }}>
                                View on Solscan
                            </li>
                            <li style={{ padding: "3px 10px", cursor: "pointer" }} onClick={() => { navigator.clipboard.writeText(txSig); setMenuOpen(false); }}>
                                Copy TX signature
                            </li>
                        </ul>
                    </div>
                )}
            </span>
            {backlinks && backlinks.length > 0 && (
                <div id={`bl_${txSig}`} className="backlink">
                    {backlinks.map((bl) => (
                        <span key={bl}>
                            <a
                                href={`#p${bl}`}
                                className="quotelink"
                                onClick={(e) => { e.preventDefault(); scrollToPost(bl); }}
                                onMouseEnter={() => highlightPost(bl, true)}
                                onMouseLeave={() => highlightPost(bl, false)}
                            >
                                &gt;&gt;{bl.slice(0, 8)}
                            </a>
                            {" "}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className={`postContainer ${isOp ? "opContainer" : "replyContainer"}`} id={`pc${txSig}`}>
            {!isOp && <div className="sideArrows" id={`sa${txSig}`}>&gt;&gt;</div>}
            <div id={`p${txSig}`} className={isOp ? "post op" : "post reply"}>
                {isOp ? <>{fileBlock}{postInfoBlock}</> : <>{postInfoBlock}{fileBlock}</>}
                <blockquote className="postMessage" id={`m${txSig}`}>
                    {formatPostMessage(com)}
                </blockquote>
            </div>
        </div>
    );
}
