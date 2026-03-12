// Instruction Resolution for paginated reply loading.
//
// 3-Tier strategy:
//   Tier 0: instrSigs.length === 0 → skip entirely (caller handles)
//   Tier 1: instrSigs.length <= 50 → eager fetch all via /slice (caller handles)
//   Tier 2: instrSigs.length > 50 → Sparse Sampling + Interpolation Search (this module)

import { Connection } from "@solana/web3.js";
import { fetchTableSliceBatched, type Row } from "./gateway";

export interface TimeMapEntry {
    index: number;
    blockTime: number;
}

export type Instruction = Row & { target?: string };

// ─── Phase A: Sparse Time Sampling ──────────────────────────────────────────
// Sample sqrt(N) evenly-spaced signatures and fetch their blockTimes via RPC.
// Called once on thread mount when instrSigs > 50.

export async function buildSparseTimeMap(
    connection: Connection,
    instrSigs: string[],
): Promise<TimeMapEntry[]> {
    const n = instrSigs.length;
    const k = Math.min(Math.max(Math.ceil(Math.sqrt(n)), 5), 30);

    // Compute evenly-spaced sample indices, always including first and last
    const sampleIndices: number[] = [0];
    for (let i = 1; i < k - 1; i++) {
        sampleIndices.push(Math.floor((i * (n - 1)) / (k - 1)));
    }
    if (n > 1) sampleIndices.push(n - 1);

    // Deduplicate indices
    const uniqueIndices = [...new Set(sampleIndices)].sort((a, b) => a - b);

    // Fetch blockTime for each sample via getTransaction
    const entries: TimeMapEntry[] = [];
    const batchSize = 10; // parallel batch to avoid hammering RPC

    for (let i = 0; i < uniqueIndices.length; i += batchSize) {
        const batch = uniqueIndices.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map(async (idx) => {
                const sig = instrSigs[idx];
                const tx = await connection.getTransaction(sig, {
                    maxSupportedTransactionVersion: 0,
                });
                return {
                    index: idx,
                    blockTime: tx?.blockTime ?? 0,
                };
            }),
        );
        entries.push(...results.filter((e) => e.blockTime > 0));
    }

    // Sort by index (should already be, but ensure)
    entries.sort((a, b) => a.index - b.index);
    return entries;
}

// ─── Phase B: Interpolation Search ──────────────────────────────────────────
// Given the sparse timeMap, estimate which instrSigs indices could contain
// instructions targeting replies on the current page.
//
// instrSigs is newest-first, so:
//   timeMap[0] has the highest blockTime (newest)
//   timeMap[last] has the lowest blockTime (oldest)
//
// Returns rangeEnd: all instrSigs[0..rangeEnd] are candidates.

export function estimateCandidateRange(
    timeMap: TimeMapEntry[],
    instrSigsLength: number,
    T_oldest: number,
): number {
    if (timeMap.length === 0) return instrSigsLength - 1;

    // If T_oldest is older than the oldest instruction, all instructions are candidates
    const oldestEntry = timeMap[timeMap.length - 1];
    if (T_oldest <= oldestEntry.blockTime) return instrSigsLength - 1;

    // If T_oldest is newer than the newest instruction, no instructions are candidates
    const newestEntry = timeMap[0];
    if (T_oldest > newestEntry.blockTime) return -1;

    // Find the two adjacent sample points that bracket T_oldest
    // timeMap is sorted by index (ascending), blockTime is descending (newest-first)
    let leftIdx = 0;
    let rightIdx = timeMap.length - 1;

    for (let i = 0; i < timeMap.length - 1; i++) {
        if (timeMap[i].blockTime >= T_oldest && timeMap[i + 1].blockTime < T_oldest) {
            leftIdx = i;
            rightIdx = i + 1;
            break;
        }
    }

    const left = timeMap[leftIdx];
    const right = timeMap[rightIdx];

    // Interpolate the estimated index where blockTime ≈ T_oldest
    const timeDelta = left.blockTime - right.blockTime;
    if (timeDelta === 0) return right.index;

    const fraction = (left.blockTime - T_oldest) / timeDelta;
    const estimatedIdx = Math.floor(
        left.index + fraction * (right.index - left.index),
    );

    // Add safety margin: 10% of the sample interval
    const sampleInterval = right.index - left.index;
    const margin = Math.max(Math.ceil(sampleInterval * 0.1), 2);

    return Math.min(estimatedIdx + margin, instrSigsLength - 1);
}

// ─── Phase C: Fetch & Filter ────────────────────────────────────────────────
// Fetch uncached instructions within the candidate range, then filter
// to those whose target matches a reply on the current page.

export async function resolveInstructionsForPage(
    instrSigs: string[],
    rangeEnd: number,
    pageReplySigs: Set<string>,
    instrCache: Map<string, Instruction>,
    instrPda: string,
): Promise<Instruction[]> {
    if (rangeEnd < 0) return [];

    const candidateSigs = instrSigs.slice(0, rangeEnd + 1);

    // Find uncached sigs
    const uncached = candidateSigs.filter((sig) => !instrCache.has(sig));

    // Fetch uncached via gateway /slice (batched at 50)
    if (uncached.length > 0) {
        const rows = await fetchTableSliceBatched(instrPda, uncached);
        for (const row of rows) {
            const sig = row.__txSignature;
            if (sig) {
                instrCache.set(sig, row as Instruction);
            }
        }
    }

    // Filter to instructions targeting replies on the current page
    const relevant: Instruction[] = [];
    for (const sig of candidateSigs) {
        const instr = instrCache.get(sig);
        if (instr && instr.target && pageReplySigs.has(instr.target)) {
            relevant.push(instr);
        }
    }

    return relevant;
}
