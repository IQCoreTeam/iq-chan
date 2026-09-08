/** Notification is best-effort after chain confirmation. Never turn a confirmed
 * write into a failed submission (and risk a duplicate retry) if indexing fails. */
export async function notifyGateway(url: string, payload: unknown): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        if (!response.ok) {
            console.warn(`Gateway notification failed (${response.status}); the post is already confirmed.`);
        }
        return response.ok;
    } catch {
        console.warn("Gateway notification unavailable; the post is already confirmed.");
        return false;
    } finally {
        clearTimeout(timeout);
    }
}
