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
