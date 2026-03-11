// iqchan-specific configuration

export const DB_ROOT_ID = "iqchan";

// Feed PDA seed prefix — used for bump ordering via getSignaturesForAddress
export const FEED_SEED_PREFIX = "feedmY}AGBJiqLabs";

// Table seed helpers
// boards table:           hash("boards")
// threads ext table:      hash("boards/{boardId}/threads")
// replies ext table:      hash("boards/{boardId}/threads/{no}/replies")

export function boardsTableSeed(): string {
    return "boards";
}

export function threadsTableSeed(boardId: string): string {
    return `boards/${boardId}/threads`;
}

export function repliesTableSeed(boardId: string, threadNo: number): string {
    return `boards/${boardId}/threads/${threadNo}/replies`;
}
