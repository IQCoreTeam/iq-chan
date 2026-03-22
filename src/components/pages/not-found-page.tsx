"use client";

import HashLink from "../hash-link";
import { FooterNav } from "../board-nav";

export default function NotFoundPage() {
    return (
        <>
            <div className="boardBanner">
                <div className="boardTitle">404 - Not Found</div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div style={{ textAlign: "center", padding: "40px 10px" }}>
                <img src="/404.webp" alt="Not Found" style={{ maxWidth: 200, margin: "0 auto 20px", display: "block" }} />
                <p style={{ fontSize: 14, color: "#707070", marginBottom: 10 }}>
                    The page you were looking for doesn&#39;t exist.
                </p>
                <p style={{ fontSize: 13 }}>
                    [<HashLink href="/">Home</HashLink>]
                </p>
            </div>

            <FooterNav />

            <div id="bottom"></div>
        </>
    );
}
