// Single source of truth for on-chain inscription references. We store only the
// bare tx signature on chain (never an assembled gateway url), so the gateway
// host stays a render-time choice: a post survives any gateway move, and a dead
// gateway just falls through to the next candidate.

// Solana tx signature: base58, roughly 88 chars. EVM tx hash: 0x + 64 hex.
const SOLANA_SIG = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;
const EVM_HASH = /^0x[a-fA-F0-9]{64}$/;

function isSig(value: string): boolean {
    return SOLANA_SIG.test(value) || EVM_HASH.test(value);
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
    if (isSig(value)) return value;
    let url: URL;
    try { url = new URL(value); } catch { return null; }
    const post = url.searchParams.get("post");
    if (post && isSig(post)) return post;
    const seg = url.pathname.match(/\/(?:img|render)\/([^/.?]+)/);
    if (seg && isSig(seg[1])) return seg[1];
    return null;
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
