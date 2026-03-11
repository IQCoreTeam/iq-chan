// Parsing logic specific to iqchan — not in SDK

// TODO: Parse >>no quote references from post body
// Input:  "hello >>123 world >>456"
// Output: [123, 456]
export function parseQuoteRefs(text: string): number[] {
    // regex: />>(\d+)/g
    throw new Error("TODO");
}

// TODO: Render post body with >>no as clickable links
// Input:  "hello >>123"
// Output: ["hello ", <QuoteLink no={123} />]
// This returns React-renderable segments
export function segmentPostBody(text: string): Array<{ type: "text"; value: string } | { type: "quote"; no: number }> {
    // split by >>(\d+), alternate between text and quote segments
    throw new Error("TODO");
}

// TODO: Apply edit/delete instructions to a list of posts
// 1. Fetch instruction table rows for the thread
// 2. For each instruction: if metadata has "com" → edit, if empty → delete
// 3. Return posts with edits applied and deleted posts removed
export function mergeInstructions(
    posts: Record<string, unknown>[],
    instructions: Record<string, unknown>[],
): Record<string, unknown>[] {
    // for each instruction:
    //   find post by target_tx
    //   if instruction has "com" → overwrite post.com
    //   if instruction has no data → mark as deleted
    // filter out deleted posts
    throw new Error("TODO");
}
