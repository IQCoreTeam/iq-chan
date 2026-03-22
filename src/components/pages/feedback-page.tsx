"use client";

import HashLink from "../hash-link";
import { FooterNav } from "../board-nav";

export default function FeedbackPage() {
    const host = typeof window !== "undefined" ? window.location.hostname : "blockchan.org";
    const email = `support@${host}`;

    return (
        <>
            <div className="boardBanner">
                <div className="boardTitle">Feedback</div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />

            <div style={{ maxWidth: 700, margin: "10px auto", padding: "0 10px", fontSize: 13, lineHeight: 1.5, textAlign: "center" }}>
                <p>
                    If you have feedback, bug reports, or suggestions for BlockChan,
                    please send an email to:
                </p>
                <br />
                <p style={{ textAlign: "center", fontSize: 16, fontWeight: "bold" }}>
                    <a href={`mailto:${email}`} style={{ color: "#34345c" }}>{email}</a>
                </p>
                <br />
                <p style={{ textAlign: "center" }}>
                    [<HashLink href="/">Home</HashLink>]
                </p>
            </div>

            <FooterNav />

            <div id="bottom"></div>
        </>
    );
}
