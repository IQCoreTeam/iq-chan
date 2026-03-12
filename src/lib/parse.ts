// Parsing utilities specific to iqchan — not in SDK

export type Segment =
    | { type: "text"; value: string }
    | { type: "quote"; no: number };

// parseQuoteRefs(text)
//   Extract all >>no references from post body text.
//
// Input:  text (string) — e.g. "hello >>123 world >>456"
// Output: number[] — e.g. [123, 456]
export function parseQuoteRefs(text: string): number[] {
    const matches = text.matchAll(/>>(\d+)/g);
    return Array.from(matches, (m) => Number(m[1]));
}

// segmentPostBody(text)
//   Split post body into renderable segments — plain text and >>no quote references.
//   Components map over this array to render text as-is and quotes as <QuoteLink />.
//
// Input:  text (string) — e.g. "hello >>123 world"
// Output: Segment[] — e.g. [{type:"text", value:"hello "}, {type:"quote", no:123}, {type:"text", value:" world"}]
export function segmentPostBody(text: string): Segment[] {
    const parts = text.split(/(>>\d+)/);
    const segments: Segment[] = [];
    for (const part of parts) {
        if (!part) continue;
        const quoteMatch = part.match(/^>>(\d+)$/);
        if (quoteMatch) {
            segments.push({ type: "quote", no: Number(quoteMatch[1]) });
        } else {
            segments.push({ type: "text", value: part });
        }
    }
    return segments;
}

// mergeInstructions(posts, instructions)
//   Apply edit/delete instruction logs to a list of posts.
//   Instructions are append-only — originals are immutable on-chain.
//
// Input:  posts (Post[]) — original posts from readTableRows
//         instructions (Instruction[]) — edit/delete logs from instruction table
// Output: Post[] — posts with edits applied, deleted posts removed
export function mergeInstructions(
    posts: Record<string, unknown>[],
    instructions: Record<string, unknown>[],
): Record<string, unknown>[] {
    if (instructions.length === 0) return posts;

    // Group instructions by target signature
    const byTarget = new Map<string, Record<string, unknown>[]>();
    for (const instr of instructions) {
        const target = instr.target as string | undefined;
        if (!target) continue;
        const list = byTarget.get(target);
        if (list) list.push(instr);
        else byTarget.set(target, [instr]);
    }

    const deleted = new Set<string>();
    const result = posts.map((post) => {
        const sig = post.__txSignature as string | undefined;
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
                merged = { ...merged, com: instr.com };
            }
        }
        return merged;
    });

    return result.filter((post) => {
        const sig = post.__txSignature as string | undefined;
        return !sig || !deleted.has(sig);
    });
}
