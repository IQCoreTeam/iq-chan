/** Scroll to a post element and flash-highlight it. */
export function scrollToPost(sig: string) {
    const el = document.getElementById(`p${sig}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight");
    setTimeout(() => el.classList.remove("highlight"), 2000);
}

export function highlightPost(sig: string, on: boolean) {
    const el = document.getElementById(`p${sig}`);
    if (!el) return;
    if (on) el.classList.add("highlight");
    else el.classList.remove("highlight");
}

const PREVIEW_ID = "post-preview";

/** Show a floating preview of a post near the cursor (only if not visible). */
export function showPostPreview(sig: string, e: MouseEvent | React.MouseEvent) {
    hidePostPreview();
    const el = document.getElementById(`p${sig}`);
    if (!el) return;

    // Don't show preview if the post is already visible in the viewport
    const rect = el.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;

    const clone = el.cloneNode(true) as HTMLElement;
    clone.id = PREVIEW_ID;
    clone.classList.remove("highlight");
    clone.style.cssText = `
        position: fixed;
        z-index: 10000;
        pointer-events: none;
        max-width: 600px;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.3);
        border: 1px solid #b7c5d9;
        background: #d6daf0;
    `;

    // Position near cursor
    const x = Math.min(e.clientX + 10, window.innerWidth - 620);
    const y = Math.min(e.clientY + 10, window.innerHeight - 300);
    clone.style.left = `${x}px`;
    clone.style.top = `${y}px`;

    document.body.appendChild(clone);
}

/** Remove the floating preview. */
export function hidePostPreview() {
    document.getElementById(PREVIEW_ID)?.remove();
}
