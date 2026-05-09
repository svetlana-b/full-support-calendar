// Celebrations.jsx — birthday & work-anniversary helpers shared by the
// Roster popup and the per-day badges that show on the calendar grids.
//
// Parsing is forgiving: birthdays in Firestore are usually "DD/MM" but
// older rows may use "MMM D" or full ISO dates; career_start is always
// "YYYY-MM-DD". Anything we can't parse comes back as null so the UI
// can render an em-dash without crashing.

const _CEL_MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function parseBirthday(s) {
  if (!s) return null;
  const t = String(s).trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) return { day: +m[1], month: +m[2] };
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return { day: +m[3], month: +m[2] };
  m = t.match(/^([A-Za-z]{3,})\s+(\d{1,2})$/);
  if (m) {
    const idx = _CEL_MONTHS.indexOf(m[1].slice(0,3).toLowerCase());
    if (idx >= 0) return { day: +m[2], month: idx + 1 };
  }
  return null;
}

function parseStartDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2]-1, +m[3]);
}

// For a given day, return everyone whose birthday or anniversary lands
// on that calendar date. anniversaryYears is the new tenure milestone
// (e.g. "celebrating 5 years today"); 0 means it's their first day so
// we skip it (we only badge anniversaries from year 1+).
function celebrationsForDay(day, employees) {
  if (!day || !employees || !employees.length) return [];
  const d = day.getDate();
  const mo = day.getMonth() + 1;
  const y = day.getFullYear();
  const out = [];
  for (const emp of employees) {
    const b = parseBirthday(emp.birthday);
    if (b && b.day === d && b.month === mo) {
      out.push({ kind: "birthday", emp });
    }
    const start = parseStartDate(emp.careerStart);
    if (start && start.getDate() === d && (start.getMonth()+1) === mo && start.getFullYear() < y) {
      out.push({ kind: "anniversary", emp, years: y - start.getFullYear() });
    }
  }
  return out;
}

// Compact chip rendered inside a day cell. `size="sm"` is for MonthC's
// tiny cells; default is the roomier MonthA cells.
function CelebrationChips({ items, size = "md" }) {
  if (!items || !items.length) return null;
  const sm = size === "sm";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:2, marginTop:3 }}>
      {items.map((c, i) => (
        <CelebrationChip key={c.kind + ":" + c.emp.id + ":" + i} item={c} size={size}/>
      ))}
    </div>
  );
}

function CelebrationChip({ item, size = "md" }) {
  const sm = size === "sm";
  const isBday = item.kind === "birthday";
  const bg = isBday ? "#FCE7F3" : "#DCFCE7"; // soft pink / soft green
  const fg = isBday ? "#9D174D" : "#166534";
  const title = isBday
    ? `${item.emp.fullName} · Birthday`
    : `${item.emp.fullName} · ${item.years}-year anniversary`;
  return (
    <div title={title} style={{
      display:"flex", alignItems:"center", gap: sm ? 3 : 5,
      padding: sm ? "1px 4px" : "2px 6px",
      borderRadius: 3,
      background: bg, color: fg,
      fontFamily: "var(--font-ui)",
      fontSize: sm ? 9 : 10, fontWeight: 600, lineHeight: 1.2,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    }}>
      <CelebrationIcon kind={item.kind} size={sm ? 9 : 11}/>
      <span style={{ overflow:"hidden", textOverflow:"ellipsis" }}>{item.emp.name || item.emp.fullName}</span>
      {!isBday && item.years > 0 && (
        <span style={{ flex:"none", opacity:.85 }}>· {item.years}y</span>
      )}
    </div>
  );
}

function CelebrationIcon({ kind, size = 11 }) {
  if (kind === "birthday") {
    // Cake silhouette
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
        strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ flex:"none" }} aria-hidden>
        <path d="M8 1.5c-.6.7-.6 1.4 0 2.2"/>
        <rect x="2.5" y="6" width="11" height="6" rx="1"/>
        <path d="M2.5 9.5c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0 2-.8 2 0"/>
        <path d="M8 4v2"/>
      </svg>
    );
  }
  // Trophy for anniversary
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ flex:"none" }} aria-hidden>
      <path d="M5 2h6v3a3 3 0 0 1-6 0V2z"/>
      <path d="M5 3.5H3a1 1 0 0 0 0 2h2"/>
      <path d="M11 3.5h2a1 1 0 0 1 0 2h-2"/>
      <path d="M8 8v3"/>
      <path d="M5.5 13h5"/>
      <path d="M6 11h4l-.4 2H6.4z"/>
    </svg>
  );
}

Object.assign(window, {
  parseBirthday, parseStartDate, celebrationsForDay,
  CelebrationChips, CelebrationChip, CelebrationIcon,
});
