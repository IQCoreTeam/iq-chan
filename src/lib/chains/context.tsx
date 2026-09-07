"use client";

// The write-side + wallet boundary. Providers mounts exactly one family subtree
// (Solana or EVM) which fills these two contexts; every component consumes them
// through useChainWallet()/useWriter() and never calls a chain wallet hook
// directly. This is what lets board/thread/post-form render unchanged on either
// chain — the conditional lives in Providers (component branch), not in hooks.

import { createContext, useContext } from "react";
import type { ChainFamily } from "./types";
import { resolveNetwork } from "./resolve";

export interface ChainWallet {
    /** Base58 (Solana) or 0x (EVM) address, or null when disconnected. */
    address: string | null;
    connecting: boolean;
    /** Trigger connect: Solana opens the wallet-select modal; EVM requests
     *  accounts from the injected provider and switches to the target chain. */
    connect: () => void;
    disconnect: () => void;
    family: ChainFamily;
}

export interface ThreadInput { sub: string; com: string; name: string; img?: string }
export interface ReplyInput { com: string; name: string; img?: string; options?: string }
export interface GateArg { mint: string; amount: number; gateType: number }

// Mirrors the shape usePost() has always returned, so its consumers are unchanged.
export interface Writer {
    createThread: (boardId: string, data: ThreadInput, gate?: GateArg) => Promise<unknown>;
    postReply: (threadSeed: string, threadPda: string, boardId: string, data: ReplyInput, replyCount?: number) => Promise<unknown>;
    editPost: (threadSeed: string, targetTxSig: string, newCom: string) => Promise<void>;
    deletePost: (threadSeed: string, targetTxSig: string) => Promise<void>;
    loading: boolean;
    status: string;
    step: number;
    totalSteps: number;
    error: Error | null;
    clearStatus: () => void;
}

const noop = () => {};
const noopAsync = async () => {};

const defaultWallet: ChainWallet = {
    address: null,
    connecting: false,
    connect: noop,
    disconnect: noop,
    get family() { return resolveNetwork().family; },
};

const defaultWriter: Writer = {
    createThread: noopAsync,
    postReply: noopAsync,
    editPost: noopAsync,
    deletePost: noopAsync,
    loading: false,
    status: "",
    step: 0,
    totalSteps: 0,
    error: null,
    clearStatus: noop,
};

export const ChainWalletContext = createContext<ChainWallet>(defaultWallet);
export const WriterContext = createContext<Writer>(defaultWriter);

export function useChainWallet(): ChainWallet {
    return useContext(ChainWalletContext);
}

export function useWriter(): Writer {
    return useContext(WriterContext);
}
