"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./wallet-button";
import { BOARDS } from "../lib/constants";

export default function Header() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    return (
        <header className="border-b border-gray-300 bg-[#d6daf0] px-4 py-2">
            {/* ─── Top bar ──────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/" className="font-bold text-lg text-blue-800">
                        iqchan
                    </Link>
                    <div className="flex gap-1 text-sm">
                        {BOARDS.map((b) => (
                            <Link
                                key={b.id}
                                href={`/${b.id}`}
                                className="text-blue-700 hover:underline"
                            >
                                [{b.id}]
                            </Link>
                        ))}
                    </div>
                </div>
                <WalletButton />
            </div>

            {/* ─── Breadcrumb ───────────────────────────────────── */}
            {segments.length > 0 && (
                <nav className="text-xs text-gray-600 mt-1">
                    <Link href="/" className="hover:underline">Home</Link>
                    {segments[0] && (
                        <>
                            {" > "}
                            <Link href={`/${segments[0]}`} className="hover:underline">
                                /{segments[0]}/
                            </Link>
                        </>
                    )}
                    {segments[1] && (
                        <>
                            {" > "}
                            <span>Thread #{segments[1]}</span>
                        </>
                    )}
                </nav>
            )}
        </header>
    );
}
