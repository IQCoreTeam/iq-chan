// Inline palette for the image renderer; the app still loads app/theme.css.
// The share tests check these values against that stylesheet to catch drift.
export const SHARE_PALETTES: Record<string, Record<string, string>> = {
    "solana": {
        "page-bg": "#eef2ff",
        "edge": "#b7c5d9",
        "panel": "#d6daf0",
        "accent": "#98b0d7",
        "accent-dark": "#34345c",
        "link": "#34345c",
        "subject": "#0f0c5d",
        "name": "#117743"
    },
    "robinhood": {
        "page-bg": "#eafcef",
        "edge": "#a9d9ad",
        "panel": "#dcf3e1",
        "accent": "#8fd3a0",
        "accent-dark": "#0b7a2f",
        "link": "#0b7a2f",
        "subject": "#0b7a2f",
        "name": "#1d4ed8"
    }
};
