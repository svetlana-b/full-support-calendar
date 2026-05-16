// firestore.jsx — Firestore loaders + writers (replaces sheets.jsx).
//
// Schema observed in the live database:
//
//   employees/{Full Name}     { name, role, team, timezone? (start/end clock), slack_url, start, end }
//   vacations/{auto or det.}  { name, date_start: "YYYY-MM-DD", date_end: "YYYY-MM-DD", type: "Vacation"|"PTO"|"Sick Leave" }
//   weekends/{YYYY-MM-DD slot} { date, day_type, name, start: "HH:MM", end: "HH:MM" }
//   holidays/{Holiday Name CC} { date, name, teams_off: "UA"|"MX"|"CN", working: ["Name|HH:MM/HH:MM", ...] }
//   oncall/{YYYY-MM-DD}        { name, week_start: "YYYY-MM-DD" }
//
// All loaders subscribe via onSnapshot for live updates.
// Writers use deterministic IDs where possible (vacations: name_dateStart).

// ---------- helpers ----------

function _shortName(full) {
  if (!full) return "";
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return parts[0];
  return parts[0] + " " + parts[parts.length-1][0] + ".";
}
function _initialsOf(full) {
  if (!full) return "?";
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return (parts[0][0] || "?").toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}
function _idOf(full) {
  return (full || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function _roleBucket(role) {
  const r = (role || "").toLowerCase();
  if (/lead|manager|head/.test(r)) return "Engineering";
  if (/tier\s*2|senior|sr\b/.test(r)) return "Engineering";
  if (/tier\s*1|junior|jr\b/.test(r)) return "Support";
  if (/design/.test(r))   return "Design";
  if (/product|pm\b/.test(r)) return "Product";
  if (/ops|operations/.test(r)) return "Operations";
  return "Support";
}
function _isoToLocalDate(iso) {
  // "2026-05-04" -> Date at local midnight (so day-grid math works).
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) {
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  }
  return new Date(+m[1], +m[2]-1, +m[3]);
}
function _localDateToIso(d) {
  const y = d.getFullYear(), m = d.getMonth()+1, dd = d.getDate();
  return `${y}-${String(m).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
}
function _hmTo12(hm) {
  // "23:00" -> "11PM";  "11:00" -> "11AM"; "11:30" -> "11:30AM"
  if (!hm) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(hm);
  if (!m) return hm;
  const h24 = +m[1], mm = +m[2];
  const h12 = h24 === 0 ? 12 : (h24 > 12 ? h24 - 12 : h24);
  const ampm = h24 < 12 ? "AM" : "PM";
  return mm === 0 ? `${h12}${ampm}` : `${h12}:${String(mm).padStart(2,"0")}${ampm}`;
}
function _hmToMinutes(hm) {
  if (!hm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hm));
  if (!m) return null;
  return (+m[1]) * 60 + (+m[2]);
}
function _resolveType(raw) {
  const t = (raw || "").trim().toLowerCase();
  if (/sick/.test(t)) return "Sick";
  if (/pto|personal/.test(t)) return "PTO";
  return "Vacation";
}
function _typeToWriteName(type) {
  return type === "Sick" ? "Sick Leave" : type;
}
// Vacation doc id: lowercase-name__YYYY-MM-DD (deterministic per person+start)
function _vacationDocId(fullName, dateStart) {
  const slug = _idOf(fullName);
  const ds   = typeof dateStart === "string" ? dateStart : _localDateToIso(dateStart);
  return `${slug}__${ds}`;
}

// ---------- transformers (Firestore doc -> app shape) ----------

function _transformEmployee(docId, data) {
  const fullName = data.name || docId;
  return {
    id:        _idOf(fullName),
    name:      _shortName(fullName),
    fullName,
    email:     (data.email || "").toLowerCase(),
    role:      _roleBucket(data.role),
    roleRaw:   data.role || "",
    timezone:  data.timezone || "",
    team:      data.team || "",
    initials:  _initialsOf(fullName),
    slackUrl:  data.slack_url || "",
    start:     data.start || "",
    end:       data.end || "",
    birthday:  data.birthday || "",
    careerStart: data.career_start || "",
  };
}

function _transformVacation(docId, data, byName) {
  const fullName = data.name || "";
  const empId = byName.get(fullName.toLowerCase());
  if (!empId) return null;
  const start = _isoToLocalDate(data.date_start);
  const end   = _isoToLocalDate(data.date_end || data.date_start);
  if (!start || !end) return null;
  return {
    id:         docId,
    employeeId: empId,
    type:       _resolveType(data.type),
    typeRaw:    data.type || "",
    start, end,
    note:       data.note || "",
    fullName,
    owner_uid:  data.owner_uid || null,
    owner_email:data.owner_email || null,
  };
}

// Build coverage map: { "YYYY-MM-DD": { day: {...}, night: {...} } }
function _buildCoverageMap(weekendDocs) {
  const out = {};
  for (const { id, data } of weekendDocs) {
    const date = data.date;
    if (!date) continue;
    const startMin = _hmToMinutes(data.start);
    const endMin   = _hmToMinutes(data.end);
    // Always derive slot from the actual hours, not the doc-ID suffix —
    // existing data has some docs where the suffix and the hours disagree
    // (e.g. "...day" with 23:00→11:00 hours). Hours are the source of truth.
    const slot = (startMin != null && endMin != null && startMin > endMin) ? "night" : "day";
    const entry = out[date] ||= {};
    entry[slot] = {
      docId:    id,
      name:     _shortName(data.name || ""),
      fullName: data.name || "",
      start:    _hmTo12(data.start),
      end:      _hmTo12(data.end),
      startRaw: data.start || "",
      endRaw:   data.end || "",
      day_type: data.day_type || "",
    };
  }
  return out;
}

// Expand a date range into individual weekday dates (skip Sat/Sun).
// Supports both new (date_start/date_end) and legacy single-date docs.
function _expandWeekdayDates(dateStart, dateEnd) {
  const dates = [];
  const start = new Date(dateStart + "T00:00:00");
  const end   = new Date((dateEnd || dateStart) + "T00:00:00");
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
    }
  }
  return dates;
}

// holidays/{HolidayName CC} -> { "YYYY-MM-DD": [ { docId, name, teams, working, date_start, date_end } ] }
// Multi-day holidays are expanded to one entry per weekday; weekend dates are skipped.
function _buildHolidaysMap(holidayDocs) {
  const out = {};
  for (const { id, data } of holidayDocs) {
    // Support both new (date_start/date_end) and legacy (date) Firestore shape.
    const dateStart = data.date_start || data.date;
    if (!dateStart) continue;
    const dateEnd = data.date_end || dateStart;
    const teams = (data.teams_off || "")
      .split(/[,;/]/).map(s => s.trim().toUpperCase()).filter(Boolean);
    const workingArr = Array.isArray(data.working) ? data.working : [];
    const working = workingArr.map(part => {
      // New shape: { name, time: "HH:MM-HH:MM" }
      // Legacy shape: "Name|HH:MM/HH:MM" (or with trailing |Timezone)
      let name = "", range = "", tz = "";
      if (part && typeof part === "object") {
        name = part.name || part.fullName || "";
        range = part.time || part.range || "";
        tz = part.tz || part.timezone || "";
      } else {
        const segs = String(part).split("|").map(x => (x||"").trim());
        name = segs[0] || "";
        range = segs[1] || "";
        tz = segs[2] || "";
      }
      // range may use "-" (new) or "/" (legacy) between start and end
      const [s, e] = range.split(/[-/]/).map(x => (x||"").trim());
      return {
        name:     _shortName(name),
        fullName: name,
        start:    _hmTo12(s),
        end:      _hmTo12(e),
        startRaw: s, endRaw: e,
        tz,
      };
    }).sort((a, b) => (a.startRaw || "").localeCompare(b.startRaw || ""));
    // Add one entry per weekday in the range. Weekend dates are skipped so
    // holiday chips never appear in Sat/Sun cells.
    for (const date of _expandWeekdayDates(dateStart, dateEnd)) {
      const list = out[date] ||= [];
      // Keep each doc as its own item — working coverage stays tied to the
      // originating team. date_start/date_end are carried for the editor.
      list.push({ docId: id, name: data.name || "", teams, working, date_start: dateStart, date_end: dateEnd });
    }
  }
  return out;
}

// oncall/{YYYY-MM-DD} -> { "YYYY-MM-DD": { name, fullName, role } }
function _buildTier2Map(oncallDocs) {
  const out = {};
  for (const { id, data } of oncallDocs) {
    const wk = data.week_start || id;
    if (!data.name) continue;
    out[wk] = {
      docId:    id,
      name:     _shortName(data.name),
      fullName: data.name,
      role:     data.role || "Tier 2",
    };
  }
  return out;
}

// ---------- writers ----------

async function _addOrUpdateVacation({ fullName, dateStart, dateEnd, type, note, existingId }) {
  const { fbDb, fb, fbAuth } = window;
  const startIso = typeof dateStart === "string" ? dateStart : _localDateToIso(dateStart);
  const endIso   = typeof dateEnd   === "string" ? dateEnd   : _localDateToIso(dateEnd);
  const me = fbAuth && fbAuth.currentUser;
  const id = existingId || _vacationDocId(fullName, startIso);

  // On update, preserve the original owner so admins editing someone
  // else's row don't reassign ownership (which would also fail rules).
  let existingOwnerUid = null, existingOwnerEmail = null;
  if (existingId) {
    try {
      const snap = await fb.getDoc(fb.doc(fbDb, "vacations", id));
      if (snap.exists()) {
        const d = snap.data() || {};
        existingOwnerUid = d.owner_uid || null;
        existingOwnerEmail = d.owner_email || null;
      }
    } catch (e) { /* fall through to current-user fallback */ }
  }

  const payload = {
    name: fullName,
    date_start: startIso,
    date_end:   endIso,
    type:       _typeToWriteName(type),
    owner_uid:  existingOwnerUid || (me ? me.uid : null),
    owner_email:existingOwnerEmail || (me ? (me.email || null) : null),
  };
  if (note) payload.note = note;
  await fb.setDoc(fb.doc(fbDb, "vacations", id), payload, { merge: false });
  return { ok: true, id };
}

async function _deleteVacation(id) {
  const { fbDb, fb } = window;
  await fb.deleteDoc(fb.doc(fbDb, "vacations", id));
  return { ok: true };
}

async function _setWeekendCoverage({ date, slot, fullName, start, end, day_type }) {
  // slot: "day" | "night";  date: "YYYY-MM-DD";  start/end: "HH:MM"
  const { fbDb, fb } = window;
  const id = `${date} ${slot}`;
  const payload = {
    date, day_type: day_type || (new Date(date+"T00:00:00").getDay() === 6 ? "saturday" : "sunday"),
    name: fullName, start, end,
  };
  await fb.setDoc(fb.doc(fbDb, "weekends", id), payload, { merge: true });
  return { ok: true, id };
}

async function _deleteWeekendCoverage(docId) {
  const { fbDb, fb } = window;
  await fb.deleteDoc(fb.doc(fbDb, "weekends", docId));
  return { ok: true };
}

async function _setHoliday({ docId, name, date_start, date_end, teams_off, working }) {
  const { fbDb, fb } = window;
  const id = docId || `${name} ${teams_off}`.trim();
  const payload = {
    name, date_start, date_end: date_end || date_start, teams_off,
    working: Array.isArray(working) ? working : [],
  };
  await fb.setDoc(fb.doc(fbDb, "holidays", id), payload, { merge: false });
  return { ok: true, id };
}

async function _deleteHoliday(docId) {
  const { fbDb, fb } = window;
  await fb.deleteDoc(fb.doc(fbDb, "holidays", docId));
  return { ok: true };
}

async function _setOncall({ week_start, name }) {
  const { fbDb, fb } = window;
  const id = week_start;
  await fb.setDoc(fb.doc(fbDb, "oncall", id), { week_start, name }, { merge: true });
  return { ok: true, id };
}

async function _deleteOncall(week_start) {
  const { fbDb, fb } = window;
  await fb.deleteDoc(fb.doc(fbDb, "oncall", week_start));
  return { ok: true };
}

async function _setEmployee({ originalId, name, email, role, team, start, end, slack_url, birthday, career_start }) {
  const { fbDb, fb } = window;
  const id = (name || "").trim();
  if (!id) throw new Error("Name is required");
  const payload = {
    name: id,
    email: email || "",
    role: role || "",
    team: team || "",
    start: start || "",
    end: end || "",
    slack_url: slack_url || "",
    birthday: birthday || "",
    career_start: career_start || "",
  };
  // If the user renamed an existing row, the doc id (= full name) changes.
  // Write the new doc, then delete the old one. setDoc with merge:false
  // replaces the whole document, which keeps things simple.
  if (originalId && originalId !== id) {
    await fb.setDoc(fb.doc(fbDb, "employees", id), payload, { merge: false });
    await fb.deleteDoc(fb.doc(fbDb, "employees", originalId));
  } else {
    await fb.setDoc(fb.doc(fbDb, "employees", id), payload, { merge: false });
  }
  return { ok: true, id };
}

async function _deleteEmployee(docId) {
  const { fbDb, fb } = window;
  await fb.deleteDoc(fb.doc(fbDb, "employees", docId));
  return { ok: true };
}

// ---------- React hook ----------

function useFirestoreData(user) {
  const [employees,  setEmployees]  = React.useState([]);
  const [coverage,   setCoverage]   = React.useState({});
  const [events,     setEvents]     = React.useState([]);
  const [holidays,   setHolidays]   = React.useState({});
  const [tier2,      setTier2]      = React.useState({});
  const [contacts,   setContacts]   = React.useState({});
  const [status,     setStatus]     = React.useState("loading");
  const [error,      setError]      = React.useState(null);

  // raw caches needed across snapshot boundaries
  const employeesRef = React.useRef([]);
  const vacRawRef    = React.useRef([]);

  React.useEffect(() => {
    // Wait for sign-in before subscribing — Firestore rules likely require auth.
    if (!user) {
      setStatus("loading");
      return;
    }
    if (!window.__firebaseReady) {
      setError("Firebase SDK not loaded");
      setStatus("error");
      return;
    }
    const { fbDb, fb } = window;

    let unsubs = [];
    let pending = 6;
    const tick = () => { pending--; if (pending <= 0) setStatus("live"); };

    const fail = (label) => (err) => {
      console.error(`[firestore] ${label} failed:`, err);
      setError(err.message || String(err));
      setStatus("error");
    };

    // employees
    unsubs.push(fb.onSnapshot(fb.collection(fbDb, "employees"), (snap) => {
      const list = [];
      snap.forEach(d => list.push(_transformEmployee(d.id, d.data())));
      // Sort employees alphabetically by name for stable UIs.
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      employeesRef.current = list;
      setEmployees(list);
      // re-derive vacations from cached raw rows (their employeeId depends on roster)
      const byName = new Map();
      for (const e of list) byName.set(e.fullName.toLowerCase(), e.id);
      const evs = [];
      for (const v of vacRawRef.current) {
        const ev = _transformVacation(v.id, v.data, byName);
        if (ev) evs.push(ev);
      }
      setEvents(evs);
      tick();
    }, fail("employees")));

    // vacations
    unsubs.push(fb.onSnapshot(fb.collection(fbDb, "vacations"), (snap) => {
      const raw = [];
      snap.forEach(d => raw.push({ id: d.id, data: d.data() }));
      vacRawRef.current = raw;
      const byName = new Map();
      for (const e of employeesRef.current) byName.set(e.fullName.toLowerCase(), e.id);
      const evs = [];
      for (const v of raw) {
        const ev = _transformVacation(v.id, v.data, byName);
        if (ev) evs.push(ev);
      }
      setEvents(evs);
      tick();
    }, fail("vacations")));

    // weekends
    unsubs.push(fb.onSnapshot(fb.collection(fbDb, "weekends"), (snap) => {
      const raw = [];
      snap.forEach(d => raw.push({ id: d.id, data: d.data() }));
      setCoverage(_buildCoverageMap(raw));
      tick();
    }, fail("weekends")));

    // holidays
    unsubs.push(fb.onSnapshot(fb.collection(fbDb, "holidays"), (snap) => {
      const raw = [];
      snap.forEach(d => raw.push({ id: d.id, data: d.data() }));
      setHolidays(_buildHolidaysMap(raw));
      tick();
    }, fail("holidays")));

    // oncall (Tier 2)
    unsubs.push(fb.onSnapshot(fb.collection(fbDb, "oncall"), (snap) => {
      const raw = [];
      snap.forEach(d => raw.push({ id: d.id, data: d.data() }));
      setTier2(_buildTier2Map(raw));
      tick();
    }, fail("oncall")));

    // contacts (phone + preferred messengers, keyed by full name)
    unsubs.push(fb.onSnapshot(fb.collection(fbDb, "contacts"), (snap) => {
      const map = {};
      snap.forEach(d => {
        const data = d.data() || {};
        const fullName = data.name || d.id;
        const messengers = Array.isArray(data.preferred_messenger) ? data.preferred_messenger
                         : (typeof data.preferred_messenger === "string" && data.preferred_messenger
                            ? data.preferred_messenger.split(",").map(s => s.trim()).filter(Boolean)
                            : []);
        map[fullName.toLowerCase()] = {
          fullName,
          phone: data.contact || data.phone || "",
          messengers,
        };
      });
      setContacts(map);
      tick();
    }, fail("contacts")));

    return () => { unsubs.forEach(u => { try { u(); } catch {} }); };
  }, [user]);

  // Submit a new time-off entry with optimistic local update.
  const submitTimeOff = React.useCallback(async ({ employeeId, type, start, end, note, existingId }) => {
    const emp = employeesRef.current.find(e => e.id === employeeId);
    if (!emp) return { ok: false, error: "Unknown employee" };
    try {
      return await _addOrUpdateVacation({
        fullName: emp.fullName, dateStart: start, dateEnd: end, type, note, existingId,
      });
    } catch (e) {
      console.error("submitTimeOff failed:", e);
      return { ok: false, error: e.message || String(e) };
    }
  }, []);

  const deleteTimeOff = React.useCallback(async (id) => {
    try { return await _deleteVacation(id); }
    catch (e) { return { ok: false, error: e.message || String(e) }; }
  }, []);

  const setWeekendCoverage  = React.useCallback((args) => _setWeekendCoverage(args).catch(e => ({ ok:false, error:String(e) })), []);
  const deleteWeekendCoverage = React.useCallback((id) => _deleteWeekendCoverage(id).catch(e => ({ ok:false, error:String(e) })), []);
  const setHoliday          = React.useCallback((args) => _setHoliday(args).catch(e => ({ ok:false, error:String(e) })), []);
  const deleteHoliday       = React.useCallback((id) => _deleteHoliday(id).catch(e => ({ ok:false, error:String(e) })), []);
  const setOncall           = React.useCallback((args) => _setOncall(args).catch(e => ({ ok:false, error:String(e) })), []);
  const deleteOncall        = React.useCallback((wk) => _deleteOncall(wk).catch(e => ({ ok:false, error:String(e) })), []);
  const setEmployee         = React.useCallback((args) => _setEmployee(args).catch(e => ({ ok:false, error:String(e) })), []);
  const deleteEmployee      = React.useCallback((id) => _deleteEmployee(id).catch(e => ({ ok:false, error:String(e) })), []);

  return {
    employees, coverage, events, holidays, tier2, contacts, status, error,
    submitTimeOff, deleteTimeOff,
    setWeekendCoverage, deleteWeekendCoverage,
    setHoliday, deleteHoliday,
    setOncall, deleteOncall,
    setEmployee, deleteEmployee,
  };
}

Object.assign(window, {
  useFirestoreData,
  // expose writers in case other components want to call them directly
  fsAddOrUpdateVacation: _addOrUpdateVacation,
  fsDeleteVacation: _deleteVacation,
  fsSetWeekendCoverage: _setWeekendCoverage,
  fsDeleteWeekendCoverage: _deleteWeekendCoverage,
  fsSetHoliday: _setHoliday,
  fsDeleteHoliday: _deleteHoliday,
  fsSetOncall: _setOncall,
  fsDeleteOncall: _deleteOncall,
});
