export interface Post {
    sub?: string;
    com: string;
    name: string;
    time: number;
    img?: string;
    threadPda?: string;
    threadSeed?: string;
    __txSignature?: string;
}

export interface Reply {
    com: string;
    name: string;
    time: number;
    img?: string;
    __txSignature?: string;
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
