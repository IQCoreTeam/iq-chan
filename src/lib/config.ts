export const RPC_ENDPOINT =
    process.env.NEXT_PUBLIC_RPC_ENDPOINT ?? "https://api.mainnet-beta.solana.com";

const PRIMARY_GATEWAY = "https://gateway.solanainternet.com";
const BACKUP_GATEWAY = "https://gateway.iqlabs.dev";

const AKASH_DIRECT = "https://fem4pe7sthdm5f9fkhc1fnmpos.ingress.akashprovid.com";

export const GATEWAY_FALLBACKS = [PRIMARY_GATEWAY, AKASH_DIRECT, BACKUP_GATEWAY];

/** Gateway URL - user can override via localStorage "blockchan_gateway" */
export function getGatewayUrl(): string {
    if (typeof window !== "undefined") {
        const custom = localStorage.getItem("blockchan_gateway");
        if (custom) return custom;
    }
    return PRIMARY_GATEWAY;
}

/** Load fallbacks - user can customize via localStorage "blockchan_fallbacks" */
export function getFallbacks(): string[] {
    if (typeof window !== "undefined") {
        const saved = localStorage.getItem("blockchan_fallbacks");
        if (saved) try { return JSON.parse(saved); } catch {}
    }
    return GATEWAY_FALLBACKS;
}
