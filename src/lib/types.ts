export interface Board {
    board_id: string;
    title: string;
    description: string;
}

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
