/** Consume a remote body with a hard byte limit, cancelling on rejection. */
export async function readResponseBytes(response: Response, maxBytes: number): Promise<Buffer> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Missing response body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > maxBytes) throw new Error("Response too large");
            chunks.push(value);
        }
        return Buffer.concat(chunks);
    } finally { await reader.cancel(); }
}
