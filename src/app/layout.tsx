import type { Metadata } from "next";
import Header from "../components/header";
import Providers from "./providers";
import "./globals.css";
import "./chan.css";

export const metadata: Metadata = {
    metadataBase: new URL("https://blockchan.xyz"),
    title: {
        default: "BlockChan",
        template: "%s | BlockChan",
    },
    description: "On-chain imageboard on Solana — every post is a transaction, nothing can be taken down",
    other: {
        "format-detection": "telephone=no",
    },
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-icon.png",
    },
    openGraph: {
        title: "BlockChan",
        description: "On-chain imageboard on Solana — every post is a transaction, nothing can be taken down",
        type: "website",
        url: "https://blockchan.xyz",
        siteName: "BlockChan",
        images: [{ url: "/og-image.webp", width: 1200, height: 630 }],
    },
    twitter: {
        card: "summary_large_image",
        title: "BlockChan",
        description: "On-chain imageboard on Solana — every post is a transaction, nothing can be taken down",
        images: ["/og-image.webp"],
    },
};

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
