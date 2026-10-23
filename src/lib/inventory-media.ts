/** Classify media from a row the inventory already fetched; never hydrate a file. */
export function inventoryMediaKind(row: Record<string, unknown>): "image" | "audio" | "video" | null {
    const mime = typeof row.body === "string"
        ? /^data:(image|audio|video)\//i.exec(row.body)?.[1].toLowerCase()
        : undefined;
    if (mime === "image" || mime === "audio" || mime === "video") return mime;
    return row.kind === "image" || row.kind === "audio" || row.kind === "video" ? row.kind : null;
}
