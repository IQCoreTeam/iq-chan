"use client";

export default function PostingOverlay({ statusText, step, totalSteps, isError, onDismiss }: {
    statusText: string;
    step?: number;
    totalSteps?: number;
    isError?: boolean;
    onDismiss?: () => void;
}) {
    const progress = step && totalSteps ? (step / totalSteps) * 100 : undefined;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: isError ? "auto" : "none",
                background: isError ? "rgba(0,0,0,0.25)" : "transparent",
            }}
            onClick={isError ? onDismiss : undefined}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#fff",
                    border: isError ? "2px solid #d00" : "2px solid #98b0d7",
                    fontFamily: "arial, helvetica, sans-serif",
                    fontSize: "13px",
                    width: 280,
                    boxShadow: "2px 2px 8px rgba(0,0,0,0.15)",
                }}
            >
                <div
                    style={{
                        background: isError
                            ? "linear-gradient(90deg, #a53a3a, #d07070)"
                            : "linear-gradient(90deg, #3a6ea5, #98b0d7)",
                        padding: "3px 8px",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: "11px",
                        letterSpacing: 0.5,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span>{isError ? "Error" : "Posting"}</span>
                    {isError && (
                        <button
                            onClick={onDismiss}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#fff",
                                fontWeight: "bold",
                                fontSize: "11px",
                                cursor: "pointer",
                                padding: 0,
                            }}
                        >
                            X
                        </button>
                    )}
                </div>
                {!isError && (
                    <div style={{ padding: 0 }}>
                        <img
                            src="/q_download.gif"
                            alt=""
                            style={{ display: "block", maxWidth: 150, margin: "0 auto" }}
                        />
                    </div>
                )}
                <div style={{ padding: "10px 12px" }}>
                    <p style={{
                        color: isError ? "#d00" : "#000",
                        fontSize: "11px",
                        fontWeight: "bold",
                        textAlign: "center",
                        marginBottom: progress !== undefined && !isError ? 8 : 0,
                        wordBreak: "break-word",
                    }}>
                        {statusText}
                    </p>
                    {progress !== undefined && !isError && (
                        <div style={{
                            background: "#d6daf0",
                            border: "1px solid #98b0d7",
                            height: 14,
                            borderRadius: 1,
                        }}>
                            <div style={{
                                background: "linear-gradient(90deg, #3a6ea5, #5b8fc7)",
                                height: "100%",
                                width: `${progress}%`,
                                transition: "width 0.3s ease",
                                borderRadius: 1,
                            }} />
                        </div>
                    )}
                    {isError && (
                        <div style={{ textAlign: "center", marginTop: 8 }}>
                            <button
                                onClick={onDismiss}
                                style={{
                                    background: "#f8f8f8",
                                    border: "1px solid #aaa",
                                    padding: "2px 16px",
                                    fontSize: "10pt",
                                    fontFamily: "arial, helvetica, sans-serif",
                                    cursor: "pointer",
                                }}
                            >
                                OK
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
