"use client";

import { useState } from "react";
import { formatPostMessage } from "../lib/format";

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
    const timeStr = new Date(time * 1000).toLocaleString();
    const shortSig = txSig.slice(0, 8);
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const postClass = isOp ? "post op" : "post reply";

    return (
        <div className={`postContainer ${isOp ? "opContainer" : "replyContainer"}`} id={`pc${shortSig}`}>
            {!isOp && <div className="sideArrows">&gt;&gt;</div>}
            <div id={`p${shortSig}`} className={postClass}>
                {img && (
                    <div className="file">
                        <a
                            className="fileThumb"
                            href={img}
                            onClick={(e) => {
                                e.preventDefault();
                                setExpanded((v) => !v);
                            }}
                        >
                            <img
                                src={img}
                                alt=""
                                style={expanded
                                    ? { maxWidth: "100%", maxHeight: "none" }
                                    : { maxHeight: 150, maxWidth: 150 }
                                }
                                loading="lazy"
                            />
                        </a>
                    </div>
                )}
                <div className="postInfo">
                    {sub && <span className="subject">{sub} </span>}
                    <span className="nameBlock">
                        <span className="name">{name}</span>
                    </span>
                    {" "}
                    <span className="dateTime">{timeStr}</span>
                    {" "}
                    <span className="postNum">
                        {replyLink ? (
                            <>
                                <a href={replyLink} title="Link to this post">No.</a>
                                <a href={replyLink} title="Reply to this post">{shortSig}</a>
                            </>
                        ) : (
                            <>
                                <a href={`#p${shortSig}`} title="Link to this post">No.</a>
                                {onQuote ? (
                                    <a href="#" title="Reply to this post" onClick={(e) => { e.preventDefault(); onQuote(txSig); }}>{shortSig}</a>
                                ) : (
                                    <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer" title="View on Solscan">{shortSig}</a>
                                )}
                            </>
                        )}
                        {replyLink && (
                            <> &nbsp; <span>[<a href={replyLink} className="replylink">Reply</a>]</span></>
                        )}
                    </span>
                    <a
                        href="#"
                        className="postMenuBtn"
                        title="Post menu"
                        onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
                    >
                        ▶
                    </a>
                    {backlinks && backlinks.length > 0 && (
                        <div className="backlink">
                            {backlinks.map((bl) => (
                                <span key={bl}>
                                    <a href={`#pc${bl.slice(0, 8)}`} className="quotelink">&gt;&gt;{bl.slice(0, 8)}</a>
                                    {" "}
                                </span>
                            ))}
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
                {menuOpen && (
                    <div className="postMenu" style={{ position: "absolute", background: "#d6daf0", border: "1px solid #b7c5d9", padding: "2px 0", fontSize: 12, zIndex: 10 }}>
                        <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "2px 10px", color: "#34345c", textDecoration: "none" }}>
                            View on Solscan
                        </a>
                    </div>
                )}
                <blockquote className="postMessage">
                    {formatPostMessage(com)}
                </blockquote>
            </div>
        </div>
    );
}
