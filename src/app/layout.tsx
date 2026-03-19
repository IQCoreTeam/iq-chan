import type { Metadata } from "next";
import Header from "../components/header";
import Providers from "./providers";
import "./globals.css";
import "./chan.css";

export const metadata: Metadata = {
    title: {
        default: "iqchan",
        template: "%s | iqchan",
    },
    description: "On-chain imageboard on Solana",
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-icon.png",
    },
    openGraph: {
        title: "iqchan",
        description: "On-chain imageboard on Solana",
        type: "website",
        images: ["/og-image.png"],
    },
    twitter: {
        card: "summary_large_image",
        title: "iqchan",
        description: "On-chain imageboard on Solana",
        images: ["/og-image.png"],
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
                    <main style={{ maxWidth: 900, margin: "0 auto", padding: "0 10px" }}>
                        {children}
                    </main>
                </Providers>
            </body>
        </html>
    );
}
