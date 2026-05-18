// Manage.jsx — admin panel for editing Tier-2 oncall, weekend coverage,
// and holidays directly in Firestore. Surfaced via a "Manage" button in
// the toolbar; renders as a side sheet.

function ManagePanel({ open, onClose, employees, coverage, holidays, tier2, ops, initialTab }) {
  // Tabs: oncall | weekends | holidays | employees | reports
  // "reports" is admin-only export tooling (e.g. weekend-coverage payroll xlsx).
  const [tab, setTab] = React.useState(initialTab || "oncall");
  // Reset tab to the requested one each time the panel is reopened so a
  // user clicking "Add holiday" lands on the holidays tab regardless of
  // where they were last time.
  React.useEffect(() => { if (open && initialTab) setTab(initialTab); }, [open, initialTab]);
  if (!open) return null;
  return ReactDOM.createPortal((
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.20)", zIndex:60, display:"flex", justifyContent:"flex-end" }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:520, height:"100%", background:"var(--bg-surface)",
        boxShadow:"var(--shadow-modal)", display:"flex", flexDirection:"column",
        fontFamily:"var(--font-ui)"
      }}>
        <div style={{ padding:"18px 22px 0", borderBottom:"1px solid var(--border-weak)" }}>
          <div style={{ display:"flex", alignItems:"center" }}>
            <h3 style={{ margin:0, fontFamily:"var(--font-display)", fontWeight:700, fontSize:20, color:"var(--fg-1)", flex:1 }}>Manage Schedule</h3>
            <button onClick={onClose} style={mpCloseBtn} aria-label="Close">×</button>
          </div>
          <div style={{ display:"flex", gap:4, marginTop:14, flexWrap:"wrap" }}>
            {[["oncall","Tier 2 On-Call"],["weekends","Weekend Coverage"],["holidays","Holidays"],["employees","Employees"],["reports","Reports"]].map(([id,l]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding:"8px 14px", border:0, background:"transparent",
                fontFamily:"var(--font-button)", fontWeight:500, fontSize:13,
                color: tab===id ? "var(--fg-1)" : "var(--fg-2)",
                borderBottom: tab===id ? "2px solid var(--action-primary)" : "2px solid transparent",
                cursor:"pointer", marginBottom:-1,
              }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflow:"auto", padding:"18px 22px 22px" }}>
          {tab === "oncall"    && <OncallEditor    employees={employees} tier2={tier2} ops={ops}/>}
          {tab === "weekends"  && <WeekendEditor   employees={employees} coverage={coverage} ops={ops}/>}
          {tab === "holidays"  && <HolidaysEditor  employees={employees} holidays={holidays} ops={ops}/>}
          {tab === "employees" && <EmployeeEditor  employees={employees} ops={ops}/>}
          {tab === "reports"   && <WeekendReportTab coverage={coverage} holidays={holidays} employees={employees}/>}
        </div>
      </div>
    </div>
  ), document.body);
}

const mpCloseBtn = {
  width:32, height:32, border:"1px solid var(--border-weak)",
  background:"var(--bg-surface)", borderRadius:"var(--r-md)",
  fontSize:20, lineHeight:"24px", cursor:"pointer", color:"var(--fg-2)",
};
const sectionLabel = {
  fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em",
  color:"var(--fg-2)", marginBottom:8,
};
const rowCard = {
  display:"grid", gap:8, padding:"12px 14px", border:"1px solid var(--border-weak)",
  borderRadius:"var(--r-lg)", background:"var(--bg-page)", marginBottom:8,
};
const inlineBtn = (variant="default") => ({
  height:30, padding:"0 10px",
  border: variant==="primary" ? "1px solid var(--action-primary-border)" : "1px solid var(--border-strong)",
  background: variant==="primary" ? "var(--action-primary)" : "var(--bg-surface)",
  color: variant==="primary" ? "var(--fg-on-primary)" : (variant==="danger" ? "var(--action-destructive)" : "var(--fg-active)"),
  borderRadius:"var(--r-md)", fontFamily:"var(--font-button)", fontWeight:500, fontSize:12, cursor:"pointer",
});
const inputStyle = {
  height:34, padding:"0 10px", border:"1px solid var(--border-strong)",
  borderRadius:"var(--r-md)", background:"var(--bg-surface)", color:"var(--fg-1)",
  fontFamily:"var(--font-ui)", fontSize:13, outline:"none",
};

// ---------- Oncall editor ----------

function OncallEditor({ employees, tier2, ops }) {
  const [editing, setEditing] = React.useState(null); // week_start being edited
  const [draft, setDraft] = React.useState({ week_start:"", name:"" });
  const weeks = Object.entries(tier2)
    .map(([wk, v]) => ({ week_start: wk, ...v }))
    .sort((a,b) => a.week_start.localeCompare(b.week_start));

  const startEdit = (row) => { setEditing(row.week_start); setDraft({ week_start: row.week_start, name: row.fullName }); };
  const startNew  = () => { setEditing("__new__"); setDraft({ week_start:"", name: employees[0]?.fullName || "" }); };
  const save = async () => {
    if (!draft.week_start || !draft.name) return;
    await ops.setOncall({ week_start: draft.week_start, name: draft.name });
    setEditing(null);
  };
  const remove = async (wk) => {
    if (!confirm(`Remove on-call assignment for week of ${wk}?`)) return;
    await ops.deleteOncall(wk);
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", marginBottom:10 }}>
        <div style={sectionLabel}>Tier 2 On-Call · {weeks.length} weeks</div>
        <div style={{ flex:1 }}/>
        <button onClick={startNew} style={inlineBtn("primary")}>+ Add Week</button>
      </div>

      {editing === "__new__" && (
        <div style={rowCard}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <input type="date" style={inputStyle} value={draft.week_start} onChange={e => setDraft(d => ({...d, week_start: e.target.value}))}/>
            <select style={inputStyle} value={draft.name} onChange={e => setDraft(d => ({...d, name: e.target.value}))}>
              {employees.map(e => <option key={e.id} value={e.fullName}>{e.fullName}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
            <button onClick={() => setEditing(null)} style={inlineBtn()}>Cancel</button>
            <button onClick={save} style={inlineBtn("primary")}>Save</button>
          </div>
        </div>
      )}

      {weeks.map(row => (
        <div key={row.week_start} style={rowCard}>
          {editing === row.week_start ? (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <input type="date" style={inputStyle} value={draft.week_start} disabled/>
                <select style={inputStyle} value={draft.name} onChange={e => setDraft(d => ({...d, name: e.target.value}))}>
                  {employees.map(e => <option key={e.id} value={e.fullName}>{e.fullName}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                <button onClick={() => setEditing(null)} style={inlineBtn()}>Cancel</button>
                <button onClick={save} style={inlineBtn("primary")}>Save</button>
              </div>
            </>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--fg-1)" }}>Week of {row.week_start}</div>
                <div style={{ fontSize:12, color:"var(--fg-2)" }}>{row.fullName}</div>
              </div>
              <button onClick={() => startEdit(row)} style={inlineBtn()}>Edit</button>
              <button onClick={() => remove(row.week_start)} style={inlineBtn("danger")}>Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Weekend editor ----------

function WeekendEditor({ employees, coverage, ops }) {
  const [editing, setEditing] = React.useState(null);  // "date|slot" or "__new__"
  const [draft, setDraft] = React.useState({ date:"", slot:"day", name:"", start:"11:00", end:"23:00" });
  const rows = [];
  for (const [date, byslot] of Object.entries(coverage)) {
    for (const slot of ["night","day"]) {
      if (byslot[slot]) rows.push({ date, slot, ...byslot[slot] });
    }
  }
  rows.sort((a,b) => a.date.localeCompare(b.date) || (a.slot === "night" ? -1 : 1) - (b.slot === "night" ? -1 : 1));

  const startEdit = (row) => {
    setEditing(`${row.date}|${row.slot}`);
    setDraft({ date: row.date, slot: row.slot, name: row.fullName, start: row.startRaw || "", end: row.endRaw || "" });
  };
  const startNew = () => {
    setEditing("__new__");
    setDraft({ date:"", slot:"day", name: employees[0]?.fullName || "", start:"11:00", end:"23:00" });
  };
  const onSlot = (slot) => setDraft(d => ({
    ...d, slot, start: slot==="night" ? "23:00" : "11:00", end: slot==="night" ? "11:00" : "23:00",
  }));
  const save = async () => {
    if (!draft.date || !draft.name) return;
    await ops.setWeekendCoverage({
      date: draft.date, slot: draft.slot, fullName: draft.name,
      start: draft.start, end: draft.end,
    });
    setEditing(null);
  };
  const remove = async (row) => {
    const docId = row.docId || `${row.date} ${row.slot}`;
    if (!confirm(`Remove ${row.slot} coverage for ${row.date}?`)) return;
    await ops.deleteWeekendCoverage(docId);
  };

  const editor = (locked) => (
    <>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <input type="date" style={inputStyle} value={draft.date} disabled={locked} onChange={e => setDraft(d => ({...d, date: e.target.value}))}/>
        <select style={inputStyle} value={draft.slot} disabled={locked} onChange={e => onSlot(e.target.value)}>
          <option value="day">Day · 11:00–23:00</option>
          <option value="night">Night · 23:00–11:00</option>
        </select>
      </div>
      <select style={inputStyle} value={draft.name} onChange={e => setDraft(d => ({...d, name: e.target.value}))}>
        {employees.map(e => <option key={e.id} value={e.fullName}>{e.fullName}</option>)}
      </select>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <input type="time" style={inputStyle} value={draft.start} onChange={e => setDraft(d => ({...d, start: e.target.value}))}/>
        <input type="time" style={inputStyle} value={draft.end} onChange={e => setDraft(d => ({...d, end: e.target.value}))}/>
      </div>
      <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
        <button onClick={() => setEditing(null)} style={inlineBtn()}>Cancel</button>
        <button onClick={save} style={inlineBtn("primary")}>Save</button>
      </div>
    </>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", marginBottom:10 }}>
        <div style={sectionLabel}>Weekend Coverage · {rows.length} shifts</div>
        <div style={{ flex:1 }}/>
        <button onClick={startNew} style={inlineBtn("primary")}>+ Add Shift</button>
      </div>

      {editing === "__new__" && <div style={rowCard}>{editor(false)}</div>}

      {rows.map(row => {
        const key = `${row.date}|${row.slot}`;
        return (
          <div key={key} style={rowCard}>
            {editing === key ? editor(true) : (
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--fg-1)" }}>{row.date} · {row.start}–{row.end}</div>
                  <div style={{ fontSize:12, color:"var(--fg-2)" }}>{row.fullName}</div>
                </div>
                <button onClick={() => startEdit(row)} style={inlineBtn()}>Edit</button>
                <button onClick={() => remove(row)} style={inlineBtn("danger")}>Delete</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Holidays editor ----------

function HolidaysEditor({ employees, holidays, ops }) {
  const [editing, setEditing] = React.useState(null); // docId | "__new__"
  const [draft, setDraft] = React.useState({ docId:"", name:"", date_start:"", date_end:"", teams_off:"UA", workingRows:[] });
  // De-duplicate by docId — multi-day holidays appear under multiple dates in the map.
  const seen = new Set();
  const rows = [];
  for (const [, list] of Object.entries(holidays)) {
    for (const h of list) {
      const docId = h.docId || `${h.name} ${(h.teams||[]).join("")}`;
      if (seen.has(docId)) continue;
      seen.add(docId);
      rows.push({
        docId,
        date_start: h.date_start || "",
        date_end:   h.date_end   || h.date_start || "",
        name: h.name, teams: h.teams || [],
        workingArr: h.working || [],
      });
    }
  }
  rows.sort((a,b) => a.date_start.localeCompare(b.date_start));

  const startEdit = (row) => {
    const teams = (row.teams && row.teams[0]) || "UA";
    const workingRows = row.workingArr.map(w => {
      const emp = employees.find(e => e.fullName === w.fullName || e.name === w.fullName);
      return {
        employeeId: emp?.id || "",
        fullName: w.fullName || "",
        start: w.startRaw || "",
        end: w.endRaw || "",
      };
    });
    setEditing(row.docId);
    setDraft({ docId: row.docId, name: row.name, date_start: row.date_start, date_end: row.date_end, teams_off: teams, workingRows });
  };
  const startNew = () => {
    setEditing("__new__");
    setDraft({ docId:"", name:"", date_start:"", date_end:"", teams_off:"UA", workingRows:[] });
  };
  const save = async () => {
    if (!draft.name || !draft.date_start || !draft.teams_off) return;
    const workingArr = draft.workingRows
      .filter(r => r.employeeId && r.start && r.end)
      .map(r => {
        const emp = employees.find(e => e.id === r.employeeId);
        const fullName = emp?.fullName || emp?.name || r.fullName || "";
        return { name: fullName, time: `${r.start}-${r.end}` };
      });
    await ops.setHoliday({
      docId: draft.docId || `${draft.name} ${draft.teams_off}`,
      name: draft.name, date_start: draft.date_start, date_end: draft.date_end || draft.date_start,
      teams_off: draft.teams_off, working: workingArr,
    });
    setEditing(null);
  };
  const remove = async (row) => {
    if (!confirm(`Remove holiday "${row.name}"?`)) return;
    await ops.deleteHoliday(row.docId);
  };

  const editor = (lockId) => (
    <>
      <input style={inputStyle} placeholder="Holiday name" value={draft.name} onChange={e => setDraft(d => ({...d, name: e.target.value}))}/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <input type="date" style={inputStyle} value={draft.date_start} onChange={e => setDraft(d => ({...d, date_start: e.target.value}))} title="From"/>
        <input type="date" style={inputStyle} value={draft.date_end} onChange={e => setDraft(d => ({...d, date_end: e.target.value}))} title="To (leave same for single day)"/>
      </div>
      <select style={inputStyle} value={draft.teams_off} onChange={e => setDraft(d => ({...d, teams_off: e.target.value}))}>
        <option value="UA">Ukraine (UA)</option>
        <option value="MX">Mexico (MX)</option>
        <option value="CN">China (CN)</option>
      </select>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", color:"var(--fg-3)" }}>Working coverage</div>
        <div style={{
          display:"flex", alignItems:"center", gap:8,
          padding:"7px 10px",
          background:"#FFF8E1", border:"1px solid #F2D67E", borderRadius:"var(--r-input)",
          color:"#7A5400", fontSize:11, lineHeight:1.35,
        }}>
          <span aria-hidden style={{
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            width:14, height:14, borderRadius:"50%",
            background:"#F2B100", color:"#3E2A00", fontWeight:700, fontSize:10, flexShrink:0,
          }}>!</span>
          <span>Please use <strong>EST</strong> time zone for working coverage hours.</span>
        </div>
        {draft.workingRows.length === 0 && (
          <div style={{ fontSize:12, color:"var(--fg-3)", fontStyle:"italic", padding:"4px 0" }}>No coverage scheduled</div>
        )}
        {draft.workingRows.map((r, idx) => (
          <div key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 88px 88px auto", gap:6, alignItems:"center" }}>
            <select style={inputStyle} value={r.employeeId} onChange={e => {
              const employeeId = e.target.value;
              setDraft(d => {
                const rows = [...d.workingRows];
                rows[idx] = { ...rows[idx], employeeId };
                return { ...d, workingRows: rows };
              });
            }}>
              <option value="">Select employee…</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullName || emp.name}</option>
              ))}
            </select>
            <input style={inputStyle} type="time" value={r.start} onChange={e => {
              const start = e.target.value;
              setDraft(d => { const rows = [...d.workingRows]; rows[idx] = {...rows[idx], start}; return {...d, workingRows: rows}; });
            }}/>
            <input style={inputStyle} type="time" value={r.end} onChange={e => {
              const end = e.target.value;
              setDraft(d => { const rows = [...d.workingRows]; rows[idx] = {...rows[idx], end}; return {...d, workingRows: rows}; });
            }}/>
            <button onClick={() => {
              setDraft(d => ({ ...d, workingRows: d.workingRows.filter((_, i) => i !== idx) }));
            }} style={inlineBtn("danger")} aria-label="Remove">×</button>
          </div>
        ))}
        <button onClick={() => {
          setDraft(d => ({ ...d, workingRows: [...d.workingRows, { employeeId:"", start:"09:00", end:"17:00" }] }));
        }} style={{ ...inlineBtn(), alignSelf:"flex-start" }}>+ Add Person</button>
      </div>
      <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
        <button onClick={() => setEditing(null)} style={inlineBtn()}>Cancel</button>
        <button onClick={save} style={inlineBtn("primary")}>Save</button>
      </div>
    </>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", marginBottom:10 }}>
        <div style={sectionLabel}>Holidays · {rows.length}</div>
        <div style={{ flex:1 }}/>
        <button onClick={startNew} style={inlineBtn("primary")}>+ Add Holiday</button>
      </div>

      {editing === "__new__" && <div style={rowCard}>{editor(false)}</div>}

      {rows.map(row => (
        <div key={row.docId} style={rowCard}>
          {editing === row.docId ? editor(true) : (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--fg-1)" }}>{row.name} <span style={{ color:"var(--fg-3)", fontWeight:400 }}>· {(row.teams||[]).join(", ")}</span></div>
                <div style={{ fontSize:12, color:"var(--fg-2)" }}>
                  {row.date_start}{row.date_end && row.date_end !== row.date_start ? ` – ${row.date_end}` : ""}
                  {row.workingArr.length ? ` · ${row.workingArr.length} working` : ""}
                </div>
              </div>
              <button onClick={() => startEdit(row)} style={inlineBtn()}>Edit</button>
              <button onClick={() => remove(row)} style={inlineBtn("danger")}>Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Employees editor ----------

const EMPLOYEE_ROLES = [
  "Pro-Support Tier1 Trainee",
  "Pro-Support Tier1",
  "Pro-Support Tier2",
  "Pro-Support Tech Lead",
  "Pro-Support Team Lead",
];
const EMPLOYEE_TEAMS = ["UA", "MX", "CN"];

// Turn an IANA timezone string ("Asia/Shanghai", "Europe/Kyiv", "America/New_York")
// into a short label suitable for inline display ("CST", "EET", "EST").
// Uses Intl with timeZoneName:"short" to ask the platform what the abbreviation
// is on a fixed reference date — that side-steps DST surprises across years.
// Returns the empty string for falsy input so callers can OR-fallback.
function _tzShort(iana) {
  if (!iana) return "";
  try {
    const ref = new Date("2026-06-15T12:00:00Z"); // mid-year, post-DST switches
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: iana, timeZoneName: "short", hour: "numeric",
    }).formatToParts(ref);
    const tzn = parts.find(p => p.type === "timeZoneName");
    return (tzn && tzn.value) || "";
  } catch {
    return "";
  }
}

function EmployeeEditor({ employees, ops }) {
  // editing key: doc id (= full name) of an existing row, or "__new__"
  const [editing, setEditing] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState(null);

  const blankDraft = () => ({
    originalId: "",
    name: "", email: "", role: EMPLOYEE_ROLES[1], team: "UA",
    start: "", end: "", slack_url: "",
    birthday: "", career_start: "",
  });

  const startEdit = (emp) => {
    setErr(null);
    setEditing(emp.fullName);
    setDraft({
      originalId: emp.fullName,
      name: emp.fullName || "",
      email: emp.email || "",
      role: emp.roleRaw || "",
      team: emp.team || "UA",
      start: emp.start || "",
      end: emp.end || "",
      slack_url: emp.slackUrl || "",
      birthday: emp.birthday || "",
      career_start: emp.careerStart || "",
    });
  };
  const startNew = () => { setErr(null); setEditing("__new__"); setDraft(blankDraft()); };
  const cancel   = () => { setEditing(null); setDraft(null); setErr(null); };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { setErr("Full name is required."); return; }
    setSaving(true);
    setErr(null);
    const r = await ops.setEmployee({
      originalId: draft.originalId,
      name: draft.name.trim(),
      email: draft.email.trim(),
      role: draft.role,
      team: draft.team,
      start: draft.start.trim(),
      end: draft.end.trim(),
      slack_url: draft.slack_url.trim(),
      birthday: draft.birthday.trim(),
      career_start: draft.career_start.trim(),
    });
    setSaving(false);
    if (!r || r.ok === false) { setErr(r?.error || "Save failed."); return; }
    cancel();
  };

  const remove = async (emp) => {
    if (!confirm(`Remove ${emp.fullName} from the roster?`)) return;
    const r = await ops.deleteEmployee(emp.fullName);
    if (r && r.ok === false) alert(r.error || "Delete failed.");
  };

  const set = (k) => (e) => setDraft(d => ({ ...d, [k]: e.target.value }));

  const editor = (
    <>
      <input style={inputStyle} placeholder="Full employee's name" value={draft?.name || ""} onChange={set("name")}/>
      <input style={inputStyle} placeholder="Teamwork employee's email" value={draft?.email || ""} onChange={set("email")}/>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8 }}>
        <select style={inputStyle} value={draft?.role || ""} onChange={set("role")}>
          {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          {/* Allow keeping a legacy role that's not in the new list */}
          {draft?.role && !EMPLOYEE_ROLES.includes(draft.role) && (
            <option value={draft.role}>{draft.role} (current)</option>
          )}
        </select>
        <select style={inputStyle} value={draft?.team || "UA"} onChange={set("team")}>
          {EMPLOYEE_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <input style={inputStyle} placeholder="Time of shift starts, EST" value={draft?.start || ""} onChange={set("start")}/>
        <input style={inputStyle} placeholder="Time of shift ends, EST" value={draft?.end || ""} onChange={set("end")}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <input style={inputStyle} placeholder="Birthday (DD/MM)" value={draft?.birthday || ""} onChange={set("birthday")}/>
        <input style={inputStyle} placeholder="Date of Employment (YYYY-MM-DD)" value={draft?.career_start || ""} onChange={set("career_start")}/>
      </div>
      <input style={inputStyle} placeholder="URL for Slack profile" value={draft?.slack_url || ""} onChange={set("slack_url")}/>
      {err && (
        <div style={{ fontSize:12, color:"var(--action-destructive)", padding:"4px 0" }}>{err}</div>
      )}
      <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
        <button onClick={cancel} style={inlineBtn()} disabled={saving}>Cancel</button>
        <button onClick={save} style={inlineBtn("primary")} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );

  // Sort the list by full name for predictable scanning.
  const sorted = [...employees].sort((a,b) => a.fullName.localeCompare(b.fullName));

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", marginBottom:10 }}>
        <div style={sectionLabel}>Employees · {sorted.length}</div>
        <div style={{ flex:1 }}/>
        <button onClick={startNew} style={inlineBtn("primary")}>+ Add Employee</button>
      </div>

      {editing === "__new__" && <div style={rowCard}>{editor}</div>}

      {sorted.map(emp => (
        <div key={emp.id} style={rowCard}>
          {editing === emp.fullName ? editor : (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--fg-1)" }}>
                  {emp.fullName}
                  <span style={{ color:"var(--fg-3)", fontWeight:400, marginLeft:8 }}>· {emp.team || "—"}</span>
                </div>
                <div style={{ fontSize:12, color:"var(--fg-2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {emp.roleRaw || "—"}{emp.start && emp.end ? ` · ${emp.start}–${emp.end} ${_tzShort(emp.timezone) || "EST"}` : ""}
                </div>
                {(emp.birthday || emp.careerStart) && (
                  <div style={{ fontSize:12, color:"var(--fg-3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {emp.birthday ? `🎂 ${emp.birthday}` : ""}
                    {emp.birthday && emp.careerStart ? " · " : ""}
                    {emp.careerStart ? `Joined ${emp.careerStart}` : ""}
                  </div>
                )}
              </div>
              <button onClick={() => startEdit(emp)} style={inlineBtn()}>Edit</button>
              <button onClick={() => remove(emp)} style={inlineBtn("danger")}>Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { ManagePanel });
