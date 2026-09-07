// Resolves which network this page runs against. This is the single switch the
// domain flips: hoodchan.xyz → robinhood, blockchan.sol.site → solana. The
// resolved id selects both the SDK/wallet stack (via the adapter) and the
// gateway ?network= param, so the rest of the app never branches on chain.
//
// Precedence:
//   1. NEXT_PUBLIC_NETWORK  — build-time pin. Required for on-chain hosting,
//      where the page is served from a gateway domain and hostname can't tell
//      us the chain.
//   2. localStorage "blockchan_network" — client-only dev override, lets you
//      point a local build at another chain without rebuilding.
//   3. hostname map — the normal production path.
//   4. DEFAULT_NETWORK_ID.

import type { NetworkDescriptor } from "./types";
import { NETWORKS, HOSTNAME_MAP, DEFAULT_NETWORK_ID } from "./networks";

const ENV_NETWORK = process.env.NEXT_PUBLIC_NETWORK;

function fromHostname(): string | undefined {
    if (typeof window === "undefined") return undefined;
    const host = window.location.hostname.toLowerCase().replace(/^www\./, "");
    return HOSTNAME_MAP[host];
}

function fromLocalStorage(): string | undefined {
    if (typeof window === "undefined") return undefined;
    try {
        const v = localStorage.getItem("blockchan_network");
        return v && v in NETWORKS ? v : undefined;
    } catch {
        return undefined;
    }
}

/** The active network id, applying the precedence above. */
export function resolveNetworkId(): string {
    if (ENV_NETWORK && ENV_NETWORK in NETWORKS) return ENV_NETWORK;
    return fromLocalStorage() ?? fromHostname() ?? DEFAULT_NETWORK_ID;
}

/** The active network descriptor. */
export function resolveNetwork(): NetworkDescriptor {
    return NETWORKS[resolveNetworkId()] ?? NETWORKS[DEFAULT_NETWORK_ID];
}
