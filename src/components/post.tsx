"use client";

import { useState, useEffect, useRef } from "react";
import { formatPostMessage, safePostUrl } from "../lib/format";
import { scrollToPost, highlightPost, showPostPreview, hidePostPreview } from "../lib/highlight";
import { formatDate, timeAgo } from "../lib/time";
import { resolveNetwork } from "../lib/chains/resolve";

export default function Post({
    txSig,
    com,
    name,
    time,
    sub,
    img,
    signer,
    isOp,
    replyLink,
    boardId,
    threadPda,
    backlinks,
    onQuote,
    onHide,
    isHidden,
}: {
    txSig: string;
    com: string;
    name: string;
    time: number;
    sub?: string;
    img?: string;
    signer?: string;
    isOp?: boolean;
    replyLink?: string;
    boardId?: string;
    threadPda?: string;
    backlinks?: string[];
    onQuote?: (sig: string) => void;
    onHide?: () => void;
    isHidden?: boolean;
}) {
    const display = txSig.slice(0, 8);
    const net = resolveNetwork();
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [linkCopy, setLinkCopy] = useState<"idle" | "copied" | "failed">("idle");
    const menuRefMobile = useRef<HTMLSpanElement>(null);
    const menuRefDesktop = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        setLinkCopy("idle");
        if (!menuOpen) return;
        function handleClick(e: MouseEvent) {
            const target = e.target as Node;
            if (menuRefMobile.current?.contains(target)) return;
            if (menuRefDesktop.current?.contains(target)) return;
            setMenuOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [menuOpen]);

    // Drop any non-http(s) image url instead of linking it: the field is
    // attacker-controlled on-chain data and lands in an href below.
    const safeImg = safePostUrl(img);

    let fileName = "";
    if (safeImg) {
        try { fileName = decodeURIComponent(new URL(safeImg).pathname.split("/").pop() ?? "image"); }
        catch { fileName = "image"; }
    }

    const fileBlock = safeImg ? (
        <div className="file" id={`f${txSig}`}>
            <div className="fileText" id={`fT${txSig}`}>
                File: <a href={safeImg} target="_blank" rel="noopener noreferrer">{fileName}</a>
            </div>
            <a
                className={`fileThumb${expanded ? " fileThumbExpanded" : ""}`}
                href={safeImg}
                onClick={(e) => { e.preventDefault(); setExpanded((v) => !v); }}
            >
                <img
                    src={safeImg}
                    alt={fileName}
                    style={expanded
                        ? { maxWidth: "100%", maxHeight: "none" }
                        : { maxHeight: isOp ? 250 : 125, maxWidth: isOp ? 250 : 125 }
                    }
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/404.webp"; }}
                />
                <div className="mFileInfo mobile">
                    {expanded && <div className="mFileName">{fileName}</div>}
                </div>
            </a>
        </div>
    ) : null;

    const digitsLink = onQuote
        ? <a href="#" title="Reply to this post" onClick={(e) => { e.preventDefault(); onQuote(txSig); }}>{display}</a>
        : replyLink
            ? <a href={replyLink} title="Reply to this post">{display}</a>
            : <a href={`${net.explorerTxUrl}${txSig}`} target="_blank" rel="noopener noreferrer" title={`View on ${net.explorerName}`}>{display}</a>;

    const postUrl = () => `${window.location.origin}${window.location.pathname}#/${boardId}/${threadPda}:p${txSig}`;

    const menuDropdown = menuOpen ? (
        <div className="dd-menu" style={{ position: "absolute", top: "100%", left: 0, background: "var(--panel)", border: "1px solid var(--edge)", zIndex: 9999, boxShadow: "1px 1px 2px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 12 }}>
                {onHide && (
                    <li style={{ padding: "3px 10px", cursor: "pointer" }} onClick={() => { onHide(); setMenuOpen(false); }}>
                        {isHidden
                            ? (isOp ? "Unhide thread" : "Unhide post")
                            : (isOp ? "Hide thread" : "Hide post")}
                    </li>
                )}
                {img && (
                    <li style={{ padding: "3px 10px", cursor: "pointer" }} onClick={() => { window.open(img, "_blank"); setMenuOpen(false); }}>
                        Open original file
                    </li>
                )}
                <li style={{ padding: "3px 10px", cursor: "pointer" }} onClick={() => { window.open(`${net.explorerTxUrl}${txSig}`, "_blank"); setMenuOpen(false); }}>
                    View on {net.explorerName}
                </li>
                {signer && (
                    <li style={{ padding: "3px 10px", cursor: "pointer" }} onClick={() => {
                        window.open(`https://profile.iqlabs.dev/${signer}`, "_blank", "noopener,noreferrer");
                        setMenuOpen(false);
                    }}>
                        Go to the IQ Profile
                    </li>
                )}
                {signer && (
                    <li style={{ padding: "3px 10px", cursor: "pointer" }} onClick={() => {
                        navigator.clipboard.writeText(signer);
                        setMenuOpen(false);
                    }}>
                        Copy wallet address
                    </li>
                )}
                {boardId && threadPda && (
                    <>
                        <li style={{ padding: "3px 10px" }}>
                            <button type="button" style={{ border: 0, padding: 0, background: "none", color: "inherit", font: "inherit", cursor: "pointer" }} onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(postUrl());
                                    setLinkCopy("copied");
                                } catch {
                                    setLinkCopy("failed");
                                }
                            }}>
                                {linkCopy === "copied" ? "Link copied!" : "Copy link to post"}
                            </button>
                            {linkCopy === "failed" && <div role="status" style={{ whiteSpace: "normal", width: 200 }}>
                                Couldn’t copy. Select the link below:
                                <input aria-label="Link to post" readOnly value={postUrl()} onFocus={(e) => e.currentTarget.select()} style={{ width: "100%", boxSizing: "border-box" }} />
                            </div>}
                        </li>
                        <li style={{ padding: "3px 10px", cursor: "pointer" }} onClick={() => {
                            const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(sub || `Check out this post on ${net.theme.siteName}`)}&url=${encodeURIComponent(postUrl())}`;
                            window.open(tweet, "_blank", "noopener,noreferrer");
                            setMenuOpen(false);
                        }}>
                            Share on X
                        </li>
                    </>
                )}
            </ul>
        </div>
    ) : null;

    const backlinksBlock = backlinks && backlinks.length > 0 ? (
        <div id={`bl_${txSig}`} className="backlink mobile">
            {backlinks.map((bl) => (
                <span key={bl}>
                    <a
                        href={`#p${bl}`}
                        className="quotelink"
                        onClick={(e) => { e.preventDefault(); scrollToPost(bl); }}
                        onMouseEnter={(e) => { highlightPost(bl, true); showPostPreview(bl, e); }}
                        onMouseLeave={() => { highlightPost(bl, false); hidePostPreview(); }}
                    >
                        &gt;&gt;{bl.slice(0, 8)} #
                    </a>
                    {" "}
                </span>
            ))}
        </div>
    ) : null;

    /* Mobile post info (4chan's postInfoM mobile) — shown on mobile, hidden on desktop */
    const postInfoMobile = (
        <div className="postInfoM mobile" id={`pim${txSig}`}>
            <span ref={menuRefMobile} style={{ position: "relative", display: "inline" }}>
                <a
                    href="#"
                    className={`postMenuBtn${menuOpen ? " menuOpen" : ""}`}
                    title="Post menu"
                    data-cmd="post-menu"
                    onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
                >&#8942;</a>
                {menuDropdown}
            </span>
            <span className="nameBlock">
                <span className="name">{name}</span>
            </span>
            <span className="dateTime postNum" data-utc={time}>
                {formatDate(time)}{" "}
                <a href={replyLink ?? `#p${txSig}`} title="Link to this post"
                    onClick={replyLink ? undefined : (e) => { e.preventDefault(); scrollToPost(txSig); }}
                >No.</a>
                {digitsLink}
            </span>
            {sub && <><br /><span className="subject">{sub}</span></>}
        </div>
    );

    /* Desktop post info — shown on desktop, hidden on mobile */
    const postInfoDesktop = (
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
            <span className="dateTime" data-utc={time} title={timeAgo(time)}>{formatDate(time)}</span>
            {" "}
            <span className="postNum desktop">
                <a
                    href={replyLink ?? `#p${txSig}`}
                    title="Link to this post"
                    onClick={replyLink ? undefined : (e) => { e.preventDefault(); scrollToPost(txSig); }}
                >No.</a>
                {digitsLink}
                {isOp && replyLink && (
                    <> &nbsp; <span>[<a href={replyLink} className="replylink">Reply</a>]</span></>
                )}
            </span>
            <span ref={menuRefDesktop} style={{ position: "relative", display: "inline" }}>
                <a
                    href="#"
                    className={`postMenuBtn${menuOpen ? " menuOpen" : ""}`}
                    title="Post menu"
                    data-cmd="post-menu"
                    onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
                >
                    ▶
                </a>
                {menuDropdown}
            </span>
            {backlinks && backlinks.length > 0 && (
                <div id={`bld_${txSig}`} className="backlink desktop">
                    {backlinks.map((bl) => (
                        <span key={bl}>
                            <a
                                href={`#p${bl}`}
                                className="quotelink"
                                onClick={(e) => { e.preventDefault(); scrollToPost(bl); }}
                                onMouseEnter={(e) => { highlightPost(bl, true); showPostPreview(bl, e); }}
                                onMouseLeave={() => { highlightPost(bl, false); hidePostPreview(); }}
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
                {postInfoMobile}
                {isOp ? <>{!isHidden && fileBlock}{postInfoDesktop}</> : <>{postInfoDesktop}{!isHidden && fileBlock}</>}
                {!isHidden && (
                    <>
                        <blockquote className="postMessage" id={`m${txSig}`}>
                            {formatPostMessage(com)}
                        </blockquote>
                        {backlinksBlock}
                    </>
                )}
            </div>
        </div>
    );
}
