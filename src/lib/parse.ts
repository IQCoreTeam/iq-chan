import type { Row } from "./gateway";

// Apply edit/delete instruction logs to posts.
// Edits overwrite fields, deletes remove the post.
export function mergeInstructions(posts: Row[], instructions: Row[]): Row[] {
    if (instructions.length === 0) return posts;

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
            const dataKeys = Object.keys(instr).filter(
                (k) => k !== "target" && k !== "__txSignature",
            );
            if (dataKeys.length === 0) {
                deleted.add(sig);
                return merged;
            }
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
