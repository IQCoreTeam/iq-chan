"use client";

export default function PostingOverlay({ statusText }: { statusText: string }) {
    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.25)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                style={{
                    background: "#d6daf0",
                    border: "2px outset #eef2ff",
                    fontFamily: "arial, helvetica, sans-serif",
                    fontSize: "13px",
                    minWidth: 240,
                    boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
                }}
            >
                <div
                    style={{
                        background: "linear-gradient(90deg, #3a6ea5, #98b0d7)",
                        padding: "3px 8px",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: "11px",
                        letterSpacing: 0.5,
                    }}
                >
                    Posting
                </div>
                <div style={{ padding: "16px 20px", textAlign: "center" }}>
                    <img
                        src="/q_download.gif"
                        alt=""
                        style={{ display: "block", margin: "0 auto 10px", height: 40 }}
                    />
                    <p style={{ color: "#000", fontSize: "11px", fontWeight: "bold" }}>
                        {statusText}
                    </p>
                </div>
            </div>
        </div>
    );
}
