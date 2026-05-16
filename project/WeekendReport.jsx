// WeekendReport.jsx — admin-only "Reports" tab inside the Manage panel.
// Generates an .xlsx of weekend-shift coverage for a chosen month, matching
// the four-column shape:  Name | Month and QTY | Earned | Total.
//
// Rates live as code constants here (intentional — they're a stable
// business rule, not per-employee data). Edit the values below to change.

// ---------- Shift rates (USD per shift, gross) ----------
const SHIFT_RATES = { day: 150, night: 100, holiday: 100 };

// ---------- Local style helpers (scoped to this file to avoid clobbering
// the `styles`-style globals other scripts define) ----------
const wrSectionLabel = {
  fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em",
  color: "var(--fg-2)", marginBottom: 8,
};
const wrCard = {
  display: "grid", gap: 10, padding: "14px 16px",
  border: "1px solid var(--border-weak)", borderRadius: "var(--r-lg)",
  background: "var(--bg-page)", marginBottom: 14,
};
const wrInput = {
  height: 34, padding: "0 10px", border: "1px solid var(--border-strong)",
  borderRadius: "var(--r-md)", background: "var(--bg-surface)", color: "var(--fg-1)",
  fontFamily: "var(--font-ui)", fontSize: 13, outline: "none",
};
const wrBtn = (variant = "default", disabled = false) => ({
  height: 32, padding: "0 14px",
  border: "1px solid var(--border-strong)",
  background: variant === "primary"
    ? (disabled ? "var(--border-strong)" : "var(--action-primary)")
    : "var(--bg-surface)",
  color: variant === "primary" ? "var(--fg-on-primary)" : "var(--fg-active)",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-button)", fontWeight: 500, fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.7 : 1,
});
const wrTh = {
  padding: "9px 12px", textAlign: "left", fontWeight: 600, fontSize: 11,
  color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: ".04em",
  background: "var(--bg-page)",
};
const wrTd = { padding: "10px 12px", color: "var(--fg-1)", fontSize: 13 };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Given the coverage map and holidays map for a target year+month (month is
// 1-12), return one row per employee who had at least one shift, sorted by name.
// Holiday coverage is counted once per unique holiday document (not per day in
// a multi-day holiday range) and earns SHIFT_RATES.holiday each.
function buildWeekendRows(coverage, holidays, year, month) {
  const tally = {}; // fullName -> { day, night, holiday }
  // Weekend shifts
  for (const [dateStr, byslot] of Object.entries(coverage || {})) {
    const [yStr, mStr] = dateStr.split("-");
    if (+yStr !== year || +mStr !== month) continue;
    for (const slot of ["day", "night"]) {
      const shift = byslot && byslot[slot];
      const name = shift && (shift.fullName || shift.name);
      if (!name) continue;
      const rec = tally[name] || (tally[name] = { day: 0, night: 0, holiday: 0 });
      rec[slot] += 1;
    }
  }
  // Holiday coverage — de-duplicate by docId+employee so multi-day holidays
  // count as one appearance, not one per expanded weekday date.
  const seenHoliday = new Set();
  for (const [dateStr, list] of Object.entries(holidays || {})) {
    const [yStr, mStr] = dateStr.split("-");
    if (+yStr !== year || +mStr !== month) continue;
    for (const h of list) {
      for (const w of (h.working || [])) {
        const name = w.fullName || w.name;
        if (!name) continue;
        const key = `${h.docId}|${name}`;
        if (seenHoliday.has(key)) continue;
        seenHoliday.add(key);
        const rec = tally[name] || (tally[name] = { day: 0, night: 0, holiday: 0 });
        rec.holiday += 1;
      }
    }
  }
  const monthName = MONTH_NAMES[month - 1];
  return Object.entries(tally)
    .map(([name, c]) => {
      const qtyBits = [];
      if (c.night)   qtyBits.push(`${c.night} night`);
      if (c.day)     qtyBits.push(`${c.day} day`);
      if (c.holiday) qtyBits.push(`${c.holiday} holiday`);
      const qty = `${monthName} - ${qtyBits.join(", ")}`;
      // "100+100+150+100" — list each individual shift's rate.
      const earnedBits = [];
      for (let i = 0; i < c.night;   i++) earnedBits.push(SHIFT_RATES.night);
      for (let i = 0; i < c.day;     i++) earnedBits.push(SHIFT_RATES.day);
      for (let i = 0; i < c.holiday; i++) earnedBits.push(SHIFT_RATES.holiday);
      const earned = earnedBits.join("+");
      const total  = c.night * SHIFT_RATES.night + c.day * SHIFT_RATES.day + c.holiday * SHIFT_RATES.holiday;
      return { name, qty, earned, total, day: c.day, night: c.night, holiday: c.holiday };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Teams available in the filter. "all" exports everyone.
const TEAM_OPTIONS = [
  { id: "all", label: "All teams" },
  { id: "UA",  label: "Ukraine (UA)" },
  { id: "MX",  label: "Mexico (MX)" },
  { id: "CN",  label: "China (CN)" },
];

function WeekendReportTab({ coverage, holidays, employees }) {
  const today = new Date();
  const [year, setYear]   = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth() + 1); // 1-12
  const [team, setTeam]   = React.useState("all");
  const [busy, setBusy]   = React.useState(false);
  const [error, setError] = React.useState(null);

  // Look-up: fullName (lowercased) -> team code ("UA"|"MX"|"CN"|"")
  const teamByName = React.useMemo(() => {
    const m = {};
    for (const e of (employees || [])) {
      const name = (e.fullName || e.name || "").toLowerCase();
      if (name) m[name] = (e.team || "").toUpperCase();
    }
    return m;
  }, [employees]);

  const rows = React.useMemo(() => {
    const all = buildWeekendRows(coverage, holidays, year, month);
    if (team === "all") return all;
    return all.filter(r => teamByName[r.name.toLowerCase()] === team);
  }, [coverage, year, month, team, teamByName]);

  const monthName = MONTH_NAMES[month - 1];
  // Team suffix appears in both the on-screen filename hint and the saved
  // file. "All teams" keeps the original short name from the brief.
  const teamSuffix = team === "all" ? "" : ` (${team})`;
  const filename   = `Weekend Coverage ${monthName} ${year}${teamSuffix}`;

  // Year picker range: 2 years back through 1 year forward, plus whatever
  // year/month is currently selected (in case the user navigates further out).
  const years = React.useMemo(() => {
    const set = new Set();
    for (let y = today.getFullYear() - 2; y <= today.getFullYear() + 1; y++) set.add(y);
    set.add(year);
    return [...set].sort((a, b) => a - b);
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  const onExport = () => {
    setError(null);
    if (!window.XLSX) {
      setError("Spreadsheet library isn't loaded yet. Try again in a moment.");
      return;
    }
    if (rows.length === 0) {
      setError(`No weekend shifts found for ${monthName} ${year}.`);
      return;
    }
    try {
      setBusy(true);
      const XLSX = window.XLSX;
      // Build the sheet as an array-of-arrays so each cell type is explicit.
      const aoa = [
        ["Name", "Earned", "Total"],
        ...rows.map(r => [r.name, r.earned, r.total]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      // Reasonable column widths so the file looks like the sample.
      ws["!cols"] = [
        { wch: 22 }, // Name
        { wch: 22 }, // Earned (formula-ish string)
        { wch: 10 }, // Total
      ];
      // Force Total to render as a number, not a string.
      for (let i = 0; i < rows.length; i++) {
        const addr = XLSX.utils.encode_cell({ r: i + 1, c: 2 });
        if (ws[addr]) { ws[addr].t = "n"; ws[addr].v = rows[i].total; }
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Coverage");
      XLSX.writeFile(wb, filename + ".xlsx");
    } catch (e) {
      console.error("xlsx export failed", e);
      setError(String(e && e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <div style={wrSectionLabel}>Weekend coverage report</div>
      </div>

      <div style={wrCard}>
        <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.45 }}>
          Export an Excel report of weekend and holiday shift coverage for a chosen month.
          Rates: <strong>{SHIFT_RATES.day}</strong> day · <strong>{SHIFT_RATES.night}</strong> night · <strong>{SHIFT_RATES.holiday}</strong> holiday (<strong>EST</strong>).
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <select style={wrInput} value={month} onChange={e => setMonth(+e.target.value)} aria-label="Month">
            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select style={wrInput} value={year} onChange={e => setYear(+e.target.value)} aria-label="Year">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <select style={wrInput} value={team} onChange={e => setTeam(e.target.value)} aria-label="Team">
          {TEAM_OPTIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1, fontSize: 12, color: "var(--fg-3)" }}>
            {rows.length === 0
              ? (team === "all" ? "No shifts in this month" : `No ${team} shifts in this month`)
              : `${rows.length} employee${rows.length === 1 ? "" : "s"} · `
                + `${rows.reduce((n, r) => n + r.day + r.night + r.holiday, 0)} shift`
                + `${rows.reduce((n, r) => n + r.day + r.night + r.holiday, 0) === 1 ? "" : "s"}`
                + (team === "all" ? "" : ` · ${team} only`)}
          </div>
          <button
            onClick={onExport}
            disabled={busy || rows.length === 0}
            style={wrBtn("primary", busy || rows.length === 0)}
          >
            {busy ? "Exporting…" : "Download .xlsx"}
          </button>
        </div>
        {error && (
          <div style={{
            fontSize: 12, color: "var(--action-destructive)",
            padding: "6px 10px", background: "#FEE2E2", borderRadius: "var(--r-md)",
          }}>{error}</div>
        )}
      </div>

      <div style={{ ...wrSectionLabel, marginTop: 4 }}>
        Preview · {filename}.xlsx
      </div>
      {rows.length === 0 ? (
        <div style={{
          fontSize: 13, color: "var(--fg-3)", fontStyle: "italic",
          padding: "16px 18px", border: "1px dashed var(--border-weak)",
          borderRadius: "var(--r-lg)", background: "var(--bg-page)",
        }}>
          No weekend shifts scheduled for {monthName} {year}
          {team === "all" ? "" : ` on the ${team} team`}.
        </div>
      ) : (
        <div style={{
          border: "1px solid var(--border-weak)", borderRadius: "var(--r-lg)",
          overflow: "hidden", background: "var(--bg-surface)",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={wrTh}>Name</th>
                <th style={wrTh}>Earned</th>
                <th style={{ ...wrTh, textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name} style={{ borderTop: "1px solid var(--border-weak)" }}>
                  <td style={{ ...wrTd, fontWeight: 500 }}>{r.name}</td>
                  <td style={{ ...wrTd, fontFeatureSettings: '"tnum"' }}>{r.earned}</td>
                  <td style={{ ...wrTd, textAlign: "right", fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { WeekendReportTab, buildWeekendRows, SHIFT_RATES });
