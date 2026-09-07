"use client";

// Top-right chain switcher. Each chain runs on its own domain (Solana =>
// blockchan.sol.site, Robinhood => hoodchan.xyz), so switching is just a link
// out to the sibling site's root. Only renders when a sibling site exists.

import { NETWORKS, HOSTNAME_MAP } from "../lib/chains/networks";
import { resolveNetworkId } from "../lib/chains/resolve";

// id -> hostname (first host that maps to each network id)
const SITE_HOSTS: Record<string, string> = Object.entries(HOSTNAME_MAP).reduce(
    (acc, [host, id]) => { if (!acc[id]) acc[id] = host; return acc; },
    {} as Record<string, string>,
);

export default function NetworkSwitcher() {
    const current = resolveNetworkId();
    const entries = Object.entries(SITE_HOSTS); // [id, host]
    if (entries.length < 2) return null;

    function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const host = e.target.value;
        if (host && typeof window !== "undefined" && host !== window.location.host) {
            window.location.href = `https://${host}/`;
        }
    }

    const currentHost = SITE_HOSTS[current];

    return (
        <select
            aria-label="Chain"
            value={currentHost ?? ""}
            onChange={onChange}
            style={{ fontSize: 11, marginRight: 6, border: "1px solid #aaa", background: "#fff", color: "#000", cursor: "pointer" }}
        >
            {!currentHost && <option value="">Chain</option>}
            {entries.map(([id, host]) => (
                <option key={id} value={host}>{NETWORKS[id]?.theme.chainLabel ?? id}</option>
            ))}
        </select>
    );
}
