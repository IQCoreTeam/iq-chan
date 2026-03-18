// Parsing utilities specific to iqchan — not in SDK

import type { Row } from "./gateway";

// mergeInstructions(posts, instructions)
//   Apply edit/delete instruction logs to a list of posts.
//   Instructions are append-only — originals are immutable on-chain.
//
// Input:  posts (Row[]) — original posts from readTableRows
//         instructions (Row[]) — edit/delete logs from instruction table
// Output: Row[] — posts with edits applied, deleted posts removed
export function mergeInstructions(
    posts: Row[],
    instructions: Row[],
): Row[] {
    if (instructions.length === 0) return posts;

    // Group instructions by target signature
    const byTarget = new Map<string, Row[]>();
    for (const instr of instructions) {
        const target = instr.target as string | undefined;
        if (!target) continue;
        const list = byTarget.get(target);
        if (list) list.push(instr);
        else byTarget.set(target, [instr]);
    }

    const deleted = new Set<string>();
    const result = posts.map((post) => {
        const sig = post.__txSignature;
        if (!sig) return post;
        const instrList = byTarget.get(sig);
        if (!instrList) return post;

        let merged = { ...post };
        for (const instr of instrList) {
            // Check if this is a delete (empty data / no meaningful fields beyond target)
            const dataKeys = Object.keys(instr).filter(
                (k) => k !== "target" && k !== "__txSignature",
            );
            if (dataKeys.length === 0) {
                deleted.add(sig);
                return merged;
            }
            // Edit: overwrite fields from instruction onto post
            if (instr.com !== undefined) {
                merged = { ...merged, com: instr.com as string };
            }
        }
        return merged;
    });

    return result.filter((post) => {
        const sig = post.__txSignature;
        return !sig || !deleted.has(sig);
    });
}
