import { NETWORKS } from "./chains/networks";
import type { NetworkDescriptor } from "./chains/types";

// Shared provider restrictions for browser requests and server extraction.
export const ALLWEBS_PAGE = /^https:\/\/allwebs\.ru\/video\/[A-Za-z0-9.]+$/;
export const ALLWEBS_MEDIA = /^https:\/\/allwebs\.ru\/images\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9]+\.(mov|mp4|webm)$/i;

/** Only known inscription/explorer links or transaction IDs enter the gateway. */
export function parseInscription(value: string, network: NetworkDescriptor): { id: string; network: NetworkDescriptor } | null {
    let id = value.trim();
    let selected = network;
    if (/^https?:\/\//i.test(id)) {
        let url: URL;
        try { url = new URL(id); } catch { return null; }
        const uploader = new URL(process.env.NEXT_PUBLIC_INSCRIPTION_URL || "https://iqlabs.dev/");
        const configuredUploader = url.origin === uploader.origin;
        const localUploader = configuredUploader && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
        if ((url.protocol !== "https:" && !(url.protocol === "http:" && localUploader)) || url.username || url.password) return null;
        if ((["https://iqlabs.dev", "https://iq6900.com"].includes(url.origin) || configuredUploader) && ["codein", "hoodin"].includes(url.searchParams.get("menu") || "")) {
            id = url.searchParams.get("post") || "";
            selected = url.searchParams.get("menu") === "hoodin" ? NETWORKS.robinhood : NETWORKS.solana;
        } else {
            const explorer = Object.values(NETWORKS).find(net => id.startsWith(net.explorerTxUrl));
            if (!explorer) return null;
            if (url.searchParams.has("cluster") && url.searchParams.get("cluster") !== "mainnet-beta") return null;
            id = url.pathname.split("/").at(-1) || "";
            selected = explorer;
        }
    }
    if (/^[1-9A-HJ-NP-Za-km-z]{80,88}$/.test(id)) return {id, network: NETWORKS.solana};
    if (/^0x[0-9a-fA-F]{64}$/.test(id) && selected.family === "evm") {
        return {id: id.toLowerCase(), network: selected};
    }
    return null;
}

/** Resolve legacy links and canonical IDs through the same parser. */
export function inscriptionMediaPath(value: string, network: NetworkDescriptor): string | null {
    const inscription = parseInscription(value, network);
    return inscription ? `/media/${inscription.id}?network=${encodeURIComponent(inscription.network.gatewayNetworkParam || inscription.network.id)}` : null;
}

export function inscriptionSiteUrl(network: NetworkDescriptor, id?: string): string | null {
    if (network.id !== "solana" && network.id !== "robinhood") return null;
    const url = new URL(process.env.NEXT_PUBLIC_INSCRIPTION_URL || "https://iqlabs.dev/");
    url.searchParams.set("menu", network.id === "robinhood" ? "hoodin" : "codein");
    if (id) url.searchParams.set("post", id);
    return url.href;
}
