import { unstable_cache } from "next/cache";
import { BOARD_METADATA, OFFICIAL_BOARDS } from "./board-config";
import { loadAdapter } from "./chains";
import type { Post } from "./types";
import { parseSharePath } from "./share";
import { NETWORKS } from "./chains/networks";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export class SharePostNotFound extends Error {}

// Shared between the HTML and image requests. Keep changing board contents
// fresh; failures throw and are not stored as successful previews.
export const getShareData = unstable_cache(async (segments: string[]) => {
    const target = parseSharePath(segments);
    if (!target) return null;
    const { net, board, thread, post } = target;
    const data = {
        ...target,
        title: net.theme.siteName,
        text: `An on-chain imageboard on ${net.theme.chainLabel}.`,
        posts: [] as Post[],
        boardTitle: board ? BOARD_METADATA[board]?.title || `/${board}/` : "",
        kind: post ? "Reply" : thread ? "Thread" : board ? "Board" : "Home",
    };
    if (!board) {
        data.text += `\n\n${OFFICIAL_BOARDS.map((id) => `/${id}/ — ${BOARD_METADATA[id].title}`).join("\n")}`;
        return data;
    }
    const adapter = await loadAdapter(net);
    if (!thread) {
        const [threads, gate] = await Promise.all([adapter.listThreads(board), adapter.getBoardGate(board)]);
        data.boardTitle = BOARD_METADATA[board]?.title || gate.tableName || data.boardTitle;
        data.posts = threads.slice(0, 3).map((t) => t.opData).filter((p): p is Post => !!p);
        data.title = `/${board}/ — ${data.boardTitle}`;
        data.text = threads.slice(0, 3).map((t) => t.opData?.sub || t.opData?.com || "").filter(Boolean).join("\n\n") ||
            BOARD_METADATA[board]?.description || "Open the board to read and start threads.";
        return data;
    }
    const result = await adapter.getThread(board, thread);
    // Never substitute the OP when a requested reply is missing from the read.
    const row = post ? [result.op, ...result.replies].find((r) =>
        (net.family === "evm" ? r?.__txSignature?.toLowerCase() : r?.__txSignature) === post) : result.op;
    if (!row) throw new SharePostNotFound("Post unavailable in the current gateway read");
    if (row === result.op) data.kind = "Thread";
    data.title = ("sub" in row && typeof row.sub === "string" && row.sub) ||
        `${data.kind} in /${board}/`;
    data.text = typeof row.com === "string" ? row.com : "";
    data.posts = [row];
    return data;
}, ["share-preview-v2"], { revalidate: 60 });

/** Only approved image hosts are fetched on the server. Arbitrary post
 * URLs must never turn the card renderer into a network proxy. */
export async function shareThumbnail(raw: string) {
    if (!raw) return;
    try {
        let bytes: Buffer;
        if (Object.values(NETWORKS).some((net) => net.theme.logo === raw)) {
            bytes = await readFile(join(process.cwd(), "public", raw));
        } else {
            const url = new URL(raw);
            if (url.protocol !== "https:" || url.port || url.username || url.password ||
                !["hoodchan.xyz", "blockchan.sol.site", "images.nubs.site", "i.ibb.co", "i.imgur.com"].includes(url.hostname)) return;
            const path = decodeURIComponent(url.pathname);
            if (!/\.(png|jpe?g|webp)$/i.test(path)) return;
            // These hosts also run this renderer. Only static asset namespaces
            // are eligible, never /share or the Next image proxy.
            if (["hoodchan.xyz", "blockchan.sol.site"].includes(url.hostname) &&
                !/^\/(hoodchan|randombanners|noimage|boards)\//.test(path) &&
                !["/hoodchan.webp", "/blockchan.webp", "/og-image.webp"].includes(path)) return;
            const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(3000) });
            const mime = res.headers.get("content-type")?.split(";")[0];
            if (!res.ok || !["image/png", "image/jpeg", "image/webp"].includes(mime || "")) {
                await res.body?.cancel();
                return;
            }
            const reader = res.body?.getReader();
            if (!reader) return;
            const chunks: Uint8Array[] = [];
            let size = 0;
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    size += value.length;
                    if (size > 2_000_000) return;
                    chunks.push(value);
                }
                bytes = Buffer.concat(chunks);
            } finally { await reader.cancel(); }
        }
        const { default: sharp } = await import("sharp");
        const png = await sharp(bytes, { limitInputPixels: 16_000_000 })
            .rotate().resize(270, 240, { fit: "inside", withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
        return { src: `data:image/png;base64,${png.data.toString("base64")}`, width: png.info.width, height: png.info.height };
    } catch { /* The post text remains useful when its image cannot load. */ }
}
