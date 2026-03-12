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
    // 1. Match all />>(\d+)/g in text
    // 2. Extract capture group as numbers
    // 3. Return array of referenced post numbers
    throw new Error("TODO");
}

// segmentPostBody(text)
//   Split post body into renderable segments — plain text and >>no quote references.
//   Components map over this array to render text as-is and quotes as <QuoteLink />.
//
// Input:  text (string) — e.g. "hello >>123 world"
// Output: Segment[] — e.g. [{type:"text", value:"hello "}, {type:"quote", no:123}, {type:"text", value:" world"}]
export function segmentPostBody(text: string): Segment[] {
    // 1. Split text by />>(\d+)/ pattern
    // 2. Alternate between text segments and quote segments
    // 3. Filter out empty text segments
    // 4. Return the segment array
    throw new Error("TODO");
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
    // 1. For each instruction:
    //    - Match to original post via "target" field (tx signature)
    //    - If instruction has "com" field → overwrite post.com (edit)
    //    - If instruction has no data (empty) → mark post as deleted
    // 2. Filter out deleted posts
    // 3. Return the resulting posts array
    throw new Error("TODO");
}
