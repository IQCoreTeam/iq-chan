"use client";

import Link from "next/link";
import { BOARDS } from "../lib/constants";

export default function HomePage() {
    return (
        <div className="max-w-[900px] mx-auto">
            {/* Logo */}
            <div className="text-center py-8">
                <Link href="/" className="text-4xl font-bold text-blue-800">
                    iqchan
                </Link>
            </div>

            {/* What is iqchan */}
            <div className="border border-gray-300 mb-4">
                <div className="bg-[#d6daf0] border-b border-gray-300 px-3 py-1">
                    <h2 className="font-bold text-sm">What is iqchan?</h2>
                </div>
                <div className="bg-[#eef2ff] px-4 py-3 text-sm">
                    <p>
                        iqchan is a fully on-chain imageboard on Solana. Every post is a transaction,
                        every thread is its own on-chain table. No accounts needed — just connect
                        your wallet and post.
                    </p>
                    <br />
                    <p>
                        Built on{" "}
                        <a href="https://iqlabs.dev" className="text-blue-700 hover:underline" target="_blank" rel="noopener noreferrer">
                            IQ Labs
                        </a>
                        {" "}DB contract. All data lives on Solana — no servers, no censorship, no takedowns.
                    </p>
                </div>
            </div>

            {/* Boards */}
            <div className="border border-gray-300 mb-4">
                <div className="bg-[#d6daf0] border-b border-gray-300 px-3 py-1">
                    <h2 className="font-bold text-sm">Boards</h2>
                </div>
                <div className="bg-[#eef2ff] px-4 py-3">
                    <ul className="space-y-1">
                        {BOARDS.map((b) => (
                            <li key={b.id}>
                                <Link
                                    href={`/${b.id}`}
                                    className="text-blue-700 hover:underline text-sm"
                                >
                                    {b.title}
                                </Link>
                                <span className="text-xs text-gray-500 ml-1">
                                    /{b.id}/
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 py-4 border-t border-gray-300">
                <a href="https://iqlabs.dev" className="hover:underline" target="_blank" rel="noopener noreferrer">About</a>
                {" • "}
                <span>Powered by IQ Labs on Solana</span>
            </div>
        </div>
    );
}
