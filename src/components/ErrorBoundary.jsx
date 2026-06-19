// ============================================================
// ERROR BOUNDARY — Fix 8
// Catches any crash in any page and shows a friendly message
// instead of the whole app going blank
// ============================================================
import { Component } from "react";

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("Page error:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={S.wrap}>
                    <div style={S.box}>
                        <span style={{ fontSize: 48 }}>⚠️</span>
                        <h2 style={S.title}>Something went wrong</h2>
                        <p style={S.msg}>{this.state.error?.message || "An unexpected error occurred."}</p>
                        <button style={S.btn} onClick={() => this.setState({ hasError: false, error: null })}>
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const S = {
    wrap: {
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", padding: 40
    },
    box: {
        textAlign: "center", background: "#fff", borderRadius: 12,
        padding: 40, border: "1px solid #fee2e2", maxWidth: 400
    },
    title: { margin: "12px 0 8px", fontSize: 18, color: "#1a1a2e" },
    msg: {
        fontSize: 13, color: "#6b7280", marginBottom: 20,
        background: "#f9fafb", padding: 12, borderRadius: 6,
        fontFamily: "monospace", textAlign: "left"
    },
    btn: {
        padding: "9px 24px", background: "#0f3460", color: "#fff",
        border: "none", borderRadius: 8, cursor: "pointer",
        fontSize: 14, fontWeight: 600
    },
};