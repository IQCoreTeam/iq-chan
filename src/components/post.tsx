"use client";

import { useState } from "react";

export default function Post({
    txSig,
    com,
    name,
    time,
    sub,
    img,
    isOp,
    replyLink,
    isOwner,
    onEdit,
    onDelete,
}: {
    txSig: string;
    com: string;
    name: string;
    time: number;
    sub?: string;
    img?: string;
    isOp?: boolean;
    replyLink?: string;
    isOwner?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    const timeStr = new Date(time * 1000).toLocaleString();
    const shortSig = txSig.slice(0, 8);
    const [expanded, setExpanded] = useState(false);

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
                        No.
                        {replyLink ? (
                            <a href={replyLink} title="View thread">{shortSig}</a>
                        ) : (
                            <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer" title="View on Solscan">{shortSig}</a>
                        )}
                        {replyLink && (
                            <> &nbsp; <span>[<a href={replyLink} className="replylink">Reply</a>]</span></>
                        )}
                    </span>
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
                <blockquote className="postMessage">
                    {com}
                </blockquote>
            </div>
        </div>
    );
}
