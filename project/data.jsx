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
  Vacation: { id:"Vacation", label:"Vacation",  icon:"assets/vacation.png",   bar:"#a78bfa", barHover:"#c4b5fd", bg:"rgba(167,139,250,0.12)", fg:"#a78bfa", dot:"#a78bfa" },
  PTO:      { id:"PTO",      label:"PTO",       icon:"assets/pto.png",        bar:"#0061FF", barHover:"#3B82F6", bg:"#DBEAFE",              fg:"#1E3A8A", dot:"#0061FF" },
  Sick:     { id:"Sick",     label:"Sick leave",icon:"assets/sick-leave.png", bar:"#fb923c", barHover:"#fdba74", bg:"rgba(251,146,60,0.12)", fg:"#fb923c", dot:"#fb923c" },
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
    return { bg: "rgba(110,231,160,0.15)", fg: "#6ee7a0" };
  if (r.includes("tier2") || r.includes("tier 2"))
    return { bg: "rgba(56,189,248,0.15)",  fg: "#38bdf8" };
  if (r.includes("tech lead") || r.includes("teach lead"))
    return { bg: "rgba(129,140,248,0.15)", fg: "#818cf8" };
  if (r.includes("team lead"))
    return { bg: "rgba(240,208,128,0.15)", fg: "#f0d080" };
  return { bg: "rgba(56,189,248,0.10)", fg: "#7dd3fc" };
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
