// data.jsx — static design tokens, helpers, and constants used across
// calendar variants. Live data (employees, events, coverage, holidays,
// tier2) now comes from Firestore via firestore.jsx — see useFirestoreData.

// Live arrays are kept on window so existing components can reference
// them as bare globals; firestore.jsx mirrors snapshots into these.
window.EMPLOYEES = window.EMPLOYEES || [];
window.EVENTS = window.EVENTS || [];
window.WEEKEND_COVERAGE = window.WEEKEND_COVERAGE || {};
window.HOLIDAYS = window.HOLIDAYS || {};
window.TIER2_ONCALL = window.TIER2_ONCALL || {};

// Type → color mapping. Three leave types are visually distinct at a glance.
// Each type also carries an icon image (in /assets) so event bars read as
// themed pills (matches the companion Pro-Support Schedule app).
const LEAVE_TYPES = {
  Vacation:   { id:"Vacation",   label:"Vacation",            icon:"assets/vacation.png",       bar:"#a78bfa", barHover:"#c4b5fd", bg:"var(--ev-vacation-bg)",   fg:"var(--ev-vacation-fg)",   dot:"#a78bfa" },
  PTO:        { id:"PTO",        label:"Personal Day",        icon:"assets/pto.png",            bar:"#0061FF", barHover:"#3B82F6", bg:"var(--ev-pto-bg)",        fg:"var(--ev-pto-fg)",        dot:"#0061FF" },
  Sick:       { id:"Sick",       label:"Sick Day",            icon:"assets/sick-leave.png",     bar:"#fb923c", barHover:"#fdba74", bg:"var(--ev-sick-bg)",       fg:"var(--ev-sick-fg)",       dot:"#fb923c" },
  Study:      { id:"Study",      label:"Study Leave",         icon:"assets/study_leave.png",    bar:"#eab308", barHover:"#facc15", bg:"var(--ev-study-bg)",      fg:"var(--ev-study-fg)",      dot:"#eab308" },
  Wedding:    { id:"Wedding",    label:"Wedding Leave",       icon:"assets/wedding_leave.png",  bar:"#f472b6", barHover:"#f9a8d4", bg:"var(--ev-wedding-bg)",    fg:"var(--ev-wedding-fg)",    dot:"#f472b6" },
  Maternity:  { id:"Maternity",  label:"Maternity/Paternity Leave", icon:"assets/maternity_leave.png",bar:"#14b8a6", barHover:"#2dd4bf", bg:"var(--ev-maternity-bg)",  fg:"var(--ev-maternity-fg)",  dot:"#14b8a6" },
};

// Today anchor used for "today" highlighting across all calendar variants.
// var (not const) so the midnight timer in CalendarPrototype can reassign it.
var TODAY = new Date();

// Helpers
const iso = (d) => {
  // Local-date ISO ("YYYY-MM-DD") so it lines up with Firestore date strings.
  const y = d.getFullYear(), m = d.getMonth()+1, dd = d.getDate();
  return `${y}-${String(m).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
};

const SHIFTS = [
  { id: "night", label: "11PM–11AM" },
  { id: "day",   label: "11AM–11PM" },
];

// Stable tint per Tier 2 person.
const TIER2_TINTS = {
  "Bohdan Tril":          { bg: "#FFFFFF", fg: "#D62828", border: "#F4B6B6" },
  "Davyd Vynohradov":     { bg: "#1E88E5", fg: "#FFFFFF", border: "#1565C0" },
  "Svetlana Bazhynova":   { bg: "#F5F5F5", fg: "#1F2937", border: "#E5E7EB" },
  "Dmytro Lytovchenko":   { bg: "#FFFFFF", fg: "#D62828", border: "#F4B6B6" },
  "Sam Novelo":           { bg: "#FDE2E4", fg: "#8A1C1C", border: "#F6B6B9" },
};

const COUNTRIES = {
  UA: { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  MX: { code: "MX", name: "Mexico",  flag: "🇲🇽" },
  CN: { code: "CN", name: "China",   flag: "🇨🇳" },
};

// Make abbreviation for employee name
const abbrevName = (name) => {
  const parts = name.trim().split(" ");
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

// Role → avatar tint (bg + fg). Mirrors the dark-app palette
// (Tier1 green, Tier2 sky, Tech Lead indigo, Team Lead gold).
// Used by every "circle initials" badge across the calendar so a
// person reads as the same color everywhere (Roster, MonthB swimlane,
// MonthC PersonRow, etc.). Falls back to neutral blue for unknown roles.
const roleAvatarTint = (role) => {
  const r = (role || "").toLowerCase();
  if (r.includes("tier1") || r.includes("tier 1"))
    return { bg: "var(--role-tier1-bg)",    border: "var(--role-tier1-border)",    fg: "var(--role-tier1-fg)"    };
  if (r.includes("tier2") || r.includes("tier 2"))
    return { bg: "var(--role-tier2-bg)",    border: "var(--role-tier2-border)",    fg: "var(--role-tier2-fg)"    };
  if (r.includes("tech lead") || r.includes("teach lead"))
    return { bg: "var(--role-techlead-bg)", border: "var(--role-techlead-border)", fg: "var(--role-techlead-fg)" };
  if (r.includes("team lead"))
    return { bg: "var(--role-teamlead-bg)", border: "var(--role-teamlead-border)", fg: "var(--role-teamlead-fg)" };
  return   { bg: "var(--role-default-bg)",  border: "var(--role-default-border)",  fg: "var(--role-default-fg)"  };
};

// Date helpers
function sameDay(a, b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function dateInRange(day, start, end) {
  const d0 = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const s  = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e  = new Date(end.getFullYear(),   end.getMonth(),   end.getDate()).getTime();
  return d0 >= s && d0 <= e;
}
function addDays(date, n) { const x = new Date(date); x.setDate(x.getDate()+n); return x; }
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function endOfMonth(date)   { return new Date(date.getFullYear(), date.getMonth()+1, 0); }
function startOfWeek(date, weekStart = 0) {
  const x = new Date(date);
  const diff = (x.getDay() - weekStart + 7) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}
function buildMonthGrid(monthDate, weekStart = 0) {
  const first = startOfMonth(monthDate);
  const last  = endOfMonth(monthDate);
  const gridStart = startOfWeek(first, weekStart);
  const weeks = [];
  let cur = gridStart;
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let i = 0; i < 7; i++) {
      row.push(cur);
      cur = addDays(cur, 1);
    }
    // Skip rows that contain no days from the target month — we only want
    // to show next-month (or prev-month) days when their week also holds
    // at least one current-month day. The first row always anchors the
    // 1st, so this only matters for trailing overflow rows.
    if (w >= 1 && row.every(d => d.getMonth() !== last.getMonth())) break;
    weeks.push(row);
  }
  return weeks;
}
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW_SHORT_SU = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

Object.assign(window, {
  LEAVE_TYPES, SHIFTS, TODAY,
  COUNTRIES, TIER2_TINTS,
  MONTH_NAMES, DOW_SHORT_SU,
  sameDay, dateInRange, addDays, startOfMonth, endOfMonth, startOfWeek, buildMonthGrid, iso,
  abbrevName, roleAvatarTint,
});
