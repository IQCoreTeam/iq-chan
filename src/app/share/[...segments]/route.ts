import { ImageResponse } from "next/og";
import { createElement } from "react";
import { getShareData, shareThumbnail, SharePostNotFound } from "../../../lib/share-data";
import { parseSharePath, shareUrl } from "../../../lib/share";
import { HOSTNAME_MAP } from "../../../lib/chains/networks";
import ShareCard from "../../../components/share-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function GET(request: Request, { params }: { params: Promise<{ segments: string[] }> }) {
    const { segments } = await params;
    const target = parseSharePath(segments);
    if (!target) return new Response("Invalid share link", { status: 404 });
    const url = new URL(request.url);
    // Next may construct request.url with the container's internal hostname.
    // Use the incoming authority, as the app's root metadata already does.
    const host = request.headers.get("host");
    if (host) { url.port = ""; url.host = host; }
    const canonical = shareUrl(url.origin, target.net.id, segments.slice(1));
    const domain = Object.keys(HOSTNAME_MAP).find((host) => HOSTNAME_MAP[host] === target.net.id);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const sameNetwork = process.env.NEXT_PUBLIC_NETWORK === target.net.id || (!process.env.NEXT_PUBLIC_NETWORK && target.net.id === "solana");
    const appOrigin = local && sameNetwork ? url.origin : domain ? `https://${domain}` : url.origin;
    const destination = `${appOrigin}/#/${target.board || ""}${target.thread ? `/${target.thread}` : ""}${target.post ? `:p${target.post}` : ""}`;
    // Serve metadata with HTTP 200 for unfurlers. A browser goes directly to
    // the existing hash router, which already scrolls to and highlights posts.
    // An HTTP or meta-refresh redirect would hide this metadata from crawlers.
    const navigation = `<script>location.replace(${JSON.stringify(destination).replace(/</g, "\\u003c")})</script><noscript><a href="${escapeHtml(destination)}">Open ${target.post ? "post" : target.thread ? "thread" : target.board ? "board" : target.net.theme.siteName}</a></noscript>`;
    let data;
    let status = 404;
    let unavailable = "Post unavailable in the current gateway read.";
    try { data = await getShareData(segments); }
    catch (error) {
        if (!(error instanceof SharePostNotFound)) {
            status = 503;
            unavailable = "Preview temporarily unavailable. Please try again.";
        }
    }
    if (!data) {
        // Missing metadata must not prevent a person from opening the app.
        const imageRequest = url.searchParams.get("image") === "1";
        return new Response(imageRequest ? unavailable : `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${unavailable}</title></head><body>${navigation}</body></html>`, {
            status,
            headers: { "Content-Type": imageRequest ? "text/plain; charset=utf-8" : "text/html; charset=utf-8", "Cache-Control": "no-store", ...(status === 503 ? { "Retry-After": "30" } : {}) },
        });
    }
    if (url.searchParams.get("image") === "1") {
        const [thumbnail, logo] = await Promise.all([shareThumbnail(data.posts[0]?.img || ""), shareThumbnail(data.net.theme.logo || "/blockchan.webp")]);
        return new ImageResponse(createElement(ShareCard, { data, thumbnail, logo }), {
            width: 1200, height: 630,
            headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
        });
    }
    const title = data.kind === "Home" ? data.title : `${data.title} | ${data.net.theme.siteName}`;
    const description = data.text.replace(/\s+/g, " ").slice(0, 200);
    const image = `${canonical}?image=1`;
    const html = `<!doctype html><html lang="en" data-net="${data.net.id}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="${data.thread ? "article" : "website"}"><meta property="og:site_name" content="${escapeHtml(data.net.theme.siteName)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png"><meta property="og:image:alt" content="${escapeHtml(description)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}"><link rel="icon" href="${escapeHtml(data.net.theme.favicon || "/favicon.ico")}">
</head><body>${navigation}</body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60, s-maxage=60", "X-Content-Type-Options": "nosniff" } });
}
