"use client";

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

export default class ErrorBoundary extends Component<
    { children: ReactNode },
    { error: Error | null }
> {
    state = { error: null as Error | null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("BlockChan error:", error, info.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{ textAlign: "center", padding: "40px 10px" }}>
                    <div className="boardBanner">
                        <div className="boardTitle">Something went wrong</div>
                    </div>
                    <hr style={{ border: "none", borderTop: "1px solid #b7c5d9" }} />
                    <div style={{ padding: "30px 10px" }}>
                        <img src="/error.webp" alt="Error" style={{ maxWidth: 200, margin: "0 auto 20px", display: "block" }} />
                        <p style={{ fontSize: 14, color: "#d00", marginBottom: 10 }}>
                            {this.state.error.message}
                        </p>
                        <p style={{ fontSize: 13 }}>
                            [<a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    this.setState({ error: null });
                                }}
                                style={{ color: "#34345c" }}
                            >Try Again</a>]
                            {" "}
                            [<a href="#/" style={{ color: "#34345c" }}>Home</a>]
                        </p>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
