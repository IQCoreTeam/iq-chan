"use client";

import { useState } from "react";
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
    isOwner,
    onEdit,
    onDelete,
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
    isOwner?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onQuote?: (sig: string) => void;
}) {
    const shortSig = txSig.slice(0, 8);
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const fileBlock = img ? (() => {
        let fileName: string;
        try { fileName = decodeURIComponent(new URL(img).pathname.split("/").pop() ?? "image"); }
        catch { fileName = "image"; }

        return (
            <div className="file" id={`f${shortSig}`}>
                <div className="fileText" id={`fT${shortSig}`}>
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
                    />
                </a>
            </div>
        );
    })() : null;

    const digitsLink = onQuote
        ? <a href="#" title="Reply to this post" onClick={(e) => { e.preventDefault(); onQuote(txSig); }}>{shortSig}</a>
        : replyLink
            ? <a href={replyLink} title="Reply to this post">{shortSig}</a>
            : <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer" title="View on Solscan">{shortSig}</a>;

    const postInfoBlock = (
        <div className="postInfo desktop" id={`pi${shortSig}`}>
            <input type="checkbox" name={shortSig} value="delete" />
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
                <a href={replyLink ?? `#p${shortSig}`} title="Link to this post">No.</a>
                {digitsLink}
                {replyLink && (
                    <> &nbsp; <span>[<a href={replyLink} className="replylink">Reply</a>]</span></>
                )}
            </span>
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
                <div className="dd-menu" style={{ position: "absolute", background: "#d6daf0", border: "1px solid #b7c5d9", zIndex: 10, boxShadow: "1px 1px 2px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
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
            {backlinks && backlinks.length > 0 && (
                <div id={`bl_${shortSig}`} className="backlink">
                    {backlinks.map((bl) => {
                        const s = bl.slice(0, 8);
                        return (
                            <span key={bl}>
                                <a
                                    href={`#p${s}`}
                                    className="quotelink"
                                    onClick={(e) => { e.preventDefault(); scrollToPost(s); }}
                                    onMouseEnter={() => highlightPost(s, true)}
                                    onMouseLeave={() => highlightPost(s, false)}
                                >
                                    &gt;&gt;{s}
                                </a>
                                {" "}
                            </span>
                        );
                    })}
                </div>
            )}
            {isOwner && (
                <span style={{ marginLeft: 5 }}>
                    {onEdit && (
                        <button onClick={onEdit} style={{ color: "#34345c", fontSize: 12, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                            [Edit]
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={onDelete} style={{ color: "#d00", fontSize: 12, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                            [Delete]
                        </button>
                    )}
                </span>
            )}
        </div>
    );

    return (
        <div className={`postContainer ${isOp ? "opContainer" : "replyContainer"}`} id={`pc${shortSig}`}>
            {!isOp && <div className="sideArrows" id={`sa${shortSig}`}>&gt;&gt;</div>}
            <div id={`p${shortSig}`} className={isOp ? "post op" : "post reply"}>
                {isOp ? <>{fileBlock}{postInfoBlock}</> : <>{postInfoBlock}{fileBlock}</>}
                <blockquote className="postMessage" id={`m${shortSig}`}>
                    {formatPostMessage(com)}
                </blockquote>
            </div>
        </div>
    );
}
