export interface Post {
    sub?: string;
    com: string;
    name: string;
    time: number;
    img?: string;
    threadPda?: string;
    threadSeed?: string;
    __txSignature?: string;
    __signer?: string;
}

export interface Reply {
    com: string;
    name: string;
    time: number;
    img?: string;
    __txSignature?: string;
    __signer?: string;
}

export interface BoardMeta {
    id: string;        // URL slug (for official) or seed hash (for unofficial)
    seed: string;      // on-chain seed for PDA derivation
    title: string;
    description: string;
    image: string;
    gateMint?: string;
    gateAmount?: number;
    gateType?: number;
    creator?: string;
    time?: number;
    __txSignature?: string;
}

// ─── Chain-neutral view models ──────────────────────────────────────────────
// These carry no chain-specific type (base58 vs 0x is just `string`), so both
// the Solana and EVM adapters produce them and every page/component consumes
// them without knowing which chain is live.

export interface ThreadEntry {
    // Thread reference. On Solana this is the board table PDA (base58); on EVM
    // the board table name. Field name kept as `threadPda` for back-compat with
    // existing routing/components — treat it as an opaque thread id string.
    threadPda: string;
    opData: Post | null;
    lastActivityTime: number;
    replyCount: number;
    lastReplies: Reply[];
}

export interface ThreadResult {
    op: Post | null;
    replies: Reply[];
    totalReplies: number;
}

export interface BoardGate {
    gateMint?: string;
    gateAmount?: number;
    gateType?: number;
    tableName?: string;
}
