/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";
const isStaticExport = process.env.STATIC_EXPORT === "1";

// Next injects inline bootstrap/hydration scripts, so script-src needs
// 'unsafe-inline' unless we start minting nonces in middleware. That means CSP
// does NOT block `javascript:` urls here - untrusted post fields are
// scheme-checked at render time instead (safePostUrl in lib/format.tsx).
// What this policy does buy: no framing, no <base> or <object> injection, and
// form posts locked to our own origin.
const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // Open by design: posts link images on arbitrary hosts, and the gateway is
    // user-swappable at runtime (localStorage blockchan_gateway).
    "img-src * data: blob:",
    "connect-src *",
    "font-src 'self' data:",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
].join("; ");

const nextConfig = {
    reactStrictMode: true,
    // route.server.ts needs a server; static/on-chain builds omit it.
    pageExtensions: [...(isStaticExport ? [] : ["server.ts"]), "tsx", "ts", "jsx", "js"],
    ...(isStaticExport ? { output: "export" } : {}),
    // headers() is a server feature - a static export has to set these at the
    // proxy layer (Caddy) instead.
    ...(isStaticExport ? {} : {
        async headers() {
            return [
                {
                    source: "/:path*",
                    headers: [
                        { key: "Content-Security-Policy", value: csp },
                        { key: "X-Content-Type-Options", value: "nosniff" },
                        { key: "X-Frame-Options", value: "DENY" },
                        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    ],
                },
            ];
        },
    }),
};

export default nextConfig;
