"use client";

import { useState, useEffect } from "react";
import { useHashRoute, hashHref } from "../hooks/use-hash-router";
import HashLink from "./hash-link";
import WalletButton from "./wallet-button";
import { BoardList } from "./board-nav";
import { BOARDS } from "../lib/constants";
import { getGatewayUrl, getFallbacks, GATEWAY_FALLBACKS } from "../lib/config";

export default function Header() {
    const { boardId } = useHashRoute();
    const [showSettings, setShowSettings] = useState(false);
    const [gwInput, setGwInput] = useState("");
    const [fallbacks, setFallbacks] = useState<string[]>(GATEWAY_FALLBACKS);
    const [fbInput, setFbInput] = useState("");

    useEffect(() => { setFallbacks(getFallbacks()); }, []);

    // Mobile header auto-hide on scroll down, show on scroll up (like 4chan)
    useEffect(() => {
        if (!boardId) return;
        let lastY = 0;
        const nav = document.getElementById("boardNavMobile");
        if (!nav) return;
        document.body.classList.add("hasDropDownNav");
        function onScroll() {
            const y = window.scrollY;
            if (y > lastY && y > 50) {
                nav!.style.top = "-" + nav!.offsetHeight + "px";
            } else {
                nav!.style.top = "0";
            }
            lastY = y;
        }
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            document.body.classList.remove("hasDropDownNav");
        };
    }, [boardId]);

    if (!boardId) return null;

    const isCustom = typeof window !== "undefined" && !!localStorage.getItem("blockchan_gateway");

    function handleSaveGw() {
        const val = gwInput.trim();
        if (val) {
            localStorage.setItem("blockchan_gateway", val);
        } else {
            localStorage.removeItem("blockchan_gateway");
        }
        setShowSettings(false);
        window.location.reload();
    }

    function addFallback() {
        const val = fbInput.trim();
        if (!val || fallbacks.includes(val)) return;
        const updated = [...fallbacks, val];
        setFallbacks(updated);
        localStorage.setItem("blockchan_fallbacks", JSON.stringify(updated));
        setFbInput("");
    }

    function removeFallback(url: string) {
        const updated = fallbacks.filter((f) => f !== url);
        setFallbacks(updated);
        localStorage.setItem("blockchan_fallbacks", JSON.stringify(updated));
    }

    function resetFallbacks() {
        localStorage.removeItem("blockchan_fallbacks");
        setFallbacks(GATEWAY_FALLBACKS);
    }

    function handleBoardSelect(e: React.ChangeEvent<HTMLSelectElement>) {
        const val = e.target.value;
        if (val) window.location.hash = hashHref(`/${val}`);
    }

    return (
        <>
            {/* Desktop nav */}
            <div id="boardNavDesktop">
                <BoardList />
                <span id="navtopright">
                    <WalletButton />
                    {" "}
                    [<a href="#" onClick={(e) => {
                        e.preventDefault();
                        setGwInput(getGatewayUrl());
                        setShowSettings((v) => !v);
                    }} style={{ color: "#34345c", textDecoration: "none" }}>{showSettings ? "Close Settings" : "Settings"}</a>]
                    {" "}
                    [<HashLink href="/">Home</HashLink>]
                </span>
            </div>

            {/* Mobile nav — single compact row */}
            <div id="boardNavMobile">
                <span className="boardSelect">
                    <strong>Board</strong>
                    <select
                        id="boardSelectMobile"
                        value={boardId}
                        onChange={handleBoardSelect}
                    >
                        {BOARDS.map((b) => (
                            <option key={b.id} value={b.id}>/{b.id}/ - {b.title}</option>
                        ))}
                    </select>
                </span>
                <span className="pageJump">
                    <a href="#" onClick={(e) => { e.preventDefault(); document.getElementById("bottom")?.scrollIntoView({ behavior: "smooth" }); }}>&#9660;</a>
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        setGwInput(getGatewayUrl());
                        setShowSettings((v) => !v);
                    }}>Settings</a>
                    <WalletButton />
                    <HashLink href="/">Home</HashLink>
                </span>
            </div>
            {showSettings && (
                <div style={{
                    background: "#d6daf0",
                    border: "1px solid #b7c5d9",
                    borderTop: "none",
                    padding: "5px 8px",
                    fontSize: 12,
                }}>
                    <div style={{ marginBottom: 4 }}>
                        <label>Gateway: </label>
                        <input
                            type="text"
                            value={gwInput}
                            onChange={(e) => setGwInput(e.target.value)}
                            placeholder={getGatewayUrl()}
                            style={{ width: "min(300px, 60vw)", fontSize: 12, padding: "1px 3px", border: "1px solid #aaa", outline: "none" }}
                        />
                        {" "}
                        <button onClick={handleSaveGw} style={{ fontSize: 12, padding: "1px 6px", border: "1px solid #aaa", background: "#f8f8f8", cursor: "pointer" }}>Save</button>
                        {" "}
                        <button onClick={() => { resetFallbacks(); setGwInput(""); localStorage.removeItem("blockchan_gateway"); window.location.reload(); }} style={{ fontSize: 12, padding: "1px 6px", border: "1px solid #aaa", background: "#f8f8f8", cursor: "pointer" }}>Reset Defaults</button>
                        <span style={{ color: "#707070", fontSize: 11, marginLeft: 6 }}>{isCustom ? "(custom)" : "(default)"}</span>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                        <label>Fallbacks: </label>
                        {fallbacks.filter((f) => f !== getGatewayUrl()).map((f) => (
                            <span key={f} style={{ marginRight: 6 }}>
                                <span style={{ color: "#707070", fontSize: 11 }}>{f}</span>
                                {" "}
                                <a href="#" onClick={(e) => { e.preventDefault(); removeFallback(f); }} style={{ color: "#d00", fontSize: 10, textDecoration: "none" }}>x</a>
                            </span>
                        ))}
                        {fallbacks.filter((f) => f !== getGatewayUrl()).length === 0 && <span style={{ color: "#707070", fontSize: 11 }}>none</span>}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                        <input
                            type="text"
                            value={fbInput}
                            onChange={(e) => setFbInput(e.target.value)}
                            placeholder="https://my-gateway.com"
                            style={{ width: "min(200px, 50vw)", fontSize: 12, padding: "1px 3px", border: "1px solid #aaa", outline: "none" }}
                        />
                        {" "}
                        <button onClick={addFallback} style={{ fontSize: 12, padding: "1px 6px", border: "1px solid #aaa", background: "#f8f8f8", cursor: "pointer" }}>Add Fallback</button>
                    </div>
                    <div style={{ color: "#707070", fontSize: 11 }}>
                        Run your own: <a href="https://github.com/IQCoreTeam/iq-gateway" target="_blank" rel="noopener noreferrer" style={{ color: "#34345c" }}>github.com/IQCoreTeam/iq-gateway</a>
                    </div>
                </div>
            )}
        </>
    );
}
