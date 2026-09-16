export function dexScreenerEmbed(chain: "solana" | "robinhood", address: string): string {
    return `https://dexscreener.com/${chain}/${encodeURIComponent(address)}?embed=1&theme=dark&info=0&trades=0`;
}
