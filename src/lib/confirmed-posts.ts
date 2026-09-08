import type { Post, Reply } from "./types";

export function isConfirmedPost(value: unknown): value is Post & { __txSignature: string } {
    if (!value || typeof value !== "object") return false;
    const row = value as Partial<Post>;
    return typeof row.__txSignature === "string" && !!row.__txSignature
        && typeof row.com === "string" && typeof row.name === "string" && typeof row.time === "number";
}

// Keep locally confirmed rows while the gateway catches up; reconcile by tx ID.
export function mergeConfirmedReplies(remote: Reply[], confirmed: Reply[]): Reply[] {
    const ids = new Set(remote.map((row) => row.__txSignature));
    return [...remote, ...confirmed.filter((row) => !ids.has(row.__txSignature))]
        .sort((a, b) => a.time - b.time);
}
