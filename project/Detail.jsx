// Detail.jsx — event detail popover + add/edit-request modal (Firestore-backed)

function EventDetail({ event, employees, currentUid, currentUserEmail, isAdmin, onClose, onDelete, onEdit }) {
  if (!event) return null;
  const emp = employees.find(e => e.id === event.employeeId) || { initials:"?", name:event.fullName||"Unknown", role:"" };
  const type = LEAVE_TYPES[event.type] || LEAVE_TYPES.Vacation;
  const isAssignedEmployee = !!emp.email && !!currentUserEmail
    && emp.email.toLowerCase() === currentUserEmail.toLowerCase();
  const canEdit = !!isAdmin || isAssignedEmployee;
  const days = Math.round((event.end - event.start)/86400000) + 1;
  const fmt = (d) => `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]}, ${MONTH_NAMES[d.getMonth()].slice(0,3)} ${d.getDate()}`;
  return ReactDOM.createPortal((
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.20)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:420, background:"var(--bg-surface)", borderRadius:"var(--r-xl)",
        boxShadow:"var(--shadow-modal)", overflow:"hidden"
      }}>
        <div style={{ height:6, background:type.bar }}/>
        <div style={{ padding:"20px 24px 24px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
            <div style={{ width:44, height:44, borderRadius:"var(--r-pill)", background:"var(--tw-blue-100)", color:"var(--tw-blue-800)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:15, fontFamily:"var(--font-ui)" }}>{emp.initials}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"var(--font-ui)", fontWeight:600, fontSize:16, color:"var(--fg-1)" }}>{emp.name}</div>
              <div style={{ fontFamily:"var(--font-ui)", fontSize:13, color:"var(--fg-2)" }}>{emp.roleRaw || emp.role}</div>
            </div>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:"var(--r-pill)", background:type.bg, color:type.fg, fontFamily:"var(--font-ui)", fontSize:12, fontWeight:600 }}>
              <span style={{ width:8, height:8, borderRadius:4, background:type.bar }}/>{type.label}
            </span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, padding:"14px 0", borderTop:"1px solid var(--border-weak)", borderBottom:"1px solid var(--border-weak)" }}>
            <Row label="Starts">{fmt(event.start)}</Row>
            <Row label="Ends">{fmt(event.end)}</Row>
            <Row label="Duration">{days} {days === 1 ? "day" : "days"}</Row>
            <Row label="Status"><span style={{ color:"var(--state-success)", fontWeight:500 }}>Approved</span></Row>
          </div>
          {event.note && (
            <div style={{ padding:"14px 0 4px" }}>
              <div style={{ fontFamily:"var(--font-ui)", fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", color:"var(--fg-2)", marginBottom:4 }}>Note</div>
              <div style={{ fontFamily:"var(--font-body)", fontSize:14, color:"var(--fg-1)", lineHeight:1.5 }}>{event.note}</div>
            </div>
          )}
          {!canEdit && (
            <div style={{ marginTop:14, padding:"8px 12px", background:"var(--bg-page)", border:"1px solid var(--border-weak)", borderRadius:"var(--r-md)", fontFamily:"var(--font-ui)", fontSize:12, color:"var(--fg-2)" }}>
              {`Only ${emp.name} or an admin can edit this entry.`}
            </div>
          )}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:18 }}>
            {canEdit && <button onClick={onDelete} style={outlineBtn(true)}>Delete</button>}
            <button onClick={onClose} style={outlineBtn()}>Close</button>
            {canEdit && <button onClick={() => onEdit && onEdit(event)} style={primaryBtn}>Edit</button>}
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}

function WeekendCoveragePopup({ date, coverage, employees, onClose }) {
  if (!date) return null;
  const cov = coverage[date] || {};
  const empList = employees || window.EMPLOYEES || [];
  const lookupRole = (fullName) => {
    if (!fullName) return "";
    const emp = empList.find(e => (e.fullName || e.name) === fullName)
             || empList.find(e => (e.fullName || e.name || "").toLowerCase() === fullName.toLowerCase());
    return (emp && (emp.roleRaw || emp.role)) || "";
  };
  // Light-mode tint per role — mirrors the dark-app palette
  // (Tier1 #4ade80, Tier2 #64d4f5, Tech Lead #818cf8, Team Lead #fbbf24).
  // Used to tint the NIGHT/DAY chip in each shift row by the assignee's tier.
  const roleChipTint = (role) => {
    const r = (role || "").toLowerCase();
    if (r.includes("tier1") || r.includes("tier 1"))
      return { bg: "var(--role-tier1-bg)",    fg: "var(--role-tier1-fg)",    dot: "var(--role-tier1-fg)"    };
    if (r.includes("tier2") || r.includes("tier 2"))
      return { bg: "var(--role-tier2-bg)",    fg: "var(--role-tier2-fg)",    dot: "var(--role-tier2-fg)"    };
    if (r.includes("tech lead") || r.includes("teach lead"))
      return { bg: "var(--role-techlead-bg)", fg: "var(--role-techlead-fg)", dot: "var(--role-techlead-fg)" };
    if (r.includes("team lead"))
      return { bg: "var(--role-teamlead-bg)", fg: "var(--role-teamlead-fg)", dot: "var(--role-teamlead-fg)" };
    return   { bg: "var(--role-teamlead-bg)", fg: "var(--role-teamlead-fg)", dot: "var(--role-teamlead-fg)" };
  };
  const d = new Date(date + "T00:00:00");
  const dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  const fmtDate = `${dow}, ${MONTH_NAMES[d.getMonth()].slice(0,3)} ${d.getDate()}`;
  const SHIFTS = [
    { id:"night", label:"Night · 11PM – 11AM" },
    { id:"day",   label:"Day · 11AM – 11PM" },
  ];
  return ReactDOM.createPortal((
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.20)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:380, background:"var(--bg-surface)", borderRadius:"var(--r-xl)",
        boxShadow:"var(--shadow-modal)", overflow:"hidden",
        borderTop:"3px solid var(--tw-gold-accent)",
      }}>
        <div style={{ padding:"18px 22px 8px" }}>
          <div style={{
            fontFamily:"var(--font-ui)", fontSize:11, fontWeight:700,
            textTransform:"uppercase", letterSpacing:".08em",
            color:"var(--tw-gold-fg-deep)",
            display:"inline-flex", alignItems:"center", gap:6,
          }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--tw-gold-accent)" }}/>
            Weekend coverage
          </div>
          <div style={{ fontFamily:"var(--font-ui)", fontSize:18, fontWeight:600, color:"var(--fg-1)", marginTop:2 }}>{fmtDate}</div>
        </div>
        <div style={{ padding:"4px 22px 18px" }}>
          {SHIFTS.map(sh => {
            const c = cov[sh.id];
            const role = c ? lookupRole(c.fullName || c.name) : "";
            const chipTint = roleChipTint(role);
            return (
              <div key={sh.id} style={{ padding:"12px 0", borderTop:"1px solid var(--border-weak)" }}>
                <div style={{
                  display:"inline-flex", alignItems:"center", gap:6,
                  padding:"2px 8px", borderRadius:"var(--r-pill)",
                  background: chipTint.bg, color: chipTint.fg,
                  fontFamily:"var(--font-ui)", fontSize:10, fontWeight:700,
                  textTransform:"uppercase", letterSpacing:".06em",
                }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background: chipTint.dot }}/>
                  {sh.label}
                </div>
                {c ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:2, marginTop:6 }}>
                    <div style={{ display:"flex", alignItems:"baseline", gap:10, flexWrap:"wrap" }}>
                      <div style={{ fontFamily:"var(--font-ui)", fontSize:14, fontWeight:500, color:"var(--fg-1)" }}>{c.name}</div>
                      <div style={{ fontFamily:"var(--font-ui)", fontSize:12, color:"var(--fg-2)" }}>{c.start} – {c.end}</div>
                    </div>
                    {role ? (
                      <div style={{ fontFamily:"var(--font-ui)", fontSize:12, color:"var(--fg-2)" }}>{role}</div>
                    ) : null}
                  </div>
                ) : (
                  <div style={{ fontFamily:"var(--font-ui)", fontSize:13, color:"var(--fg-3)", marginTop:6, fontStyle:"italic" }}>No coverage scheduled</div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding:"10px 22px 18px", display:"flex", justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{
            padding:"8px 16px", border:"1px solid var(--border-strong)", borderRadius:"var(--r-md)",
            background:"var(--bg-surface)", color:"var(--fg-1)", fontFamily:"var(--font-ui)", fontSize:13, fontWeight:500, cursor:"pointer"
          }}>Close</button>
        </div>
      </div>
    </div>
  ), document.body);
}

function Row({ label, children }) {
  return (
    <div>
      <div style={{ fontFamily:"var(--font-ui)", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", color:"var(--fg-2)", marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:"var(--font-ui)", fontSize:14, color:"var(--fg-1)" }}>{children}</div>
    </div>
  );
}

function AddRequest({ open, seedDate, editEvent, employees, currentUserEmail, isAdmin, onClose, onSubmit }) {
  // Match the signed-in user to a roster row. First try a stored email,
  // then fall back to comparing the email's local part to a normalized
  // form of the employee's full name (e.g. "bohdan.tril@…" → "Bohdan Tril").
  const matchSelf = () => {
    if (!currentUserEmail) return null;
    const lower = currentUserEmail.toLowerCase();
    const byEmail = employees.find(e => (e.email || "").toLowerCase() === lower);
    if (byEmail) return byEmail;
    const local = lower.split("@")[0]
      .replace(/[._-]+/g, " ").trim();
    return employees.find(e => (e.fullName || "").toLowerCase() === local) || null;
  };
  const selfEmp = matchSelf();
  const firstId = selfEmp ? selfEmp.id : (employees[0]?.id || "");
  const [employeeId, setEmp] = React.useState(firstId);
  const [pickOther, setPickOther] = React.useState(false);
  const [type, setType] = React.useState("Vacation");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errMsg, setErrMsg] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setSubmitting(false); setErrMsg("");
    if (editEvent) {
      setEmp(editEvent.employeeId);
      setPickOther(isAdmin && (!selfEmp || editEvent.employeeId !== selfEmp.id));
      setType(editEvent.type);
      setStart(iso(editEvent.start));
      setEnd(iso(editEvent.end));
      setNote(editEvent.note || "");
    } else {
      const s = seedDate ? iso(seedDate) : iso(new Date());
      setStart(s); setEnd(s); setNote(""); setType("Vacation");
      // Default to self for everyone; admins can opt in to picking another.
      setEmp(firstId);
      setPickOther(false);
    }
  }, [open, seedDate, editEvent, firstId]);

  if (!open) return null;

  const handleSave = async () => {
    setSubmitting(true); setErrMsg("");
    const result = await onSubmit({
      employeeId, type,
      start: new Date(start + "T00:00:00"),
      end:   new Date(end   + "T00:00:00"),
      note,
      existingId: editEvent ? editEvent.id : null,
    });
    setSubmitting(false);
    if (result && result.ok) onClose();
    else setErrMsg((result && result.error) || "Save failed");
  };

  return ReactDOM.createPortal((
    <div onClick={!submitting ? onClose : undefined} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.20)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:440, background:"var(--bg-surface)", borderRadius:"var(--r-xl)", boxShadow:"var(--shadow-modal)", padding:"22px 24px 20px" }}>
        <h3 style={{ margin:"0 0 4px", fontFamily:"var(--font-display)", fontWeight:700, fontSize:20, color:"var(--fg-1)" }}>{editEvent ? "Edit time off" : "Add time off"}</h3>
        <div style={{ fontFamily:"var(--font-ui)", fontSize:13, color:"var(--fg-2)", marginBottom:18 }}>
          {editEvent ? "Changes sync to Firestore in real time." : "This will be saved to Firestore and visible to everyone."}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="Employee">
            {isAdmin && pickOther ? (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <SelectInput value={employeeId} onChange={setEmp} options={employees.map(e=>[e.id, e.fullName || e.name])}/>
                {selfEmp && (
                  <button type="button" onClick={() => { setEmp(selfEmp.id); setPickOther(false); }} style={{
                    alignSelf:"flex-start", border:0, background:"transparent", padding:"2px 0",
                    color:"var(--tw-lime-fg-deep)", fontFamily:"var(--font-button)", fontSize:12,
                    fontWeight:600, cursor:"pointer", textDecoration:"underline",
                    textUnderlineOffset:"2px",
                  }}>← Back to me</button>
                )}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <div style={{
                  padding:"10px 12px", border:"1px solid var(--border-weak)",
                  borderRadius:"var(--r-lg)", background:"var(--bg-page)", color:"var(--fg-1)",
                  fontFamily:"var(--font-ui)", fontSize:14,
                }}>
                  {(selfEmp && (selfEmp.fullName || selfEmp.name)) || currentUserEmail || "—"}
                </div>
                {isAdmin && (
                  <button type="button" onClick={() => setPickOther(true)} style={{
                    alignSelf:"flex-start", border:0, background:"transparent", padding:"2px 0",
                    color:"var(--tw-lime-fg-deep)", fontFamily:"var(--font-button)", fontSize:12,
                    fontWeight:600, cursor:"pointer", textDecoration:"underline",
                    textUnderlineOffset:"2px",
                  }}>Select another employee →</button>
                )}
              </div>
            )}
          </Field>
          <Field label="Type">
            <SelectInput value={type} onChange={setType} options={Object.values(LEAVE_TYPES).map(t=>[t.id, t.label])}/>
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Field label="Start date"><DateInput value={start} onChange={setStart}/></Field>
            <Field label="End date"><DateInput value={end} onChange={setEnd}/></Field>
          </div>
          <Field label="Note" caption="Optional">
            <TextArea value={note} onChange={setNote}/>
          </Field>
        </div>
        {errMsg && (
          <div style={{ marginTop:14, padding:"8px 12px", background:"#FEE2E2", color:"#7F1D1D", borderRadius:"var(--r-md)", fontFamily:"var(--font-ui)", fontSize:13 }}>
            {errMsg}
          </div>
        )}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20 }}>
          <button disabled={submitting} onClick={onClose} style={outlineBtn()}>Cancel</button>
          <button disabled={submitting} onClick={handleSave} style={primaryBtn}>
            {submitting ? "Saving…" : (editEvent ? "Save changes" : "Save request")}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      height:40, padding:"0 12px", border:"1px solid var(--border-strong)",
      borderRadius:"var(--r-lg)", background:"var(--bg-surface)", color:"var(--fg-1)",
      fontFamily:"var(--font-ui)", fontSize:14, outline:"none", cursor:"pointer"
    }}>{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
  );
}
function DateInput({ value, onChange }) {
  return (
    <input type="date" value={value} onChange={e=>onChange(e.target.value)} style={{
      height:40, padding:"0 12px", border:"1px solid var(--border-strong)",
      borderRadius:"var(--r-lg)", background:"var(--bg-surface)", color:"var(--fg-1)",
      fontFamily:"var(--font-ui)", fontSize:14, outline:"none", width:"100%"
    }}/>
  );
}
function TextArea({ value, onChange }) {
  return (
    <textarea value={value} onChange={e=>onChange(e.target.value)} rows={3} style={{
      padding:"10px 12px", border:"1px solid var(--border-strong)",
      borderRadius:"var(--r-lg)", background:"var(--bg-surface)", color:"var(--fg-1)",
      fontFamily:"var(--font-ui)", fontSize:14, outline:"none", resize:"vertical", width:"100%"
    }}/>
  );
}

const primaryBtn = {
  height:36, padding:"0 16px", border:"1px solid transparent",
  background:"var(--action-primary)", color:"var(--fg-on-primary)",
  borderRadius:"var(--r-lg)", fontFamily:"var(--font-button)", fontWeight:500, fontSize:14, cursor:"pointer"
};
const outlineBtn = (destructive=false) => ({
  height:36, padding:"0 14px",
  border:"1px solid var(--border-strong)",
  background:"var(--bg-surface)",
  color: destructive ? "var(--action-destructive)" : "var(--fg-active)",
  borderRadius:"var(--r-lg)", fontFamily:"var(--font-button)", fontWeight:500, fontSize:14, cursor:"pointer"
});

Object.assign(window, { EventDetail, AddRequest });
