import type { getShareData, shareThumbnail } from "../lib/share-data";
import { SHARE_PALETTES } from "../lib/share-theme";
import { BOARD_METADATA, OFFICIAL_BOARDS } from "../lib/board-config";

export default function ShareCard({ data, thumbnail, logo }: {
    data: NonNullable<Awaited<ReturnType<typeof getShareData>>>;
    thumbnail?: Awaited<ReturnType<typeof shareThumbnail>>;
    logo?: Awaited<ReturnType<typeof shareThumbnail>>;
}) {
    const palette = SHARE_PALETTES[data.net.id] || SHARE_PALETTES.solana;
    const home = data.kind === "Home";
    const board = data.kind === "Board";
    return <div style={{ display: "flex", flexDirection: "column", width: 1200, height: 630, background: palette["page-bg"], color: "#000", fontFamily: "sans-serif", padding: "18px 30px", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 104, flexShrink: 0 }}>
            {logo ? <img src={logo.src} width={logo.width} height={logo.height} /> : <div style={{ display: "flex", fontSize: 36 }}>{data.net.theme.siteName}</div>}
        </div>
        {home ? <div style={{ display: "flex", flexDirection: "column", width: "100%", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${palette.edge}`, marginTop: 10 }}>
                <div style={{ display: "flex", background: palette["accent-dark"], color: "white", padding: "8px 12px", fontSize: 26, fontWeight: 700 }}>What is {data.net.theme.siteName}?</div>
                <div style={{ display: "flex", padding: "16px 12px", fontSize: 25, lineHeight: 1.3 }}>{data.net.theme.siteName} is an on-chain bulletin board on {data.net.theme.chainLabel}. Every post is a transaction. Every thread is an on-chain table.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${palette.edge}`, marginTop: 16 }}>
                <div style={{ display: "flex", background: palette.accent, padding: "8px 12px", fontSize: 26, fontWeight: 700 }}>Boards</div>
                <div style={{ display: "flex", flexDirection: "column", padding: "12px", fontSize: 24, lineHeight: 1.25 }}>
                    <div style={{ display: "flex", fontWeight: 700, marginBottom: 5 }}>General</div>
                    {OFFICIAL_BOARDS.map((id) => <div key={id} style={{ display: "flex", color: palette.link }}>{BOARD_METADATA[id].title}</div>)}
                </div>
            </div>
        </div> : <div style={{ display: "flex", flexDirection: "column", width: "100%", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "center", color: "#af0a0f", fontSize: 36, fontWeight: 700, margin: "8px 0 20px" }}>/{data.board}/ — {data.boardTitle}</div>
            <div style={{ display: "flex", borderTop: `1px solid ${palette.edge}`, paddingTop: 20, flex: 1, overflow: "hidden" }}>
                {data.kind === "Reply" && <div style={{ display: "flex", fontSize: 22, paddingRight: 8, color: "#b7c5d9" }}>&gt;&gt;</div>}
                <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 20 }}>
                    {data.posts.map((post, index) => {
                        const limit = board ? 115 : thumbnail ? 290 : 440;
                        const text = typeof post.com === "string" ? post.com : "";
                        const excerpt = text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
                        const date = typeof post.time === "number" && post.time > 0 && post.time < 8.64e12 ? new Date(post.time * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "";
                        return <div key={post.__txSignature || index} style={{ display: "flex", flexDirection: "column", background: data.kind === "Reply" ? palette.panel : "transparent", border: data.kind === "Reply" ? `1px solid ${palette.edge}` : "none", padding: data.kind === "Reply" ? "8px 10px 16px" : "0", overflow: "hidden" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 9, fontSize: 21, marginBottom: 12 }}>
                                {typeof post.sub === "string" && post.sub && <span style={{ color: palette.subject, fontWeight: 700 }}>{post.sub.slice(0, 65)}</span>}
                                <span style={{ color: palette.name, fontWeight: 700 }}>{(typeof post.name === "string" && post.name ? post.name : "Anonymous").slice(0, 30)}</span>
                                <span>{date}</span>
                                {typeof post.__txSignature === "string" && post.__txSignature && <span>No.{post.__txSignature.slice(0, 8)}</span>}
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 24, padding: "0 6px", overflow: "hidden" }}>
                                {!board && index === 0 && thumbnail && <img src={thumbnail.src} width={thumbnail.width} height={thumbnail.height} style={{ flexShrink: 0 }} />}
                                <div style={{ display: "flex", flex: 1, flexDirection: "column", fontSize: board ? 25 : 27, lineHeight: 1.3, whiteSpace: "pre-wrap", wordBreak: "break-word", overflow: "hidden" }}>
                                    {excerpt.split("\n").slice(0, 8).map((line, i) => <div key={i} style={{ display: "flex", minHeight: 18, color: line.startsWith(">") ? "#789922" : "#000" }}>{line || " "}</div>)}
                                </div>
                            </div>
                        </div>;
                    })}
                    {!data.posts.length && <div style={{ display: "flex", fontSize: 25 }}>{data.text.slice(0, 300)}</div>}
                </div>
            </div>
        </div>}
    </div>;
}
