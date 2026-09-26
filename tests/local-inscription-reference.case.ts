import { test, expect } from "bun:test";

// Run separately: Next inlines this deployment setting at build time.
process.env.NEXT_PUBLIC_INSCRIPTION_URL = "http://127.0.0.1:4382/";
const { inscriptionMediaPath } = await import("../src/lib/attachment");
const { NETWORKS } = await import("../src/lib/chains/networks");
const signature = "2".repeat(88);

test("configured local uploader links work on either posting chain", () => {
    for (const net of [NETWORKS.solana, NETWORKS.robinhood]) {
        expect(inscriptionMediaPath(`http://127.0.0.1:4382/?menu=codein&post=${signature}`, net))
            .toBe(`/media/${signature}?network=solana`);
        expect(inscriptionMediaPath(`https://iqlabs.dev/?menu=codein&post=${signature}`, net))
            .toBe(`/media/${signature}?network=solana`);
    }
});

test("a local uploader setting does not admit other origins, ports or credentials", () => {
    for (const origin of ["http://127.0.0.1:4383", "http://localhost:4382", "http://iqlabs.dev", "https://evil.invalid", "http://user:password@127.0.0.1:4382"]) {
        expect(inscriptionMediaPath(`${origin}/?menu=codein&post=${signature}`, NETWORKS.solana)).toBeNull();
    }
});
