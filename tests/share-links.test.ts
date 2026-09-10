import { test, expect } from "bun:test";
import { parseSharePath, shareUrl } from "../src/lib/share";
import { readFileSync } from "node:fs";
import { SHARE_PALETTES } from "../src/lib/share-theme";

test("share URLs retain localhost and route static mirrors to the right public chain", () => {
    expect(shareUrl("http://127.0.0.1:3214/#/iq", "robinhood", ["iq", "iq-thread"])).toBe("http://127.0.0.1:3214/share/robinhood/iq/iq-thread");
    expect(shareUrl("https://mirror.example/file?foo=bar", "solana", ["biz"])).toBe("https://blockchan.sol.site/share/solana/biz");
    expect(shareUrl("https://blockchan.sol.site", "robinhood")).toBe("https://hoodchan.xyz/share/robinhood");
    expect(shareUrl("http://mirror.example:8080", "robinhood")).toBe("https://hoodchan.xyz/share/robinhood");
});

test("share targets validate both chain identities and reject injected paths", () => {
    expect(parseSharePath(["solana", "g", "BXUC2xD5FJCayhDCjRARcjKA8B6yusxurjNhYyhb6uvF", "XhPXyxxpqSUVSQE66Rcpe84KHLiKTK8H3iRYh7xbn45YLYRoWTpMDewKt1KV3Vn7Hbkq78VMDq45Cp9oQAfGj5Y"])?.net.family).toBe("svm");
    expect(parseSharePath(["robinhood", "iq", "iq-thread", `0x${"a".repeat(64)}`])?.net.family).toBe("evm");
    expect(parseSharePath(["robinhood", "iq", "iq-thread", `0x${"AB".repeat(32)}`])?.post).toBe(`0x${"ab".repeat(32)}`);
    for (const path of [["__proto__"], ["constructor"], ["solana", "../private"], ["solana", "g", "not-a-pda"], ["robinhood", "iq", "thread", "calldata"], ["solana", "g", "a", "b", "c"]]) {
        expect(parseSharePath(path)).toBeNull();
    }
});

test("preview palettes match the existing app stylesheet", () => {
    const css = readFileSync(new URL("../src/app/theme.css", import.meta.url), "utf8");
    const blocks = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/[^{}]+\{[^{}]+\}/g)!;
    for (const [network, palette] of Object.entries(SHARE_PALETTES)) {
        const block = blocks.find((b) => b.includes(".yotsuba-b") && (network === "robinhood" ? b.includes('data-net="robinhood"') : !b.includes("data-net")))!;
        expect(block).toBeDefined();
        for (const [key, value] of Object.entries(palette)) {
            expect(block).toMatch(new RegExp(`--${key}:\\s*${value}\\s*;`));
        }
    }
});
