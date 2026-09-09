import { ImageResponse } from "next/og";
import { createElement } from "react";
import { getShareData, shareThumbnail, SharePostNotFound } from "../../../lib/share-data";
import { parseSharePath, shareUrl } from "../../../lib/share";
import { HOSTNAME_MAP } from "../../../lib/chains/networks";
import ShareCard from "../../../components/share-card";
import { SHARE_PALETTES } from "../../../lib/share-theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function GET(request: Request, { params }: { params: Promise<{ segments: string[] }> }) {
    const { segments } = await params;
    if (!parseSharePath(segments)) return new Response("Invalid share link", { status: 404 });
    let data;
    try { data = await getShareData(segments); }
    catch (error) {
        if (error instanceof SharePostNotFound) return new Response("Post unavailable in the current gateway read. Open the board to find it.", { status: 404, headers: { "Cache-Control": "no-store" } });
        return new Response("Preview temporarily unavailable. Please try again.", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
    }
    if (!data) return new Response("Post unavailable in the current gateway read. Open the board to find it.", { status: 404, headers: { "Cache-Control": "no-store" } });
    const url = new URL(request.url);
    const canonical = shareUrl(url.origin, data.net.id, segments.slice(1));
    if (url.searchParams.get("image") === "1") {
        const [thumbnail, logo] = await Promise.all([shareThumbnail(data.posts[0]?.img || ""), shareThumbnail(data.net.theme.logo || "/blockchan.webp")]);
        return new ImageResponse(createElement(ShareCard, { data, thumbnail, logo }), {
            width: 1200, height: 630,
            headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
        });
    }
    const domain = Object.keys(HOSTNAME_MAP).find((host) => HOSTNAME_MAP[host] === data.net.id);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const sameNetwork = process.env.NEXT_PUBLIC_NETWORK === data.net.id || (!process.env.NEXT_PUBLIC_NETWORK && data.net.id === "solana");
    const appOrigin = local && sameNetwork ? url.origin : domain ? `https://${domain}` : url.origin;
    const destination = `${appOrigin}/#/${data.board || ""}${data.thread ? `/${data.thread}` : ""}${data.post ? `:p${data.post}` : ""}`;
    const title = data.kind === "Home" ? data.title : `${data.title} | ${data.net.theme.siteName}`;
    const description = data.text.replace(/\s+/g, " ").slice(0, 200);
    const image = `${canonical}?image=1`;
    const palette = SHARE_PALETTES[data.net.id] || SHARE_PALETTES.solana;
    const html = `<!doctype html><html lang="en" data-net="${data.net.id}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="${data.thread ? "article" : "website"}"><meta property="og:site_name" content="${escapeHtml(data.net.theme.siteName)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png"><meta property="og:image:alt" content="${escapeHtml(description)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}"><link rel="icon" href="${escapeHtml(data.net.theme.favicon || "/favicon.ico")}">
<style>body{background:${palette["page-bg"]};color:#161616;font:16px Arial,sans-serif;margin:24px auto;padding:0 16px;max-width:900px}a{color:${palette.link}}h1{font-size:24px;overflow-wrap:anywhere}img{display:block;width:100%;height:auto;border:1px solid ${palette.edge};box-sizing:border-box}p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}nav{margin:20px 0}a:focus-visible{outline:2px solid currentColor;outline-offset:4px}</style></head><body class="yotsuba-b">
<h1>${escapeHtml(title)}</h1><nav>[ <a href="${escapeHtml(destination)}">${data.thread ? "Open thread" : data.board ? "Open board" : "Browse boards"}</a> ]</nav>
<img src="${escapeHtml(image)}" width="1200" height="630" alt="${escapeHtml(description)}"><p>${escapeHtml(data.text.slice(0, 4000))}</p>
</body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60, s-maxage=60", "X-Content-Type-Options": "nosniff" } });
}
