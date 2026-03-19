/** Scroll to a post element and flash-highlight it. Reused by quotelinks and backlinks. */
export function scrollToPost(shortSig: string) {
    const el = document.getElementById(`p${shortSig}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight");
    setTimeout(() => el.classList.remove("highlight"), 2000);
}

export function highlightPost(shortSig: string, on: boolean) {
    const el = document.getElementById(`p${shortSig}`);
    if (!el) return;
    if (on) el.classList.add("highlight");
    else el.classList.remove("highlight");
}
