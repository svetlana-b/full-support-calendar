// Roster.jsx — read-only roster popup. Visible to every signed-in user.
// Lists each employee with their birthday, work anniversary, time in
// Teamwork Commerce, and team flag — modeled after the spreadsheet the
// team already keeps.

const TEAM_FLAGS = {
  UA: "🇺🇦",
  MX: "🇲🇽",
  CN: "🇨🇳",
};
const TEAM_NAMES = {
  UA: "Ukraine",
  MX: "Mexico",
  CN: "China",
};

// Parse a Firestore birthday string. We accept:
//   "DD/MM"        → { day, month }     (most common in the live data)
//   "D/M"          → same
//   "MMM D"        → "Apr 7"            (occasional spreadsheet leftover)
//   "YYYY-MM-DD"   → ignore the year, use month/day
function _parseBirthday(s) {
  if (!s) return null;
  const t = String(s).trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) return { day: +m[1], month: +m[2] };
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return { day: +m[3], month: +m[2] };
  m = t.match(/^([A-Za-z]{3,})\s+(\d{1,2})$/);
  if (m) {
    const idx = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]
      .indexOf(m[1].slice(0,3).toLowerCase());
    if (idx >= 0) return { day: +m[2], month: idx + 1 };
  }
  return null;
}
function _fmtBirthday(b) {
  if (!b) return "—";
  return `${b.day}-${MONTH_NAMES[b.month-1].slice(0,3)}`;
}

// "2019-06-03" → Date, or null. Anything else returns null so we can show
// an em-dash without a crash.
function _parseDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2]-1, +m[3]);
}
function _fmtDate(d) {
  if (!d) return "—";
  return `${d.getDate()}-${MONTH_NAMES[d.getMonth()].slice(0,3)}-${d.getFullYear()}`;
}

// Years/months/days between two dates, calendar-aware so we match the
// spreadsheet wording ("4 years, 8 months, 29 days").
function _diffYMD(start, end) {
  if (!start || !end || end < start) return null;
  let y = end.getFullYear() - start.getFullYear();
  let mo = end.getMonth() - start.getMonth();
  let d = end.getDate() - start.getDate();
  if (d < 0) {
    mo -= 1;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    d += prevMonth.getDate();
  }
  if (mo < 0) { y -= 1; mo += 12; }
  return { y, mo, d };
}
function _fmtYMD(p) {
  if (!p) return "—";
  return `${p.y} year${p.y===1?"":"s"}, ${p.mo} month${p.mo===1?"":"s"}, ${p.d} day${p.d===1?"":"s"}`;
}

// Sort by birthday (month, then day). Employees without a birthday fall
// to the bottom.
function _bdayKey(b) {
  if (!b) return 9999;
  return b.month * 100 + b.day;
}

function Roster({ open, employees, onClose }) {
  if (!open) return null;

  const today = new Date();
  const curMonth = today.getMonth() + 1; // 1-12
  const rows = (employees || []).map(emp => {
    const b = _parseBirthday(emp.birthday);
    const start = _parseDate(emp.careerStart);
    const tenure = _diffYMD(start, today);
    const bdayThisMonth = !!(b && b.month === curMonth);
    const annivThisMonth = !!(start && (start.getMonth() + 1) === curMonth
      && start.getFullYear() < today.getFullYear());
    return { emp, b, start, tenure, bdayThisMonth, annivThisMonth };
  });
  rows.sort((a, b) => a.emp.fullName.localeCompare(b.emp.fullName));

  const headerStyle = {
    padding: "10px 12px",
    fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
    color: "#fff", background: "var(--tw-blue-700, #1e3a8a)",
    textAlign: "left", letterSpacing: ".03em",
    borderRight: "1px solid rgba(255,255,255,0.18)",
    position: "sticky", top: 0, zIndex: 1,
  };
  const cellStyle = {
    padding: "8px 12px",
    fontFamily: "var(--font-ui)", fontSize: 13,
    color: "var(--fg-1)",
    borderBottom: "1px solid var(--border-weak)",
    borderRight: "1px solid var(--border-weak)",
    whiteSpace: "nowrap",
  };

  return ReactDOM.createPortal((
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 20px",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width: "min(880px, 100%)", maxHeight: "min(86vh, 720px)",
        background:"var(--bg-surface)", borderRadius:"var(--r-xl)",
        boxShadow:"var(--shadow-modal)", display:"flex", flexDirection:"column",
        overflow:"hidden",
      }}>
        <div style={{
          display:"flex", alignItems:"center", gap:12, padding:"16px 20px",
          borderBottom:"1px solid var(--border-weak)",
        }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:700, color:"var(--fg-1)" }}>
              Birthdays & Anniversary
            </div>
            <div style={{ fontSize:12, color:"var(--fg-2)", marginTop:2 }}>
              {rows.length} team member{rows.length===1?"":"s"}
            </div>
          </div>
          <button onClick={onClose} style={{
            border:"1px solid var(--border-weak)", background:"var(--bg-surface)",
            color:"var(--fg-2)", borderRadius:"var(--r-lg)",
            width:32, height:32, cursor:"pointer", fontSize:16, lineHeight:1,
          }} aria-label="Close">×</button>
        </div>

        <div style={{ overflow:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={{ ...headerStyle, width:"30%" }}>Support Member</th>
                <th style={{ ...headerStyle, width:"15%" }}>Birthday</th>
                <th style={{ ...headerStyle, width:"20%" }}>Anniversary</th>
                <th style={{ ...headerStyle, width:"27%" }}>Time in TW</th>
                <th style={{ ...headerStyle, width:"8%", borderRight:"none", textAlign:"center" }}>Team</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...cellStyle, color:"var(--fg-3)", textAlign:"center", padding:"32px" }}>
                    No employees yet.
                  </td>
                </tr>
              )}
              {rows.map(({ emp, b, start, tenure, bdayThisMonth, annivThisMonth }, i) => {
                const HL = "#DCFCE7";
                const baseBg = i % 2 ? "var(--bg-page)" : "var(--bg-surface)";
                return (
                <tr key={emp.id} style={{ background: baseBg }}>
                  <td style={{ ...cellStyle, fontWeight:600 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{
                        width:24, height:24, borderRadius:"var(--r-pill)",
                        background:"var(--tw-blue-100)", color:"var(--tw-blue-800)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:10, fontWeight:600,
                      }}>{emp.initials}</div>
                      <span>{emp.fullName}</span>
                    </div>
                  </td>
                  <td style={{ ...cellStyle, color: b ? "var(--fg-1)" : "var(--fg-3)", background: bdayThisMonth ? HL : undefined }}>{_fmtBirthday(b)}</td>
                  <td style={{ ...cellStyle, color: start ? "var(--fg-1)" : "var(--fg-3)", background: annivThisMonth ? HL : undefined }}>{_fmtDate(start)}</td>
                  <td style={{ ...cellStyle, color: tenure ? "var(--fg-1)" : "var(--fg-3)", background: annivThisMonth ? HL : undefined }}>{_fmtYMD(tenure)}</td>
                  <td style={{ ...cellStyle, borderRight:"none", textAlign:"center" }}
                    title={TEAM_NAMES[emp.team] || emp.team || ""}>
                    <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                      <CountryFlag code={emp.team}/>
                    </span>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ), document.body);
}

Object.assign(window, { Roster });
