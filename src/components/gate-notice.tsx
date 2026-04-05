export default function GateNotice({ gate }: { gate: { gateMint?: string; gateAmount?: number; gateType?: number } }) {
    return (
        <div style={{ textAlign: "center", padding: "4px 8px", fontSize: "11px", color: "#789922", background: "#f0e0d6", border: "1px solid #d9bfb7", margin: "4px 0" }}>
            <div>Token-gated: hold {gate.gateAmount || 1} {gate.gateType === 1 ? "NFT from collection" : "token"} to post</div>
            <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#707070", marginTop: "2px", wordBreak: "break-all" }}>
                CA: {gate.gateMint}
            </div>
        </div>
    );
}
