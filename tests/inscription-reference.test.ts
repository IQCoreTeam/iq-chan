import { test, expect } from "bun:test";
import { inscriptionMediaPath } from "../src/lib/attachment";
import { NETWORKS } from "../src/lib/chains/networks";
const signature = "2".repeat(88);
const hash = "0x" + "a".repeat(64);

test("Solana share links and bare signatures resolve independently of the current board", () => {
    expect(inscriptionMediaPath(signature, NETWORKS.robinhood)).toBe(`/media/${signature}?network=solana`);
    expect(inscriptionMediaPath(`https://iqlabs.dev/?menu=codein&post=${signature}`, NETWORKS.solana)).toBe(`/media/${signature}?network=solana`);
    expect(inscriptionMediaPath(`https://solscan.io/tx/${signature}`, NETWORKS.solana)).toBe(`/media/${signature}?network=solana`);
});
test("EVM references retain their network", () => {
    expect(inscriptionMediaPath(hash, NETWORKS.robinhood)).toBe(`/media/${hash}?network=robinhood`);
    expect(inscriptionMediaPath(`https://robinhoodchain.blockscout.com/tx/${hash}`, NETWORKS.solana)).toBe(`/media/${hash}?network=robinhood`);
    expect(inscriptionMediaPath(hash, NETWORKS.solana)).toBeNull();
});
test("unknown hosts, devnet links and executable URLs are not inscription references", () => {
    for (const value of [`https://evil.invalid/?post=${signature}`, `https://solscan.io/tx/${signature}?cluster=devnet`, 'javascript:alert(1)', 'https://example.com/image.png', 'not-a-tx']) {
        expect(inscriptionMediaPath(value, NETWORKS.solana)).toBeNull();
    }
});

test("only the explicitly configured local uploader is accepted for devnet previews", () => {
    const previous = process.env.NEXT_PUBLIC_INSCRIPTION_URL;
    process.env.NEXT_PUBLIC_INSCRIPTION_URL = "http://localhost:3219/";
    try {
        expect(inscriptionMediaPath(`http://localhost:3219/?menu=codein&post=${signature}`, NETWORKS.solana)).toBe(`/media/${signature}?network=solana`);
        expect(inscriptionMediaPath(`http://localhost:9999/?menu=codein&post=${signature}`, NETWORKS.solana)).toBeNull();
        expect(inscriptionMediaPath(`http://evil.invalid/?menu=codein&post=${signature}`, NETWORKS.solana)).toBeNull();
    } finally {
        if (previous === undefined) delete process.env.NEXT_PUBLIC_INSCRIPTION_URL;
        else process.env.NEXT_PUBLIC_INSCRIPTION_URL = previous;
    }
});

test("Hood In share links resolve on Solana pages without changing their chain", () => {
    expect(inscriptionMediaPath(`https://iq6900.com/?menu=hoodin&post=${hash}`, NETWORKS.solana)).toBe(`/media/${hash}?network=robinhood`);
});
