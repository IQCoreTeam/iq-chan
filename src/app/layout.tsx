import type { Metadata } from "next";
import Header from "../components/header";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
    title: {
        default: "iqchan",
        template: "%s | iqchan",
    },
    description: "On-chain imageboard on Solana",
    openGraph: {
        title: "iqchan",
        description: "On-chain imageboard on Solana",
        type: "website",
    },
    twitter: {
        card: "summary",
        title: "iqchan",
        description: "On-chain imageboard on Solana",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-[#ffffee] text-gray-900 min-h-screen">
                <Providers>
                    <Header />
                    <main className="max-w-3xl mx-auto py-4 px-2">
                        {children}
                    </main>
                </Providers>
            </body>
        </html>
    );
}
