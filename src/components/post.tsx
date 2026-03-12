"use client";

import { segmentPostBody } from "../lib/parse";
import QuoteLink from "./quote-link";

export default function Post({
    no,
    com,
    name,
    time,
    sub,
    img,
    isOwner,
    onEdit,
    onDelete,
}: {
    no: number;
    com: string;
    name: string;
    time: number;
    sub?: string;
    img?: string;
    isOwner?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    const timeStr = new Date(time * 1000).toLocaleString();
    const segments = segmentPostBody(com);

    return (
        <div id={`post-${no}`} className="p-2 transition-colors duration-300">
            {/* ─── Image ────────────────────────────────────────── */}
            {img && (
                <div className="float-left mr-3 mb-1">
                    <a href={img} target="_blank" rel="noopener noreferrer">
                        <img
                            src={img}
                            alt=""
                            className="max-w-[150px] max-h-[150px] border border-gray-300"
                        />
                    </a>
                </div>
            )}

            {/* ─── Header ───────────────────────────────────────── */}
            <div className="text-sm">
                <span className="font-bold text-green-800">{name}</span>
                {" "}
                <span className="text-gray-500">No.{no}</span>
                {" "}
                <span className="text-gray-400">{timeStr}</span>
                {isOwner && (
                    <span className="ml-2">
                        {onEdit && (
                            <button onClick={onEdit} className="text-blue-600 hover:underline text-xs mr-1">
                                [Edit]
                            </button>
                        )}
                        {onDelete && (
                            <button onClick={onDelete} className="text-red-600 hover:underline text-xs">
                                [Delete]
                            </button>
                        )}
                    </span>
                )}
            </div>

            {/* ─── Subject ──────────────────────────────────────── */}
            {sub && <div className="font-bold text-base mt-1">{sub}</div>}

            {/* ─── Body ─────────────────────────────────────────── */}
            <div className="mt-1 text-sm whitespace-pre-wrap clear-both">
                {segments.map((seg, i) =>
                    seg.type === "quote" ? (
                        <QuoteLink key={i} no={seg.no} />
                    ) : (
                        <span key={i}>{seg.value}</span>
                    ),
                )}
            </div>
        </div>
    );
}
