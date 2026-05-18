// WeekendSignup.jsx — modal for picking up weekend coverage shifts.
// Adapted from the standalone shift-signup app: same Firestore "weekends"
// schema (date, day_type, name, start, end, holds), same hold/claim/release
// flow, but rendered as a React modal that piggybacks on the calendar's
// already-authenticated user. No login screen — the parent passes
// `currentUser`. Uses the modular Firebase SDK (window.fb / window.fbDb).

const WS_MONTH_NAMES = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"];
const WS_WEEKS_AHEAD = 48;
const WS_HOLD_TTL_MS = 5 * 60 * 1000;

function _wsParseYMD(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { year: y, month: m, day: d };
}
function _wsYmdToDisplay(ymd) {
  if (!ymd) return "";
  const { year, month, day } = _wsParseYMD(ymd);
  return `${WS_MONTH_NAMES[month - 1]} ${day}, ${year}`;
}
function _wsKeyToDayType(key) { return key === "sat" ? "saturday" : "sunday"; }
function _wsMakeDocId(dateYMD, shiftType) { return `${dateYMD} ${shiftType}`; }

function _wsGenerateUpcomingWeekends() {
  const sats = [];
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = start.getUTCDay();
  const daysBack = (dow === 6) ? 0 : (dow + 1);
  start.setUTCDate(start.getUTCDate() - daysBack);
  for (let i = 0; i < WS_WEEKS_AHEAD; i++) {
    const sat = new Date(start);
    sat.setUTCDate(start.getUTCDate() + i * 7);
    sats.push(`${sat.getUTCFullYear()}-${String(sat.getUTCMonth()+1).padStart(2,"0")}-${String(sat.getUTCDate()).padStart(2,"0")}`);
  }
  return sats;
}

function _wsBuildEntries(byDate) {
  const empty = () => ({ person:"", docId:null, holds:{} });
  const upcoming = _wsGenerateUpcomingWeekends();
  const fsSats = Object.keys(byDate).filter(d => byDate[d].saturday);
  const allSats = [...new Set([...upcoming, ...fsSats])].sort();
  const entries = [];
  for (const satYMD of allSats) {
    const { year, month, day } = _wsParseYMD(satYMD);
    const satObj = new Date(Date.UTC(year, month-1, day));
    const sunObj = new Date(satObj); sunObj.setUTCDate(sunObj.getUTCDate()+1);
    const sunYMD = `${sunObj.getUTCFullYear()}-${String(sunObj.getUTCMonth()+1).padStart(2,"0")}-${String(sunObj.getUTCDate()).padStart(2,"0")}`;
    const satSlots = (byDate[satYMD] && byDate[satYMD].saturday) || {};
    const sunSlots = (byDate[sunYMD] && byDate[sunYMD].sunday)   || {};
    entries.push({
      weekLabel: `${satYMD}+${sunYMD}`, satDate: satYMD, sunDate: sunYMD,
      shifts: {
        sat: { night: satSlots.night || empty(), day: satSlots.day || empty() },
        sun: { night: sunSlots.night || empty(), day: sunSlots.day || empty() },
      },
    });
  }
  return entries;
}

function WeekendSignup({ open, onClose, currentUser }) {
  const myName = (currentUser && (currentUser.displayName || (currentUser.email||"").split("@")[0])) || "";
  const [allShifts, setAllShifts] = React.useState([]);
  const [monthIdx, setMonthIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(null); // {weekLabel, day, shiftType, action}
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    if (!open || !window.__firebaseReady) return;
    const { fbDb, fb } = window;
    const unsub = fb.onSnapshot(fb.collection(fbDb, "weekends"), (snap) => {
      const byDate = {};
      snap.forEach(doc => {
        const d = doc.data();
        if (!d.date || !d.day_type) return;
        const shiftType = d.start === "23:00" ? "night" : "day";
        if (!byDate[d.date]) byDate[d.date] = {};
        if (!byDate[d.date][d.day_type]) byDate[d.date][d.day_type] = {};
        byDate[d.date][d.day_type][shiftType] = {
          person: d.name || "", docId: doc.id, holds: d.holds || {},
        };
      });
      setAllShifts(_wsBuildEntries(byDate));
    });
    return () => { try { unsub(); } catch {} };
  }, [open]);

  const months = React.useMemo(() => {
    const groups = {}; const order = [];
    allShifts.forEach(e => {
      const { year, month } = _wsParseYMD(e.satDate);
      const label = `${WS_MONTH_NAMES[month-1]} ${year}`;
      if (!groups[label]) { groups[label] = []; order.push(label); }
      groups[label].push(e);
    });
    return { groups, order };
  }, [allShifts]);

  const currentMonth = months.order[Math.min(monthIdx, months.order.length-1)];
  const weekends = (currentMonth && months.groups[currentMonth]) || [];

  const showToast = (msg, type="") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const writeHold = async (entry, day, shiftType) => {
    const { fbDb, fb } = window;
    const slot = entry.shifts[day][shiftType];
    const dateYMD = day === "sat" ? entry.satDate : entry.sunDate;
    const docId = slot.docId || _wsMakeDocId(dateYMD, shiftType);
    const ref = fb.doc(fbDb, "weekends", docId);
    try {
      const snap = await fb.getDoc(ref);
      if (!snap.exists()) {
        await fb.setDoc(ref, {
          date: dateYMD, day_type: _wsKeyToDayType(day), name: "",
          start: shiftType === "night" ? "23:00" : "11:00",
          end:   shiftType === "night" ? "11:00" : "23:00",
          holds: { [myName]: fb.serverTimestamp() },
        });
      } else if (!snap.data().name) {
        await fb.updateDoc(ref, { [`holds.${myName}`]: fb.serverTimestamp() });
      }
    } catch (e) { console.warn("hold failed:", e.message); }
  };
  const clearHold = async (entry, day, shiftType) => {
    const { fbDb, fb } = window;
    const slot = entry.shifts[day][shiftType];
    const dateYMD = day === "sat" ? entry.satDate : entry.sunDate;
    const docId = slot.docId || _wsMakeDocId(dateYMD, shiftType);
    const ref = fb.doc(fbDb, "weekends", docId);
    try {
      const snap = await fb.getDoc(ref);
      if (!snap.exists()) return;
      const d = snap.data();
      if (!d.holds || !d.holds[myName]) return;
      const remaining = Object.keys(d.holds).filter(k => k !== myName).length;
      if (!d.name && remaining === 0) await fb.deleteDoc(ref);
      else await fb.updateDoc(ref, { [`holds.${myName}`]: fb.deleteField() });
    } catch (e) { console.warn("clearHold:", e.message); }
  };

  const onSlotClick = async (entry, day, shiftType) => {
    if (!myName) { showToast("Could not determine your name — please sign out and back in.", "error"); return; }
    const slot = entry.shifts[day][shiftType];
    if (slot.person === myName) {
      setSelected({ weekLabel: entry.weekLabel, day, shiftType, entry, action: "release" });
      setConfirming(true);
      return;
    }
    if (slot.person) return;
    if (selected && selected.action === "claim" &&
        selected.weekLabel === entry.weekLabel && selected.day === day && selected.shiftType === shiftType) {
      await clearHold(entry, day, shiftType);
      setSelected(null); return;
    }
    if (selected && selected.action === "claim") {
      await clearHold(selected.entry, selected.day, selected.shiftType);
    }
    setSelected({ weekLabel: entry.weekLabel, day, shiftType, entry, action: "claim" });
    await writeHold(entry, day, shiftType);
  };

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    const { fbDb, fb } = window;
    const { entry, day, shiftType, action } = selected;
    const dateYMD = day === "sat" ? entry.satDate : entry.sunDate;
    const slot = entry.shifts[day][shiftType];
    const docId = slot.docId || _wsMakeDocId(dateYMD, shiftType);
    const ref = fb.doc(fbDb, "weekends", docId);
    try {
      await fb.runTransaction(fbDb, async (txn) => {
        const snap = await txn.get(ref);
        if (action === "claim") {
          if (!snap.exists()) {
            txn.set(ref, {
              date: dateYMD, day_type: _wsKeyToDayType(day), name: myName,
              start: shiftType === "night" ? "23:00" : "11:00",
              end:   shiftType === "night" ? "11:00" : "23:00",
              claimed_at: fb.serverTimestamp(),
              claimed_by_email: (currentUser && currentUser.email) || null,
            });
          } else {
            const d = snap.data();
            if (d.name && d.name !== "") throw new Error("Shift already taken by " + d.name);
            txn.update(ref, {
              name: myName,
              holds: {},
              claimed_at: fb.serverTimestamp(),
              claimed_by_email: (currentUser && currentUser.email) || null,
            });
          }
        } else {
          if (snap.exists() && snap.data().name !== myName) throw new Error("You can only release your own shift");
          txn.delete(ref);
        }
      });
      showToast(action === "claim" ? "✓ Shift claimed!" : "✓ Shift released.", "success");
      setSelected(null); setConfirming(false);
    } catch (e) { showToast("Error: " + e.message, "error"); }
    finally { setBusy(false); }
  };

  const closeAll = async () => {
    if (selected && selected.action === "claim") {
      await clearHold(selected.entry, selected.day, selected.shiftType);
    }
    setSelected(null); setConfirming(false); onClose && onClose();
  };

  if (!open) return null;

  return ReactDOM.createPortal((
    <div onClick={closeAll} style={{
      position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 20px",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"var(--bg-surface)", border:"1px solid var(--border-weak)",
        borderRadius:"var(--r-xl)", width:"min(720px, 100%)",
        boxShadow:"0 20px 60px rgba(15,23,42,0.25)", fontFamily:"var(--font-ui)",
        display:"flex", flexDirection:"column", height:"calc(100vh - 48px)", minHeight:0,
      }}>
        <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--border-weak)", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:600, color:"var(--fg-1)" }}>Weekend Shift Sign-Up</div>
          </div>
          <button onClick={closeAll} style={{
            width:32, height:32, border:"1px solid var(--border-weak)",
            background:"var(--bg-surface)", borderRadius:"var(--r-md)",
            fontSize:18, lineHeight:"24px", cursor:"pointer", color:"var(--fg-2)",
          }} aria-label="Close">×</button>
        </div>

        <div style={{ padding:"10px 22px", background:"var(--shift-warning-bg)", borderBottom:"1px solid var(--shift-warning-border)", color:"var(--shift-warning-fg)", fontSize:12, fontWeight:600 }}>
          ⚠ Shift pick-up starts on the 23rd at 4 PM EST. Do NOT pick up shifts earlier — they will be removed.
        </div>

<div style={{ padding:"10px 22px", borderBottom:"1px solid var(--border-weak)", fontSize:12, color:"var(--fg-2)", gap:12 }}>
     ℹ️ Sign-ups open on the 23rd of each month at 4PM EST. If it’s a weekend, shift should be taken the next business day.
     Please note that only 1 weekend shift can be assigned to one person on the 23rd. The rest of weekend shifts can be assigned only on the next business day.</div>

        <div style={{ padding:"16px 22px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid var(--border-weak)" }}>
          <button onClick={() => setMonthIdx(i => Math.max(0, i-1))} disabled={monthIdx <= 0} style={wsNavBtn}>‹</button>
          <div style={{ flex:1, fontSize:15, fontWeight:600, color:"var(--fg-1)" }}>{currentMonth || "Loading…"}</div>
          <button onClick={() => setMonthIdx(i => Math.min(months.order.length-1, i+1))} disabled={monthIdx >= months.order.length-1} style={wsNavBtn}>›</button>
        </div>

        <div style={{ flex:1, minHeight:0, overflowY:"auto", padding:"16px 22px 22px", display:"flex", flexDirection:"column", gap:12 }}>
          {weekends.length === 0 ? (
            <div style={{ textAlign:"center", color:"var(--fg-3)", fontSize:13, padding:24 }}>No weekend shifts found.</div>
          ) : weekends.map(entry => (
            <WSWeekend key={entry.weekLabel} entry={entry} myName={myName} selected={selected}
              onSlotClick={onSlotClick} onConfirm={() => setConfirming(true)}/>
          ))}
        </div>
      </div>

      {confirming && selected && (
        <div onClick={e=>{ e.stopPropagation(); setConfirming(false); }} style={{
          position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:1100,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20,
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"var(--bg-surface)", border:"1px solid var(--border-weak)",
            borderRadius:"var(--r-lg)", width:"min(420px, 100%)", padding:24,
          }}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>
              {selected.action === "release" ? "Release shift?" : "Confirm your shift"}
            </div>
            <div style={{ fontSize:13, color:"var(--fg-2)", marginBottom:14, lineHeight:1.5 }}>
              {selected.action === "release"
                ? "This will free up the shift for someone else."
                : "Please review the details. This will be written to Firestore."}
            </div>
            <div style={{
              background:"var(--bg-page)", borderRadius:"var(--r-md)", border:"1px solid var(--border-weak)",
              padding:"12px 14px", fontSize:13, marginBottom:18, lineHeight:1.7,
            }}>
              <div><strong>Employee:</strong> {myName}</div>
              <div><strong>Date:</strong> {_wsYmdToDisplay(selected.day === "sat" ? selected.entry.satDate : selected.entry.sunDate)}</div>
              <div><strong>Day:</strong> {selected.day === "sat" ? "Saturday" : "Sunday"}</div>
              <div><strong>Shift:</strong> {selected.shiftType === "night" ? "11PM–11AM (Night)" : "11AM–11PM (Day)"}</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setConfirming(false)} disabled={busy} style={wsCancelBtn}>Cancel</button>
              <button onClick={submit} disabled={busy} style={wsConfirmBtn}>
                {busy ? "Saving…" : (selected.action === "release" ? "Release shift" : "Confirm sign-up")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          background: toast.type === "error" ? "#7F1D1D" : (toast.type === "success" ? "#166534" : "#1F2937"),
          color:"#fff", padding:"10px 18px", borderRadius:20, fontSize:13, zIndex:1200,
        }}>{toast.msg}</div>
      )}
    </div>
  ), document.body);
}

function WSWeekend({ entry, myName, selected, onSlotClick, onConfirm }) {
  return (
    <div style={{ border:"1px solid var(--border-weak)", borderRadius:"var(--r-lg)", overflow:"hidden", flexShrink:0 }}>
      <div style={{
        padding:"10px 14px", background:"var(--bg-page)",
        borderBottom:"1px solid var(--border-weak)",
        fontSize:13, fontWeight:600, color:"var(--fg-1)",
      }}>
        {_wsYmdToDisplay(entry.satDate)} — {_wsYmdToDisplay(entry.sunDate)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
        <div style={{ padding:"12px 14px", borderRight:"1px solid var(--border-weak)" }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", color:"#7C3AED", marginBottom:8 }}>● SATURDAY</div>
          <WSSlot entry={entry} day="sat" shiftType="night" myName={myName} selected={selected} onSlotClick={onSlotClick} onConfirm={onConfirm}/>
          <WSSlot entry={entry} day="sat" shiftType="day"   myName={myName} selected={selected} onSlotClick={onSlotClick} onConfirm={onConfirm}/>
        </div>
        <div style={{ padding:"12px 14px" }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", color:"#C2410C", marginBottom:8 }}>● SUNDAY</div>
          <WSSlot entry={entry} day="sun" shiftType="night" myName={myName} selected={selected} onSlotClick={onSlotClick} onConfirm={onConfirm}/>
          <WSSlot entry={entry} day="sun" shiftType="day"   myName={myName} selected={selected} onSlotClick={onSlotClick} onConfirm={onConfirm}/>
        </div>
      </div>
    </div>
  );
}

function WSSlot({ entry, day, shiftType, myName, selected, onSlotClick, onConfirm }) {
  const slot = entry.shifts[day][shiftType];
  const isNight = shiftType === "night";
  const time = isNight ? "11PM – 11AM" : "11AM – 11PM";
  const isMine = slot.person && slot.person === myName;
  const isTaken = slot.person && !isMine;
  const isEmpty = !slot.person;

  const now = Date.now();
  const activeHolders = Object.entries(slot.holds || {})
    .filter(([, ts]) => { const ms = ts && ts.toMillis ? ts.toMillis() : ts; return ms && (now - ms < WS_HOLD_TTL_MS); })
    .map(([n]) => n);
  const heldByMe = activeHolders.includes(myName);
  const othersHolding = activeHolders.filter(n => n !== myName);
  const heldByOther = isEmpty && othersHolding.length > 0 && !heldByMe;

  const isSelected = isEmpty && selected && selected.action === "claim" &&
    selected.weekLabel === entry.weekLabel && selected.day === day && selected.shiftType === shiftType;

  let bg = "var(--bg-surface)", border = "var(--border-weak)", cursor = "pointer";
  if (isTaken) { bg = "var(--bg-page)"; cursor = "default"; }
  else if (isMine || isSelected || heldByMe) { bg = "var(--tw-blue-50, #EFF6FF)"; border = "var(--tw-blue-700, #1D4ED8)"; }
  else if (heldByOther) { bg = "#FFFBEB"; border = "#F59E0B"; cursor = "default"; }

  const clickable = isEmpty || isMine;

  return (
    <div onClick={clickable ? () => onSlotClick(entry, day, shiftType) : undefined} style={{
      padding:"9px 11px", marginBottom:6, borderRadius:"var(--r-md)",
      border:`1px solid ${border}`, background: bg, cursor,
      opacity: isTaken ? 0.75 : 1,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, fontSize:11 }}>
        <span style={{
          fontSize:9, fontWeight:700, letterSpacing:".06em", padding:"2px 6px", borderRadius:3,
          background: isNight ? "var(--shift-night-bg)" : "var(--shift-day-bg)",
          color:      isNight ? "var(--shift-night-fg)" : "var(--shift-day-fg)",
          border: `1px solid ${isNight ? "var(--shift-night-border)" : "var(--shift-day-border)"}`,
          textTransform:"uppercase",
        }}>{isNight ? "Night" : "Day"}</span>
        <span style={{ fontFamily:"var(--font-mono, monospace)", color:"var(--fg-2)" }}>{time}</span>
      </div>
      {isMine && (<>
        <div style={{ fontFamily:"var(--font-name)", fontSize:13, fontWeight:500 }}>{slot.person}</div>
        <div style={{ fontSize:10, fontWeight:600, color:"var(--tw-blue-700, #1D4ED8)" }}>▸ YOUR SHIFT · tap to release</div>
      </>)}
      {isTaken && <div style={{ fontFamily:"var(--font-name)", fontSize:13, fontWeight:500 }}>{slot.person}</div>}
      {(isSelected || heldByMe) && (<>
        <div style={{ fontFamily:"var(--font-name)", fontSize:13, fontWeight:500, color:"var(--tw-blue-800, #1E40AF)" }}>{myName}</div>
        <div style={{ fontSize:10, fontWeight:700, color:"var(--tw-blue-700, #1D4ED8)" }}>⏳ ON HOLD</div>
        {othersHolding.length > 0 && (
          <div style={{ fontSize:11, color:"#92400E", marginTop:2 }}>
            Also holding: {othersHolding.join(", ")}
          </div>
        )}
        <button onClick={e=>{ e.stopPropagation(); onConfirm(); }} style={{
          marginTop:8, width:"100%", padding:"8px 10px",
          background:"var(--action-primary)", color:"var(--fg-on-primary)",
          border:"1px solid var(--action-primary-border)", borderRadius:"var(--r-md)", cursor:"pointer",
          fontFamily:"var(--font-button)", fontWeight:600, fontSize:12,
        }}>Claim selected shift</button>
      </>)}
      {heldByOther && (<>
        <div style={{ fontSize:13, fontWeight:500, color:"#92400E" }}>
          {othersHolding.join(", ")}
        </div>
        <div style={{ fontSize:10, fontWeight:700, color:"#92400E" }}>⏳ ON HOLD</div>
      </>)}
      {isEmpty && !heldByOther && !isSelected && !heldByMe && (
        <div style={{ fontSize:12, color:"var(--fg-3)", fontStyle:"italic" }}>Available — tap to claim</div>
      )}
    </div>
  );
}

const wsNavBtn = {
  width:32, height:32, border:"1px solid var(--border-weak)",
  background:"var(--bg-surface)", borderRadius:"var(--r-md)",
  fontSize:16, cursor:"pointer", color:"var(--fg-2)",
};
const wsCancelBtn = {
  flex:1, padding:"9px 12px", border:"1px solid var(--border-weak)",
  background:"var(--bg-surface)", borderRadius:"var(--r-md)",
  fontFamily:"var(--font-button)", fontSize:13, fontWeight:500, cursor:"pointer", color:"var(--fg-2)",
};
const wsConfirmBtn = {
  flex:2, padding:"9px 12px", border:"1px solid var(--action-primary-border)", background:"var(--action-primary)",
  color:"var(--fg-on-primary)", borderRadius:"var(--r-md)",
  fontFamily:"var(--font-button)", fontSize:13, fontWeight:600, cursor:"pointer",
};

Object.assign(window, { WeekendSignup });
