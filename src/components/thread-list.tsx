"use client";

import Link from "next/link";
import { ThreadEntry } from "../lib/board";

const PREVIEW_LENGTH = 200;

export default function ThreadList({
    threads,
    boardId,
}: {
    threads: ThreadEntry[];
    boardId: string;
}) {
    return (
        <div className="board">
            {threads.map((thread) => {
                const op = thread.opData;
                if (!op) return null;

                const com = op.com ?? "";
                const truncated =
                    com.length > PREVIEW_LENGTH
                        ? com.slice(0, PREVIEW_LENGTH) + "..."
                        : com;
                const shortSig = (op.__txSignature ?? thread.threadPda).slice(0, 8);

                return (
                    <div key={thread.threadPda}>
                        <Link
                            href={`/${boardId}/${thread.threadPda}`}
                            className="threadPreview"
                        >
                            <div style={{ overflow: "hidden" }}>
                                {op.img && (
                                    <div className="fileThumb" style={{ float: "left", margin: "3px 20px 5px" }}>
                                        <img
                                            src={op.img}
                                            alt=""
                                            style={{ maxHeight: 150, maxWidth: 150, border: "none" }}
                                            loading="lazy"
                                        />
                                    </div>
                                )}
                                <div className="postInfo">
                                    {op.sub && <span className="subject">{op.sub} </span>}
                                    <span className="nameBlock">
                                        <span className="name">{op.name}</span>
                                    </span>
                                    {" "}
                                    <span className="dateTime">
                                        {new Date(op.time * 1000).toLocaleString()}
                                    </span>
                                    {" "}
                                    <span className="postNum">No.{shortSig}</span>
                                </div>
                                <blockquote className="postMessage">
                                    {truncated}
                                </blockquote>
                            </div>
                        </Link>
                        <hr className="board" style={{ borderTop: "1px solid #b7c5d9", border: "none", borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "#b7c5d9" }} />
                    </div>
                );
            })}
        </div>
    );
}
