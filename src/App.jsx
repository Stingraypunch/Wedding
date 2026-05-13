import { useState, useEffect, useCallback } from "react";

const TABLES = Array.from({ length: 16 }, (_, i) => i + 1);

function loadData() {
  try {
    const raw = localStorage.getItem("seating-data");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveData(data) {
  try { localStorage.setItem("seating-data", JSON.stringify(data)); }
  catch (e) { console.error("Save failed", e); }
}

const gold = "#b8860b";
const goldLight = "#d4a853";
const goldPale = "#f5e6c4";
const white = "#ffffff";
const offWhite = "#faf8f4";
const cream = "#f7f3eb";
const warmGray = "#e8e2d8";
const textDark = "#2c2416";
const textMid = "#6b5d4d";
const textLight = "#9a8b78";

export default function App() {
  const [view, setView] = useState("guest");
  const [guests, setGuests] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    const d = loadData();
    if (d) setGuests(d);
    setLoaded(true);
  }, []);

  const persist = useCallback((next) => { setGuests(next); saveData(next); }, []);

  if (!loaded) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: offWhite }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: gold, animation: "pulse 1s infinite" }} />
    </div>
  );

  return (
    <div style={S.root}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        input:focus, select:focus, textarea:focus { border-color: ${goldLight} !important; box-shadow: 0 0 0 3px rgba(184,134,11,0.1) !important; }
      `}</style>
      <nav style={S.nav}>
        <div style={S.navInner}>
          <div style={S.logo}>&#10022; <span style={S.logoText}>Seating</span></div>
          <div style={S.tabs}>
            <button onClick={() => setView("guest")} style={{ ...S.tab, ...(view === "guest" ? S.tabActive : {}) }}>Find My Table</button>
            <button onClick={() => setView("admin")} style={{ ...S.tab, ...(view === "admin" ? S.tabActive : {}) }}>Manage</button>
          </div>
        </div>
      </nav>

      {view === "guest" ? (
        <GuestView guests={guests} />
      ) : !adminAuth ? (
        <div style={S.centerWrap}>
          <div style={S.card}>
            <div style={S.cardAccent} />
            <h2 style={S.heading}>Admin Access</h2>
            <p style={S.sub}>Enter your PIN to manage the seating chart</p>
            <input type="password" placeholder="PIN (default: 1234)" value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { pin === "1234" ? setAdminAuth(true) : alert("Incorrect PIN"); } }}
              style={S.input} />
            <button onClick={() => { pin === "1234" ? setAdminAuth(true) : alert("Incorrect PIN"); }}
              style={S.btnGold}>Unlock</button>
          </div>
        </div>
      ) : (
        <AdminView guests={guests} persist={persist} />
      )}
    </div>
  );
}

function GuestView({ guests }) {
  const [name, setName] = useState("");
  const [result, setResult] = useState(null);
  const [animating, setAnimating] = useState(false);

  const lookup = () => {
    const q = name.trim().toLowerCase();
    if (!q) return;
    const match = Object.entries(guests).find(([g]) => g.toLowerCase() === q);
    setAnimating(true);
    setTimeout(() => { setResult(match ? { table: match[1] } : "not_found"); setAnimating(false); }, 600);
  };

  return (
    <div style={S.guestWrap}>
      <div style={S.heroBadge}>&#10022;</div>
      <h1 style={S.heroTitle}>Find Your Table</h1>
      <p style={S.heroSub}>Enter your name below to discover your seat</p>
      <div style={S.searchRow}>
        <input type="text" placeholder="Your full name..." value={name}
          onChange={(e) => { setName(e.target.value); setResult(null); }}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          style={S.inputLarge} />
        <button onClick={lookup} style={S.btnGoldLarge}>Search</button>
      </div>

      {animating && (
        <div style={{ marginTop: 28, color: gold, fontSize: 15, animation: "fadeIn 0.3s" }}>
          <span style={{ animation: "pulse 0.8s infinite" }}>&#9679;</span> Looking up your seat...
        </div>
      )}

      {!animating && result && result !== "not_found" && (
        <div style={S.resultCard}>
          <div style={S.resultGlow} />
          <div style={S.resultLabel}>You're seated at</div>
          <div style={S.tableNumber}>Table {result.table}</div>
          <div style={S.resultName}>{name}</div>
        </div>
      )}

      {!animating && result === "not_found" && (
        <div style={S.notFound}>
          <p style={{ margin: 0 }}>We couldn't find <strong>"{name}"</strong> on the guest list.</p>
          <p style={{ margin: "8px 0 0", opacity: 0.65, fontSize: 14 }}>Please check your spelling or ask the host for help.</p>
        </div>
      )}
    </div>
  );
}

function AdminView({ guests, persist }) {
  const [newName, setNewName] = useState("");
  const [newTable, setNewTable] = useState(1);
  const [bulkText, setBulkText] = useState("");
  const [bulkTable, setBulkTable] = useState(1);
  const [tab, setTab] = useState("single");
  const [search, setSearch] = useState("");

  const addGuest = () => { const n = newName.trim(); if (!n) return; persist({ ...guests, [n]: newTable }); setNewName(""); };
  const removeGuest = (nm) => { const next = { ...guests }; delete next[nm]; persist(next); };
  const bulkAdd = () => {
    const names = bulkText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    const next = { ...guests }; names.forEach((n) => (next[n] = bulkTable)); persist(next); setBulkText("");
  };
  const clearAll = () => { if (confirm("Remove ALL guests?")) persist({}); };
  const exportCSV = () => {
    const rows = [["Name", "Table"]];
    Object.entries(guests).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).forEach(([n, t]) => rows.push([n, t]));
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "seating_chart.csv"; a.click();
  };

  const filteredGuests = Object.entries(guests).filter(([n]) => n.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  const guestCount = Object.keys(guests).length;
  const tableCounts = {};
  Object.values(guests).forEach((t) => (tableCounts[t] = (tableCounts[t] || 0) + 1));

  return (
    <div style={S.adminWrap}>
      <h2 style={S.heading}>Seating Manager</h2>
      <p style={S.sub}>{guestCount} guest{guestCount !== 1 ? "s" : ""} across {Object.keys(tableCounts).length} table{Object.keys(tableCounts).length !== 1 ? "s" : ""}</p>

      <div style={S.subTabs}>
        {["single", "bulk", "overview"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...S.subTab, ...(tab === t ? S.subTabActive : {}) }}>
            {t === "single" ? "Add Guest" : t === "bulk" ? "Bulk Add" : "Overview"}
          </button>
        ))}
      </div>

      {tab === "single" && (
        <div style={S.card}>
          <div style={S.cardAccent} />
          <label style={S.label}>Guest Name</label>
          <input placeholder="e.g. Jane Smith" value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGuest()} style={S.input} />
          <label style={{ ...S.label, marginTop: 14 }}>Table</label>
          <select value={newTable} onChange={(e) => setNewTable(Number(e.target.value))} style={S.select}>
            {TABLES.map((t) => <option key={t} value={t}>Table {t} ({tableCounts[t] || 0} guests)</option>)}
          </select>
          <button onClick={addGuest} style={S.btnGold}>+ Add Guest</button>
        </div>
      )}

      {tab === "bulk" && (
        <div style={S.card}>
          <div style={S.cardAccent} />
          <label style={S.label}>Paste names (one per line)</label>
          <textarea rows={8} placeholder={"John Doe\nJane Smith\nMike Johnson"} value={bulkText}
            onChange={(e) => setBulkText(e.target.value)} style={S.textarea} />
          <label style={{ ...S.label, marginTop: 14 }}>Assign all to table</label>
          <select value={bulkTable} onChange={(e) => setBulkTable(Number(e.target.value))} style={S.select}>
            {TABLES.map((t) => <option key={t} value={t}>Table {t} ({tableCounts[t] || 0} guests)</option>)}
          </select>
          <button onClick={bulkAdd} style={S.btnGold}>Add All</button>
        </div>
      )}

      {tab === "overview" && (
        <div style={S.card}>
          <div style={S.cardAccent} />
          <div style={S.overviewGrid}>
            {TABLES.map((t) => (
              <div key={t} style={S.tCard}>
                <div style={S.tNum}>T{t}</div>
                <div style={S.tCount}>{tableCounts[t] || 0}</div>
                <div style={S.tLabel}>guests</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={S.cardAccent} />
        <div style={S.listHeader}>
          <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 18, color: textDark }}>Guest List</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportCSV} style={S.btnSmall}>Export CSV</button>
            <button onClick={clearAll} style={{ ...S.btnSmall, background: "#fef0f0", color: "#c44" }}>Clear All</button>
          </div>
        </div>
        <input placeholder="Search guests..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...S.input, marginBottom: 12 }} />
        {filteredGuests.length === 0 ? (
          <p style={{ textAlign: "center", padding: 24, color: textLight, fontSize: 14 }}>
            {guestCount === 0 ? "No guests added yet. Start adding above!" : "No matches."}
          </p>
        ) : (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {filteredGuests.map(([nm, table]) => (
              <div key={nm} style={S.guestRow}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: 14, color: textDark }}>{nm}</span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: gold, fontWeight: 600 }}>Table {table}</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <select value={table} onChange={(e) => persist({ ...guests, [nm]: Number(e.target.value) })} style={S.miniSelect}>
                    {TABLES.map((t) => <option key={t} value={t}>T{t}</option>)}
                  </select>
                  <button onClick={() => removeGuest(nm)} style={S.btnDelete}>&#10005;</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  root: { minHeight: "100vh", background: "linear-gradient(170deg, " + offWhite + " 0%, " + cream + " 40%, " + white + " 100%)", color: textDark, fontFamily: "'DM Sans', sans-serif" },
  nav: { borderBottom: "1px solid " + warmGray, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 10 },
  navInner: { maxWidth: 640, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 56 },
  logo: { color: gold, fontSize: 20, fontWeight: 700 },
  logoText: { fontFamily: "'Playfair Display', serif", color: textDark, fontSize: 18, marginLeft: 4 },
  tabs: { display: "flex", gap: 4 },
  tab: { padding: "8px 16px", background: "none", border: "none", borderRadius: 8, color: textLight, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" },
  tabActive: { background: "rgba(184,134,11,0.1)", color: gold },
  guestWrap: { padding: "48px 20px 60px", maxWidth: 520, margin: "0 auto", textAlign: "center" },
  heroBadge: { fontSize: 30, color: gold, marginBottom: 8, opacity: 0.6 },
  heroTitle: { fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 700, margin: "0 0 8px", color: textDark },
  heroSub: { color: textLight, fontSize: 15, margin: "0 0 36px" },
  searchRow: { display: "flex", gap: 10 },
  inputLarge: { flex: 1, padding: "14px 18px", fontSize: 16, background: white, border: "1.5px solid " + warmGray, borderRadius: 12, color: textDark, outline: "none", fontFamily: "'DM Sans', sans-serif" },
  btnGoldLarge: { padding: "14px 28px", background: "linear-gradient(135deg, " + gold + ", " + goldLight + ")", border: "none", borderRadius: 12, color: white, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(184,134,11,0.25)" },
  resultCard: { marginTop: 36, padding: "40px 28px", background: white, borderRadius: 20, border: "1.5px solid " + goldPale, position: "relative", overflow: "hidden", animation: "slideUp 0.5s ease-out", boxShadow: "0 12px 40px rgba(184,134,11,0.12)" },
  resultGlow: { position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,168,83,0.15), transparent 70%)", pointerEvents: "none" },
  resultLabel: { fontSize: 13, textTransform: "uppercase", letterSpacing: 2.5, color: textLight, marginBottom: 8, position: "relative" },
  tableNumber: { fontFamily: "'Playfair Display', serif", fontSize: 56, fontWeight: 700, color: gold, margin: "4px 0 14px", position: "relative" },
  resultName: { fontSize: 16, color: textMid, fontStyle: "italic", fontFamily: "'Playfair Display', serif", position: "relative" },
  notFound: { marginTop: 28, padding: 20, background: "#fef7f0", borderRadius: 14, border: "1px solid #f0d0b0", color: "#8a5a2a", fontSize: 15, textAlign: "left" },
  adminWrap: { padding: "28px 16px 60px", maxWidth: 600, margin: "0 auto" },
  centerWrap: { padding: "60px 20px", maxWidth: 420, margin: "0 auto" },
  heading: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, margin: "0 0 4px", color: textDark },
  sub: { color: textLight, fontSize: 14, margin: "0 0 20px" },
  subTabs: { display: "flex", gap: 6, marginBottom: 16 },
  subTab: { padding: "8px 16px", background: white, border: "1px solid " + warmGray, borderRadius: 8, color: textMid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  subTabActive: { background: "rgba(184,134,11,0.08)", borderColor: goldPale, color: gold },
  card: { background: white, borderRadius: 16, padding: "22px 20px", border: "1px solid " + warmGray, position: "relative", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" },
  cardAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, " + gold + ", " + goldLight + ", " + goldPale + ")" },
  label: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: textLight, marginBottom: 6 },
  input: { width: "100%", padding: "11px 14px", fontSize: 14, background: cream, border: "1px solid " + warmGray, borderRadius: 8, color: textDark, outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" },
  select: { width: "100%", padding: "11px 14px", fontSize: 14, background: cream, border: "1px solid " + warmGray, borderRadius: 8, color: textDark, outline: "none", fontFamily: "'DM Sans', sans-serif" },
  textarea: { width: "100%", padding: "11px 14px", fontSize: 14, background: cream, border: "1px solid " + warmGray, borderRadius: 8, color: textDark, outline: "none", fontFamily: "'DM Sans', sans-serif", resize: "vertical", boxSizing: "border-box" },
  btnGold: { marginTop: 16, width: "100%", padding: "12px", background: "linear-gradient(135deg, " + gold + ", " + goldLight + ")", border: "none", borderRadius: 10, color: white, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 14px rgba(184,134,11,0.2)" },
  btnSmall: { padding: "6px 12px", background: cream, border: "1px solid " + warmGray, borderRadius: 6, color: textMid, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8, paddingTop: 6 },
  guestRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: cream, marginBottom: 4 },
  miniSelect: { padding: "4px 6px", background: white, border: "1px solid " + warmGray, borderRadius: 5, color: textDark, fontSize: 12, fontFamily: "'DM Sans', sans-serif" },
  btnDelete: { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef0f0", border: "1px solid #f5d5d5", borderRadius: 6, color: "#c44", fontSize: 13, cursor: "pointer" },
  overviewGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, paddingTop: 4 },
  tCard: { textAlign: "center", padding: "14px 6px", background: cream, borderRadius: 10, border: "1px solid " + goldPale },
  tNum: { fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: gold },
  tCount: { fontSize: 22, fontWeight: 700, color: textDark, margin: "4px 0 0" },
  tLabel: { fontSize: 11, color: textLight, textTransform: "uppercase", letterSpacing: 0.5 },
};
