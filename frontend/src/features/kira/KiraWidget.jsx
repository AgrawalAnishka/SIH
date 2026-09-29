import { useEffect, useRef, useState } from "react";
import { useKira } from "./useKira";

// Inline styles only — no new npm packages, no shadcn tokens needed.
// Colors match the existing app's dark sidebar palette.

const S = {
  fab: {
    position: "fixed", bottom: 24, right: 24, zIndex: 9000,
    borderRadius: 50, background: "#4F46E5",
    padding: "12px 22px", color: "#fff",
    fontWeight: 700, fontSize: 14, cursor: "pointer",
    border: "none", boxShadow: "0 4px 20px rgba(79,70,229,0.45)",
    letterSpacing: "0.03em",
  },
  panel: {
    position: "fixed", zIndex: 9000,
    background: "#0D1117", color: "#F1F5F9",
    display: "flex", flexDirection: "column",
    fontFamily: "Inter, sans-serif", fontSize: 14,
    // mobile: full screen; desktop overridden via mediaPanel
    inset: 0,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 8 },
  headerTitle: { fontWeight: 700, fontSize: 15, color: "#F1F5F9" },
  headerActions: { display: "flex", alignItems: "center", gap: 4 },
  iconBtn: {
    background: "transparent", border: "none", cursor: "pointer",
    color: "#9CA3AF", padding: "4px 8px", borderRadius: 6, fontSize: 13,
  },
  body: { display: "flex", flex: 1, minHeight: 0, position: "relative" },
  sidebar: {
    width: 200, flexShrink: 0, display: "flex", flexDirection: "column",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    background: "#0A0E1A",
  },
  sidebarLabel: {
    padding: "10px 12px 6px", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: "rgba(255,255,255,0.25)",
  },
  convList: { flex: 1, overflowY: "auto" },
  convItem: (active) => ({
    display: "flex", alignItems: "center", gap: 4,
    padding: "8px 10px",
    background: active ? "rgba(79,70,229,0.15)" : "transparent",
    borderLeft: active ? "3px solid #4F46E5" : "3px solid transparent",
    cursor: "pointer",
  }),
  convTitle: {
    flex: 1, overflow: "hidden", textOverflow: "ellipsis",
    whiteSpace: "nowrap", fontSize: 13, color: "#D1D5DB",
    background: "transparent", border: "none", cursor: "pointer",
    textAlign: "left", padding: 0,
  },
  smallBtn: {
    background: "transparent", border: "none", cursor: "pointer",
    color: "#6B7280", fontSize: 11, padding: "2px 4px", flexShrink: 0,
  },
  memBtn: {
    padding: "10px 12px", fontSize: 12, color: "#818CF8",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    background: "transparent", border: "none",
    borderTopStyle: "solid", borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    cursor: "pointer", textAlign: "left", width: "100%",
  },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  msgArea: {
    flex: 1, overflowY: "auto", padding: "16px 14px",
    display: "flex", flexDirection: "column", gap: 10,
  },
  bubble: (role) => ({
    maxWidth: "85%", padding: "9px 13px", borderRadius: 16,
    fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word",
    alignSelf: role === "user" ? "flex-end" : "flex-start",
    background: role === "user" ? "#4F46E5" : "rgba(255,255,255,0.07)",
    color: role === "user" ? "#fff" : "#E2E8F0",
  }),
  thinking: {
    alignSelf: "flex-start", padding: "9px 13px", borderRadius: 16,
    background: "rgba(255,255,255,0.07)", color: "#9CA3AF",
    fontSize: 13, fontStyle: "italic",
  },
  errorMsg: { color: "#F87171", fontSize: 12, padding: "4px 0" },
  inputRow: {
    display: "flex", alignItems: "flex-end", gap: 8,
    padding: "10px 12px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  textarea: {
    flex: 1, resize: "none", borderRadius: 10,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#F1F5F9", fontSize: 13, padding: "8px 12px",
    outline: "none", fontFamily: "inherit", minHeight: 38, maxHeight: 120,
    lineHeight: 1.5,
  },
  sendBtn: (disabled) => ({
    height: 38, width: 42, borderRadius: 10,
    background: disabled ? "rgba(79,70,229,0.3)" : "#4F46E5",
    border: "none", color: "#fff", cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 18, flexShrink: 0, display: "flex", alignItems: "center",
    justifyContent: "center",
  }),
  memHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  memList: { flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 },
  memItem: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
    padding: "10px 12px", borderRadius: 10,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
  },
  memKey: { fontSize: 11, color: "#818CF8", marginBottom: 2 },
  memVal: { fontSize: 13, color: "#E2E8F0", wordBreak: "break-word" },
  memFooter: { padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 },
  clearBtn: {
    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
    color: "#F87171", borderRadius: 8, padding: "7px 14px",
    fontSize: 12, cursor: "pointer",
  },
  muted: { fontSize: 13, color: "#6B7280", padding: "6px 0" },
};

export default function KiraWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("chat"); // "chat" | "memory"
  const [showSidebar, setShowSidebar] = useState(false); // mobile sidebar drawer
  const [text, setText] = useState("");
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 640);
  const k = useKira(open);
  const endRef = useRef(null);

  // Responsive: track viewport width
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [k.messages, k.sending, view]);

  async function submit() {
    const ok = await k.send(text);
    if (ok) setText("");
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function openMemory() {
    setView("memory");
    setShowSidebar(false);
    k.loadMemories();
  }

  // --- FAB ---
  if (!open) {
    return (
      <button
        style={S.fab}
        onClick={() => setOpen(true)}
        aria-label="Open AI Chatbot"
      >
        💬 AI Chatbot
      </button>
    );
  }

  // Desktop panel dimensions override
  const panelStyle = isDesktop
    ? {
        ...S.panel,
        inset: "auto",
        bottom: 24, right: 24,
        width: 780, height: 600,
        borderRadius: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }
    : S.panel;

  const sidebarStyle = isDesktop
    ? S.sidebar
    : {
        ...S.sidebar,
        position: "absolute", inset: "0 auto 0 0",
        zIndex: 10, width: 220,
        display: showSidebar ? "flex" : "none",
        boxShadow: "4px 0 24px rgba(0,0,0,0.5)",
      };

  return (
    <div style={panelStyle} role="dialog" aria-label="AI Chatbot">
      {/* ── Header ── */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          {!isDesktop && (
            <button
              style={S.iconBtn}
              aria-label="Toggle conversations"
              onClick={() => setShowSidebar((s) => !s)}
            >
              ☰
            </button>
          )}
          <span style={S.headerTitle}>💬 AI Chatbot</span>
        </div>
        <div style={S.headerActions}>
          <button
            style={{ ...S.iconBtn, fontSize: 12 }}
            disabled={k.sending}
            onClick={() => { k.newChat(); setView("chat"); setShowSidebar(false); }}
          >
            + New
          </button>
          <button
            style={{ ...S.iconBtn, fontSize: 18 }}
            onClick={() => setOpen(false)}
            aria-label="Close KIRA"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={S.body}>
        {/* Sidebar */}
        <aside style={sidebarStyle}>
          <div style={S.sidebarLabel}>Conversations</div>
          <div style={S.convList}>
            {k.conversations.length === 0 && (
              <p style={{ ...S.muted, padding: "8px 12px" }}>No conversations yet.</p>
            )}
            {k.conversations.map((c) => (
              <div key={c.id} style={S.convItem(c.id === k.activeId && view === "chat")}>
                <button
                  style={S.convTitle}
                  disabled={k.sending}
                  title={c.title}
                  onClick={() => {
                    setView("chat");
                    setShowSidebar(false);
                    k.openConversation(c.id);
                  }}
                >
                  {c.title}
                </button>
                <button
                  style={S.smallBtn}
                  aria-label="Rename"
                  onClick={() => {
                    const t = window.prompt("Rename conversation", c.title);
                    if (t && t.trim()) k.rename(c.id, t.trim().slice(0, 80));
                  }}
                >
                  ✎
                </button>
                <button
                  style={S.smallBtn}
                  aria-label="Delete conversation"
                  onClick={() => {
                    if (window.confirm("Delete this conversation?")) k.remove(c.id);
                  }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
          <button style={S.memBtn} onClick={openMemory}>
            What the chatbot remembers
          </button>
        </aside>

        {/* Main */}
        <section style={S.main}>
          {view === "memory" ? (
            <>
              <div style={S.memHeader}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Saved memory</span>
                <button style={S.iconBtn} onClick={() => setView("chat")}>
                  ← Back to chat
                </button>
              </div>
              <div style={S.memList}>
                {k.memories.length === 0 && (
                  <p style={S.muted}>Nothing saved yet.</p>
                )}
                {k.memories.map((m) => (
                  <div key={m.key} style={S.memItem}>
                    <div style={{ minWidth: 0 }}>
                      <div style={S.memKey}>{m.key.replace(/_/g, " ")}</div>
                      <div style={S.memVal}>{m.value}</div>
                    </div>
                    <button
                      style={{ ...S.smallBtn, fontSize: 12 }}
                      onClick={() => k.removeMemory(m.key)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              {k.memories.length > 0 && (
                <div style={S.memFooter}>
                  <button
                    style={S.clearBtn}
                    onClick={() => {
                      if (window.confirm("Delete everything KIRA has saved about you?"))
                        k.clearMemories();
                    }}
                  >
                    Clear all memory
                  </button>
                </div>
              )}
              {k.error && <p role="alert" style={{ ...S.errorMsg, padding: "0 14px 10px" }}>{k.error}</p>}
            </>
          ) : (
            <>
              <div style={S.msgArea} role="log" aria-live="polite">
                {k.loading && <p style={S.muted}>Loading…</p>}
                {!k.loading && k.messages.length === 0 && (
                  <p style={S.muted}>Hello! How can I help you with GovLaunch today?</p>
                )}                {k.messages.map((m, i) => (
                  <div key={i} style={S.bubble(m.role)}>
                    {m.content}
                  </div>
                ))}
                {k.sending && (
                  <div style={S.thinking}>Assistant is thinking…</div>
                )}
                {k.error && <p role="alert" style={S.errorMsg}>{k.error}</p>}
                <div ref={endRef} />
              </div>
              <div style={S.inputRow}>
                <textarea
                  style={S.textarea}
                  rows={1}
                  maxLength={2000}
                  placeholder="Type a message…"
                  value={text}
                  disabled={k.sending}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  aria-label="Message input"
                />
                <button
                  style={S.sendBtn(k.sending || !text.trim())}
                  disabled={k.sending || !text.trim()}
                  onClick={submit}
                  aria-label="Send message"
                >
                  ↑
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
