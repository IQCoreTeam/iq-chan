export const RPC_ENDPOINT =
    process.env.NEXT_PUBLIC_RPC_ENDPOINT ?? "https://api.mainnet-beta.solana.com";

const DEFAULT_GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "https://gateway.iqlabs.dev";

export const GATEWAY_FALLBACK = "https://gateway.iqlabs.dev";

/** Gateway URL - user can override via localStorage "blockchan_gateway" */
export function getGatewayUrl(): string {
    if (typeof window !== "undefined") {
        const custom = localStorage.getItem("blockchan_gateway");
        if (custom) return custom;
    }
    return DEFAULT_GATEWAY;
}

