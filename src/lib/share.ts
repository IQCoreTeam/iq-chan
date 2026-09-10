import { HOSTNAME_MAP, NETWORKS } from "./chains/networks";

/** A crawler can read these path segments; it cannot read a #/ fragment. */
export function shareUrl(origin: string, network: string, path: string[] = []): string {
    const url = new URL(origin);
    // On-chain/static mirrors cannot serve dynamic metadata. Share the matching
    // first-party site there; retain localhost for review before deployment.
    const domain = Object.keys(HOSTNAME_MAP).find((host) => HOSTNAME_MAP[host] === network);
    if (domain && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
        url.host = domain;
        url.port = "";
        url.protocol = "https:";
    }
    url.pathname = `/share/${[network, ...path].map(encodeURIComponent).join("/")}`;
    url.search = "";
    url.hash = "";
    return url.href;
}

export function parseSharePath(segments: string[]) {
    const [network, board, thread, post] = segments;
    if (!Object.hasOwn(NETWORKS, network) || segments.length > 4 ||
        segments.some((s) => !/^[a-zA-Z0-9_-]{1,128}$/.test(s))) return null;
    const net = NETWORKS[network];
    if (thread && net.family === "svm" && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(thread)) return null;
    if (post && !(net.family === "evm" ? /^0x[\da-fA-F]{64}$/ : /^[1-9A-HJ-NP-Za-km-z]{80,90}$/).test(post)) return null;
    return { net, board, thread, post: net.family === "evm" ? post?.toLowerCase() : post };
}
