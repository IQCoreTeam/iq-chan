import type { Metadata } from "next";
import { headers } from "next/headers";
import Header from "../components/header";
import Providers from "./providers";
import { NETWORKS, HOSTNAME_MAP, DEFAULT_NETWORK_ID } from "../lib/chains/networks";
import "./theme.css";
import "./globals.css";
import "./chan.css";

// One artifact serves every chain's domain, so the link-preview (OG) metadata
// is derived per request from the Host header rather than baked at build time.
// blockchan.sol.site -> BlockChan, hoodchan.xyz -> HoodChan, etc.
export async function generateMetadata(): Promise<Metadata> {
    const host = ((await headers()).get("host") || "").toLowerCase().replace(/^www\./, "").split(":")[0];
    const envNet = process.env.NEXT_PUBLIC_NETWORK;
    const netId = HOSTNAME_MAP[host]
        ?? (envNet && envNet in NETWORKS ? envNet : DEFAULT_NETWORK_ID);
    const net = NETWORKS[netId] ?? NETWORKS[DEFAULT_NETWORK_ID];

    const name = net.theme.siteName;
    const description = `On-chain imageboard on ${net.theme.chainLabel} — every post is a transaction, nothing can be taken down`;
    const base = host ? `https://${host}` : "https://blockchan.sol.site";
    const ogImage = net.theme.ogImage ?? "/og-image.webp";

    return {
        metadataBase: new URL(base),
        title: { default: name, template: `%s | ${name}` },
        description,
        other: { "format-detection": "telephone=no" },
        icons: { icon: "/favicon.ico", apple: "/apple-icon.png" },
        openGraph: {
            title: name,
            description,
            type: "website",
            url: base,
            siteName: name,
            images: [{ url: ogImage }],
        },
        twitter: {
            card: "summary_large_image",
            title: name,
            description,
            images: [ogImage],
        },
    };
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="yotsuba-b">
                <Providers>
                    <Header />
                    <main style={{ padding: "0 5px" }}>
                        {children}
                    </main>
                </Providers>
            </body>
        </html>
    );
}
