// Only resolve this provider's public video pages, never fetch arbitrary URLs.
import { ALLWEBS_PAGE, ALLWEBS_MEDIA } from "../../lib/attachment";
import { readResponseBytes } from "../../lib/read-response";

export async function GET(request: Request) {
    const url = new URL(request.url).searchParams.get("url") || "";
    if (!ALLWEBS_PAGE.test(url)) return Response.json({ error: "Unsupported provider" }, { status: 400 });
    try {
        const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(8000), cache: "no-store" });
        if (!response.ok || response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "text/html" || !response.body) {
            await response.body?.cancel();
            throw new Error("Not a page");
        }
        const html = new TextDecoder().decode(await readResponseBytes(response, 512_000));
        const tags = html.match(/<meta\b[^>]*>/gi) || [];
        for (const tag of tags) {
            if (!/\bproperty\s*=\s*["']og:video["']/i.test(tag)) continue;
            const media = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
            if (media && ALLWEBS_MEDIA.test(media)) return Response.json({ url: media }, { headers: { "Cache-Control": "public, max-age=300" } });
        }
    } catch { /* Leave the original file link available if the provider fails. */ }
    return Response.json({ error: "Preview unavailable" }, { status: 502 });
}
