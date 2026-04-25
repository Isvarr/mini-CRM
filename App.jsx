import { useState, useRef, useEffect, useCallback } from "react";

/* ─── Design Tokens ───────────────────────────────────────────── */
const C = {
  bg:        "#07090f",
  surface:   "#0d1017",
  elevated:  "#131722",
  hover:     "#181d2a",
  border:    "#1c2438",
  accent:    "#2563eb",
  accentLt:  "#60a5fa",
  green:     "#10b981",
  greenDim:  "#064e3b",
  red:       "#ef4444",
  redDim:    "#450a0a",
  amber:     "#f59e0b",
  amberDim:  "#451a03",
  purple:    "#8b5cf6",
  text:      "#e2e8f0",
  textMuted: "#64748b",
  textDim:   "#2d3a52",
};

/* ─── Stage Config ────────────────────────────────────────────── */
const STAGES = {
  new:       { label: "New",       color: "#64748b", glow: "#94a3b8", bg: "#64748b18" },
  contacted: { label: "Contacted", color: "#2563eb", glow: "#60a5fa", bg: "#2563eb18" },
  proposal:  { label: "Proposal",  color: "#f59e0b", glow: "#fbbf24", bg: "#f59e0b18" },
  won:       { label: "Won",       color: "#10b981", glow: "#34d399", bg: "#10b98118" },
  lost:      { label: "Lost",      color: "#ef4444", glow: "#f87171", bg: "#ef444418" },
};

const STAGE_ORDER = ["new", "contacted", "proposal", "won", "lost"];

/* ─── Seed Data ───────────────────────────────────────────────── */
const SEED_CONTACTS = [
  { id: 1, name: "Sarah Chen",      company: "TechVentures Inc.",  email: "sarah@techventures.com",    phone: "+1 555-0101", stage: "proposal",  value: 45000, notes: "Interested in enterprise plan. Decision pending board approval Q2.", interactions: ["Call · Discussed pricing options", "Email · Sent detailed proposal", "Call · Q2 budget follow-up"], lastContact: "Apr 22, 2026" },
  { id: 2, name: "Marcus Williams", company: "Global Retail Co.",  email: "mwilliams@globalretail.com", phone: "+1 555-0102", stage: "contacted", value: 28000, notes: "Warm lead via LinkedIn. Needs demo scheduled.", interactions: ["LinkedIn · Initial outreach", "Email · Product overview sent"], lastContact: "Apr 23, 2026" },
  { id: 3, name: "Priya Patel",     company: "FinEdge Solutions",  email: "priya@finedge.io",           phone: "+1 555-0103", stage: "won",       value: 72000, notes: "Closed annual contract. Champion: CTO. Strong expansion potential.", interactions: ["Demo · Full product walkthrough", "Call · Security & compliance review", "Email · Contract executed"], lastContact: "Apr 20, 2026" },
  { id: 4, name: "James Okafor",    company: "StartupXYZ",         email: "james@startupxyz.com",       phone: "+1 555-0104", stage: "new",       value: 12000, notes: "Inbound from website contact form. Startup plan inquiry.", interactions: ["Form · Website inquiry"], lastContact: "Apr 24, 2026" },
  { id: 5, name: "Lena Müller",     company: "EuroTech GmbH",      email: "lena.muller@eurotech.de",    phone: "+49 89-5501", stage: "lost",      value: 35000, notes: "Chose competitor. Cited price sensitivity.", interactions: ["Call · Discovery call", "Email · Proposal sent", "Email · Lost to competitor — price"], lastContact: "Apr 15, 2026" },
  { id: 6, name: "Ryan Thompson",   company: "MediaHub",            email: "ryan@mediahub.com",          phone: "+1 555-0106", stage: "contacted", value: 19000, notes: "Intro call completed. Evaluating 3 vendors.", interactions: ["Email · Cold outreach", "Call · 20-min intro call"], lastContact: "Apr 24, 2026" },
];

const ACTIVITIES = [
  { id: 1, icon: "📞", contact: "Sarah Chen",      action: "Follow-up call",                detail: "Discussed Q2 budget timeline",          time: "2h ago" },
  { id: 2, icon: "📧", contact: "Marcus Williams", action: "Email sent",                    detail: "Product overview + pricing deck",        time: "5h ago" },
  { id: 3, icon: "🏆", contact: "Priya Patel",     action: "Deal won — $72k",              detail: "Annual contract signed",                 time: "1d ago" },
  { id: 4, icon: "🆕", contact: "James Okafor",    action: "New lead",                     detail: "Inbound via website contact form",       time: "1d ago" },
  { id: 5, icon: "📧", contact: "Ryan Thompson",   action: "Cold outreach sent",           detail: "Personalized email — MediaHub angle",    time: "2d ago" },
  { id: 6, icon: "📋", contact: "Lena Müller",     action: "Deal marked lost",             detail: "Price objection — competitor chosen",    time: "3d ago" },
];

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (n) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
const initials = (name) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
const avatarColor = (name) => {
  const colors = ["#2563eb", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

/* ─── Main App ────────────────────────────────────────────────── */
export default function CRM() {
  const [tab, setTab] = useState("dashboard");
  const [contacts, setContacts] = useState(SEED_CONTACTS);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  /* Modal state */
  const [modal, setModal] = useState(null); // null | "add" | "edit" | "detail"
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({ name: "", company: "", email: "", phone: "", stage: "new", value: "", notes: "" });

  /* AI state */
  const [aiPanel, setAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiContact, setAiContact] = useState(null);
  const [chatMsgs, setChatMsgs] = useState([
    { role: "assistant", content: "Hello! I'm your AI sales assistant. I have full context on your pipeline — ask me anything about your leads, conversion strategies, or follow-up priorities." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  /* Derived metrics */
  const active = contacts.filter((c) => !["won", "lost"].includes(c.stage));
  const pipelineVal = active.reduce((s, c) => s + c.value, 0);
  const wonVal = contacts.filter((c) => c.stage === "won").reduce((s, c) => s + c.value, 0);
  const convRate = contacts.length ? Math.round((contacts.filter((c) => c.stage === "won").length / contacts.length) * 100) : 0;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  /* ── Contact CRUD ──────────────────────────────────────────── */
  const openAdd = () => {
    setFormData({ name: "", company: "", email: "", phone: "", stage: "new", value: "", notes: "" });
    setSelectedId(null);
    setModal("add");
  };
  const openEdit = (c) => {
    setFormData({ ...c, value: String(c.value) });
    setSelectedId(c.id);
    setModal("edit");
  };
  const openDetail = (c) => { setSelectedId(c.id); setModal("detail"); };

  const saveContact = () => {
    if (!formData.name.trim() || !formData.company.trim()) return;
    const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (modal === "edit") {
      setContacts((prev) => prev.map((c) => c.id === selectedId ? { ...c, ...formData, value: parseInt(formData.value) || 0, lastContact: now } : c));
    } else {
      setContacts((prev) => [...prev, { ...formData, id: Date.now(), value: parseInt(formData.value) || 0, interactions: [], lastContact: now }]);
    }
    setModal(null);
  };

  const deleteContact = (id) => { setContacts((prev) => prev.filter((c) => c.id !== id)); setModal(null); };
  const moveStage = (id, stage) => setContacts((prev) => prev.map((c) => c.id === id ? { ...c, stage } : c));

  /* ── AI: Contact Insight ──────────────────────────────────── */
  const getInsight = async (contact) => {
    setAiContact(contact);
    setAiInsight(null);
    setAiLoading(true);
    setAiPanel(true);
    setTab("ai");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an expert CRM sales coach. Analyze this contact and give a sharp, actionable breakdown.

Contact: ${contact.name} | ${contact.company}
Stage: ${contact.stage} | Value: $${contact.value.toLocaleString()}
Last Contact: ${contact.lastContact}
Notes: ${contact.notes}
History: ${contact.interactions.join(" | ")}

Respond ONLY with valid JSON (no markdown, no fences):
{
  "summary": "2-sentence situation assessment",
  "urgency": "high|medium|low",
  "nextAction": "one specific, concrete next step",
  "winProbability": 0-100,
  "risks": ["risk1", "risk2"],
  "emailDraft": "concise follow-up email body (3-4 sentences, no subject line)"
}`,
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setAiInsight(parsed);
    } catch {
      setAiInsight({ error: "Could not load AI insight. Ensure your API key is configured." });
    }
    setAiLoading(false);
  };

  /* ── AI: Chat ─────────────────────────────────────────────── */
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput };
    const updated = [...chatMsgs, userMsg];
    setChatMsgs(updated);
    setChatInput("");
    setChatLoading(true);
    const context = `You are a CRM AI sales assistant with access to the following pipeline data:
Total contacts: ${contacts.length} | Pipeline value: $${pipelineVal.toLocaleString()} | Won revenue: $${wonVal.toLocaleString()} | Conversion rate: ${convRate}%
Contacts: ${contacts.map((c) => `${c.name} (${c.company}, ${c.stage}, $${c.value})`).join("; ")}
Be concise, data-driven, and give specific actionable advice.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: context,
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setChatMsgs((prev) => [...prev, { role: "assistant", content: data.content[0].text }]);
    } catch {
      setChatMsgs((prev) => [...prev, { role: "assistant", content: "Sorry, I ran into an error. Please try again." }]);
    }
    setChatLoading(false);
  };

  /* ── Filtered contacts ────────────────────────────────────── */
  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    const matchStage = stageFilter === "all" || c.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const selectedContact = contacts.find((c) => c.id === selectedId);

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: "'IBM Plex Mono', 'Courier New', monospace", overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <Sidebar tab={tab} setTab={setTab} contacts={contacts} />

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Header tab={tab} contacts={contacts} pipelineVal={pipelineVal} wonVal={wonVal} convRate={convRate} openAdd={openAdd} />

        <main style={{ flex: 1, overflow: "auto", padding: 28 }}>
          {tab === "dashboard" && <Dashboard contacts={contacts} pipelineVal={pipelineVal} wonVal={wonVal} convRate={convRate} openDetail={openDetail} getInsight={getInsight} />}
          {tab === "contacts"  && <ContactsTab contacts={filtered} search={search} setSearch={setSearch} stageFilter={stageFilter} setStageFilter={setStageFilter} openAdd={openAdd} openEdit={openEdit} openDetail={openDetail} getInsight={getInsight} moveStage={moveStage} />}
          {tab === "pipeline"  && <Pipeline contacts={contacts} moveStage={moveStage} openDetail={openDetail} getInsight={getInsight} />}
          {tab === "ai"        && <AITab aiPanel={aiPanel} aiContact={aiContact} aiInsight={aiInsight} aiLoading={aiLoading} chatMsgs={chatMsgs} chatInput={chatInput} setChatInput={setChatInput} sendChat={sendChat} chatLoading={chatLoading} chatEndRef={chatEndRef} />}
          {tab === "activity"  && <ActivityTab />}
        </main>
      </div>

      {/* ── Modals ── */}
      {(modal === "add" || modal === "edit") && (
        <ContactFormModal formData={formData} setFormData={setFormData} onSave={saveContact} onClose={() => setModal(null)} isEdit={modal === "edit"} onDelete={modal === "edit" ? () => deleteContact(selectedId) : null} />
      )}
      {modal === "detail" && selectedContact && (
        <ContactDetailModal contact={selectedContact} onClose={() => setModal(null)} onEdit={() => openEdit(selectedContact)} onInsight={() => getInsight(selectedContact)} moveStage={moveStage} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SIDEBAR
════════════════════════════════════════════════════════════════ */
function Sidebar({ tab, setTab, contacts }) {
  const NAV = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "contacts",  icon: "◎", label: "Contacts",  badge: contacts.filter(c => c.stage === "new").length },
    { id: "pipeline",  icon: "▤", label: "Pipeline" },
    { id: "ai",        icon: "⬡", label: "AI Insights" },
    { id: "activity",  icon: "◷", label: "Activity" },
  ];

  return (
    <div style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 4, color: C.text }}>NEX<span style={{ color: C.accentLt }}>CRM</span></div>
        <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 3, marginTop: 3 }}>SALES INTELLIGENCE</div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "14px 8px", flex: 1 }}>
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              background: tab === n.id ? `${C.accent}22` : "transparent",
              color: tab === n.id ? C.accentLt : C.textMuted,
              fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "inherit",
              marginBottom: 2, outline: tab === n.id ? `1px solid ${C.accent}44` : "none",
              transition: "all 0.15s",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14 }}>{n.icon}</span>
              {n.label}
            </span>
            {n.badge > 0 && (
              <span style={{ background: C.accent, color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>{n.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Status */}
      <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>STACK</div>
        {["React.js", "Node.js", "MongoDB"].map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green }} />
            <span style={{ fontSize: 10, color: C.textMuted }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HEADER
════════════════════════════════════════════════════════════════ */
function Header({ tab, pipelineVal, wonVal, convRate, contacts, openAdd }) {
  const titles = { dashboard: "Dashboard", contacts: "Contacts & Leads", pipeline: "Deal Pipeline", ai: "AI Sales Assistant", activity: "Activity Log" };
  const subs = { dashboard: "Sales performance overview", contacts: "Manage your leads and customers", pipeline: "Track deals through stages", ai: "Powered by Claude API", activity: "Recent interactions" };

  return (
    <div style={{ padding: "18px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface, flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.text }}>{titles[tab]}</div>
        <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1, marginTop: 2 }}>{subs[tab]}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 10, color: C.textMuted }}>Apr 25, 2026</div>
        {tab === "contacts" && (
          <button onClick={openAdd} style={btnStyle("primary")}>+ New Contact</button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════════════════════ */
function Dashboard({ contacts, pipelineVal, wonVal, convRate, openDetail, getInsight }) {
  const byStage = STAGE_ORDER.reduce((acc, s) => ({ ...acc, [s]: contacts.filter((c) => c.stage === s) }), {});
  const stats = [
    { label: "Total Leads",      value: contacts.length,  sub: `${contacts.filter(c => c.stage === "new").length} new`,    color: C.accentLt },
    { label: "Pipeline Value",   value: fmt(pipelineVal), sub: `${contacts.filter(c => !["won","lost"].includes(c.stage)).length} active deals`, color: C.amber },
    { label: "Won Revenue",      value: fmt(wonVal),      sub: `${contacts.filter(c => c.stage === "won").length} deals closed`, color: C.green },
    { label: "Conversion Rate",  value: `${convRate}%`,   sub: "Lead-to-won",                                              color: C.purple },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 2, background: s.color, opacity: 0.7 }} />
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color, letterSpacing: -1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Pipeline breakdown */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.textMuted, marginBottom: 18 }}>Pipeline Breakdown</div>
          {STAGE_ORDER.map((stage) => {
            const cnt = byStage[stage].length;
            const val = byStage[stage].reduce((s, c) => s + c.value, 0);
            const pct = contacts.length ? Math.round((cnt / contacts.length) * 100) : 0;
            return (
              <div key={stage} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: STAGES[stage].glow }}>{STAGES[stage].label}</span>
                  <span style={{ fontSize: 10, color: C.textMuted }}>{cnt} deal{cnt !== 1 ? "s" : ""} · {fmt(val)}</span>
                </div>
                <div style={{ height: 4, background: C.elevated, borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: STAGES[stage].color, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Hot leads */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.textMuted, marginBottom: 18 }}>Hot Leads</div>
          {contacts.filter(c => ["proposal", "contacted"].includes(c.stage)).slice(0, 4).map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
              onClick={() => openDetail(c)}>
              <Avatar name={c.name} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>{c.company}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: STAGES[c.stage].glow }}>{fmt(c.value)}</div>
                <StageBadge stage={c.stage} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginTop: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.textMuted, marginBottom: 18 }}>Recent Activity</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {ACTIVITIES.slice(0, 3).map((a) => (
            <div key={a.id} style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{a.contact}</div>
              <div style={{ fontSize: 10, color: C.accentLt, marginTop: 2 }}>{a.action}</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{a.detail}</div>
              <div style={{ fontSize: 9, color: C.textDim, marginTop: 8 }}>{a.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CONTACTS TAB
════════════════════════════════════════════════════════════════ */
function ContactsTab({ contacts, search, setSearch, stageFilter, setStageFilter, openAdd, openEdit, openDetail, getInsight, moveStage }) {
  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts, companies..."
          style={{ ...inputStyle, width: 280 }}
        />
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ ...inputStyle, width: 160, cursor: "pointer" }}>
          <option value="all">All Stages</option>
          {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGES[s].label}</option>)}
        </select>
        <span style={{ fontSize: 10, color: C.textMuted, marginLeft: "auto" }}>{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</span>
        <button onClick={openAdd} style={btnStyle("primary")}>+ Add Contact</button>
      </div>

      {/* Table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.elevated }}>
              {["Contact", "Stage", "Value", "Last Touch", "Actions"].map((h) => (
                <th key={h} style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase", padding: "12px 18px", textAlign: "left", fontFamily: "inherit", fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 12 }}>No contacts found</td></tr>
            )}
            {contacts.map((c) => (
              <ContactRow key={c.id} contact={c} openEdit={openEdit} openDetail={openDetail} getInsight={getInsight} moveStage={moveStage} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactRow({ contact: c, openEdit, openDetail, getInsight, moveStage }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? C.hover : "transparent", transition: "background 0.12s" }}>
      <td style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => openDetail(c)}>
          <Avatar name={c.name} size={34} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{c.company} · {c.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
        <StageBadge stage={c.stage} />
      </td>
      <td style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.text }}>
        {fmt(c.value)}
      </td>
      <td style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted }}>
        {c.lastContact}
      </td>
      <td style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={btnStyle("ghost-sm")} onClick={() => openEdit(c)}>Edit</button>
          <button style={{ ...btnStyle("ghost-sm"), color: C.accentLt, border: `1px solid ${C.accent}44` }} onClick={() => getInsight(c)}>⬡ AI</button>
        </div>
      </td>
    </tr>
  );
}

/* ════════════════════════════════════════════════════════════════
   PIPELINE (Kanban)
════════════════════════════════════════════════════════════════ */
function Pipeline({ contacts, moveStage, openDetail, getInsight }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
      {STAGE_ORDER.map((stage) => {
        const cards = contacts.filter((c) => c.stage === stage);
        const total = cards.reduce((s, c) => s + c.value, 0);
        return (
          <div key={stage} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
            {/* Column header */}
            <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: STAGES[stage].glow }}>{STAGES[stage].label}</span>
                <span style={{ fontSize: 9, background: `${STAGES[stage].color}30`, color: STAGES[stage].glow, padding: "2px 7px", borderRadius: 10 }}>{cards.length}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted }}>{fmt(total)}</div>
            </div>

            {/* Cards */}
            {cards.map((c) => (
              <div key={c.id} style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 8, cursor: "pointer" }}
                onClick={() => openDetail(c)}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <Avatar name={c.name} size={24} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{c.name}</span>
                </div>
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 8 }}>{c.company}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: STAGES[stage].glow }}>{fmt(c.value)}</div>

                {/* Move stage buttons */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                  {STAGE_ORDER.filter((s) => s !== stage).map((target) => (
                    <button key={target} onClick={() => moveStage(c.id, target)}
                      style={{ fontSize: 8, padding: "3px 7px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}>
                      → {STAGES[target].label}
                    </button>
                  ))}
                </div>

                <button style={{ ...btnStyle("ghost-sm"), marginTop: 8, width: "100%", fontSize: 9, color: C.accentLt }} onClick={(e) => { e.stopPropagation(); getInsight(c); }}>⬡ AI Insight</button>
              </div>
            ))}
            {cards.length === 0 && <div style={{ fontSize: 10, color: C.textDim, textAlign: "center", padding: "20px 0" }}>No deals</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   AI TAB
════════════════════════════════════════════════════════════════ */
function AITab({ aiPanel, aiContact, aiInsight, aiLoading, chatMsgs, chatInput, setChatInput, sendChat, chatLoading, chatEndRef }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: aiPanel ? "1fr 380px" : "1fr", gap: 16, height: "calc(100vh - 140px)" }}>
      {/* Chat */}
      <div style={{ display: "flex", flexDirection: "column", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.textMuted }}>
          ⬡ AI Sales Chat
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          {chatMsgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "82%", padding: "10px 14px", borderRadius: 8, fontSize: 12, lineHeight: 1.7,
                background: m.role === "user" ? `${C.accent}28` : C.elevated,
                border: `1px solid ${m.role === "user" ? C.accent + "44" : C.border}`,
                color: C.text, whiteSpace: "pre-wrap",
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ display: "flex" }}>
              <div style={{ padding: "10px 14px", borderRadius: 8, background: C.elevated, border: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted }}>
                Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div style={{ display: "flex", gap: 8, padding: 14, borderTop: `1px solid ${C.border}` }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            placeholder="Ask about your pipeline, leads, or get strategy advice..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button style={btnStyle("primary")} onClick={sendChat} disabled={chatLoading}>Send</button>
        </div>
      </div>

      {/* AI Insight Panel */}
      {aiPanel && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.textMuted }}>Contact Insight</div>
            {aiContact && <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginTop: 4 }}>{aiContact.name} · {aiContact.company}</div>}
          </div>
          <div style={{ padding: 18, flex: 1 }}>
            {aiLoading && (
              <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>⬡</div>
                <div style={{ fontSize: 11 }}>Analyzing contact data...</div>
              </div>
            )}
            {aiInsight && !aiInsight.error && <InsightCard insight={aiInsight} />}
            {aiInsight?.error && <div style={{ color: C.red, fontSize: 12, padding: 20 }}>{aiInsight.error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight: ins }) {
  const urgencyColor = ins.urgency === "high" ? C.red : ins.urgency === "medium" ? C.amber : C.green;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section label="Situation">
        <div style={{ fontSize: 12, lineHeight: 1.7, color: C.text, background: C.elevated, padding: 12, borderRadius: 6 }}>{ins.summary}</div>
      </Section>

      <Section label="Next Action">
        <div style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}33`, borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>{ins.nextAction}</div>
          <div style={{ fontSize: 10, color: urgencyColor }}>URGENCY: {ins.urgency?.toUpperCase()} · WIN PROBABILITY: {ins.winProbability}%</div>
        </div>
      </Section>

      {ins.risks?.length > 0 && (
        <Section label="Risks to Watch">
          {ins.risks.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: C.text, marginBottom: 6 }}>
              <span style={{ color: C.red, flexShrink: 0 }}>⚠</span>{r}
            </div>
          ))}
        </Section>
      )}

      <Section label="Draft Follow-up">
        <div style={{ fontSize: 12, lineHeight: 1.7, color: C.text, background: C.elevated, padding: 12, borderRadius: 6, borderLeft: `3px solid ${C.accent}`, fontStyle: "italic" }}>
          {ins.emailDraft}
        </div>
      </Section>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ACTIVITY TAB
════════════════════════════════════════════════════════════════ */
function ActivityTab() {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.textMuted, marginBottom: 22 }}>Activity Timeline</div>
      {ACTIVITIES.map((a, i) => (
        <div key={a.id} style={{ display: "flex", gap: 16, paddingBottom: 20, marginBottom: 20, borderBottom: i < ACTIVITIES.length - 1 ? `1px solid ${C.border}` : "none" }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: C.elevated, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{a.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.contact}</div>
            <div style={{ fontSize: 11, color: C.accentLt, marginTop: 2 }}>{a.action}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{a.detail}</div>
          </div>
          <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0, paddingTop: 4 }}>{a.time}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MODALS
════════════════════════════════════════════════════════════════ */
function ContactFormModal({ formData, setFormData, onSave, onClose, isEdit, onDelete }) {
  const field = (label, key, type = "text") => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <input type={type} value={formData[key]} onChange={(e) => setFormData((f) => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
    </div>
  );
  return (
    <Overlay onClose={onClose}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 22 }}>{isEdit ? "Edit Contact" : "New Contact"}</div>
      {field("Full Name", "name")}
      {field("Company", "company")}
      {field("Email", "email", "email")}
      {field("Phone", "phone")}
      {field("Deal Value ($)", "value", "number")}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Stage</div>
        <select value={formData.stage} onChange={(e) => setFormData((f) => ({ ...f, stage: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
          {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGES[s].label}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Notes</div>
        <textarea value={formData.notes} onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, height: 80, resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        {onDelete && <button style={{ ...btnStyle("danger"), marginRight: "auto" }} onClick={onDelete}>Delete</button>}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
          <button style={btnStyle("primary")} onClick={onSave}>Save Contact</button>
        </div>
      </div>
    </Overlay>
  );
}

function ContactDetailModal({ contact: c, onClose, onEdit, onInsight, moveStage }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar name={c.name} size={48} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{c.name}</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{c.company}</div>
            <StageBadge stage={c.stage} />
          </div>
        </div>
        <button style={btnStyle("ghost-sm")} onClick={onClose}>✕</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[["Email", c.email], ["Phone", c.phone], ["Value", fmt(c.value)], ["Last Contact", c.lastContact]].map(([k, v]) => (
          <div key={k} style={{ background: C.elevated, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
            <div style={{ fontSize: 12, color: C.text }}>{v}</div>
          </div>
        ))}
      </div>

      {c.notes && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Notes</div>
          <div style={{ fontSize: 12, color: C.text, background: C.elevated, borderRadius: 6, padding: 12, lineHeight: 1.7 }}>{c.notes}</div>
        </div>
      )}

      {c.interactions?.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Interaction History</div>
          {c.interactions.map((int, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: C.text, marginBottom: 6 }}>
              <span style={{ color: C.accent }}>→</span>{int}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Move Stage</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {STAGE_ORDER.filter((s) => s !== c.stage).map((target) => (
            <button key={target} onClick={() => { moveStage(c.id, target); onClose(); }}
              style={{ fontSize: 10, padding: "5px 12px", borderRadius: 5, border: `1px solid ${STAGES[target].color}44`, background: STAGES[target].bg, color: STAGES[target].glow, cursor: "pointer", fontFamily: "inherit" }}>
              → {STAGES[target].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button style={btnStyle("ghost")} onClick={onEdit}>Edit</button>
        <button style={{ ...btnStyle("primary"), flex: 1 }} onClick={() => { onInsight(); onClose(); }}>⬡ Get AI Insight</button>
      </div>
    </Overlay>
  );
}

/* ════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
════════════════════════════════════════════════════════════════ */
function Overlay({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000b0", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
      onClick={onClose}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: 500, maxHeight: "85vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Avatar({ name, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 6, background: avatarColor(name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

function StageBadge({ stage }) {
  const s = STAGES[stage];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 4, background: s.bg, color: s.glow, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: s.glow }} />
      {s.label}
    </span>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

/* ─── Style helpers ───────────────────────────────────────────── */
const inputStyle = {
  width: "100%", background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 6,
  padding: "9px 12px", color: C.text, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
  outline: "none", boxSizing: "border-box",
};

function btnStyle(variant) {
  const base = { border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace", borderRadius: 6, transition: "all 0.15s" };
  if (variant === "primary")   return { ...base, padding: "9px 18px", background: C.accent, color: "#fff" };
  if (variant === "ghost")     return { ...base, padding: "9px 16px", background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` };
  if (variant === "ghost-sm")  return { ...base, padding: "5px 10px", background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` };
  if (variant === "danger")    return { ...base, padding: "9px 14px", background: C.redDim, color: C.red, border: `1px solid ${C.red}44` };
  return base;
}
