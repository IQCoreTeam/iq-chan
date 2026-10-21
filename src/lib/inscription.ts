import { bs58 } from "@coral-xyz/anchor/dist/esm/utils/bytes";
import { NETWORKS } from "./chains/networks";
import type { NetworkDescriptor } from "./chains/types";

// On-chain attachment references may be bare IDs or links carrying a chain.
// Parse the identity rather than fetching the stored URL: gateway hosts remain
// a render-time choice, so moving a gateway needs no post rewrite.

// Solana tx signature: base58, roughly 88 chars. EVM tx hash: 0x + 64 hex.
const SOLANA_SIG = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
const EVM_HASH = /^0x[a-fA-F0-9]{64}$/;

function isSig(value: string): boolean {
    return (SOLANA_SIG.test(value) && bs58.decode(value).length === 64) || EVM_HASH.test(value);
}

/**
 * Pull an inscription signature out of whatever the user pasted or whatever is
 * stored in a post's img field: a bare sig/hash, an iqlabs.dev ?post=<sig> link,
 * or a gateway /img/<sig>.png or /render/<sig> url. Returns null for a plain
 * attachment url (or junk), so callers fall back to the normal url path.
 */
export function parseInscriptionRef(input?: string): string | null {
    if (!input) return null;
    const value = input.trim();
    if (!value) return null;
    if (isSig(value)) return EVM_HASH.test(value) ? value.toLowerCase() : value;
    let url: URL;
    try { url = new URL(value); } catch { return null; }
    const post = url.searchParams.get("post");
    if (post && isSig(post)) return EVM_HASH.test(post) ? post.toLowerCase() : post;
    const seg = url.pathname.match(/\/(?:img|render)\/([^/.?]+)/);
    if (seg && isSig(seg[1])) return EVM_HASH.test(seg[1]) ? seg[1].toLowerCase() : seg[1];
    return null;
}

/** BlockChan's cross-chain attachment target is Robinhood, not arbitrary EVM chains. */
export function inscriptionNetwork(input: string, fallback: NetworkDescriptor): NetworkDescriptor {
    const sig = parseInscriptionRef(input);
    if (!sig) return fallback;
    if (!sig.startsWith("0x")) return NETWORKS.solana;
    // EVM hashes contain no chain ID. BlockChan supports Robinhood attachments;
    // existing EVM builds retain their own network rather than probing chains.
    return fallback.id === "solana" ? NETWORKS.robinhood : fallback;
}

/**
 * Gateway image candidates for a sig, primary host first: /img across every
 * gateway, then /render across every gateway. The renderer walks this on error,
 * so one dead gateway or a text/ascii inscription (which /img cannot rasterize
 * but /render can) still shows something before the 404 placeholder.
 */
export function inscriptionSrcCandidates(sig: string, gateways: string[], networkParam?: string): string[] {
    const query = networkParam ? `?network=${networkParam}` : "";
    const img = gateways.map((gateway) => `${gateway}/img/${sig}.png${query}`);
    const render = gateways.map((gateway) => `${gateway}/render/${sig}${query}`);
    return [...img, ...render];
}

/**
 * The gateway viewer page for a sig, where the user sees the inscription with
 * how-to-check and explorer buttons. Unlike the raw /img render, this is a human
 * page, so "open on gateway" points here.
 */
export function inscriptionViewUrl(sig: string, gateway: string, networkParam?: string): string {
    const query = networkParam ? `?network=${networkParam}` : "";
    return `${gateway}/view/${sig}${query}`;
}

/** The existing uploader owns writing; the posting app stores its returned ID. */
export function inscriptionSiteUrl(network: NetworkDescriptor): string | null {
    if (!["solana", "robinhood"].includes(network.id)) return null;
    const url = new URL(process.env.NEXT_PUBLIC_INSCRIPTION_URL || "https://iqlabs.dev/");
    url.searchParams.set("menu", network.id === "robinhood" ? "hoodin" : "codein");
    return url.href;
}
