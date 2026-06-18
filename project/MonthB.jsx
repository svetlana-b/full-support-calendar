// MonthB.jsx — Direction B: Employee swimlanes
// Rows are people, columns are days. Each row shows a single continuous
// timeline where that person's time-off events appear as colored bars.
// Great for quickly scanning who is out when, week to week.

function MonthB({ monthDate, events, employees = EMPLOYEES, coverage, holidays = HOLIDAYS, employeeFilter, typeFilter, onOpenEvent, onAddAt }) {
  const first = startOfMonth(monthDate);
  const last  = endOfMonth(monthDate);
  const days = [];
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) days.push(new Date(d));

  const visibleEmps = employees.filter(e => employeeFilter === "all" || e.id === employeeFilter);
  const visibleTypes = (t) => typeFilter === "all" || t === typeFilter;

  const NAME_W = 180;
  const DAY_W = `minmax(28px, 1fr)`;

  return (
    <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-weak)", borderRadius:"var(--r-lg)", overflow:"hidden" }}>
      {/* header */}
      <div style={{ display:"grid", gridTemplateColumns:`${NAME_W}px repeat(${days.length}, ${DAY_W})`,
        background:"var(--bg-page)", borderBottom:"1px solid var(--border-weak)" }}>
        <div style={{ padding:"10px 14px", fontFamily:"var(--font-ui)", fontSize:11, fontWeight:600,
          textTransform:"uppercase", letterSpacing:".08em", color:"var(--fg-2)",
          borderRight:"1px solid var(--border-weak)" }}>Team member</div>
        {days.map((d,i) => {
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          const today = sameDay(d, TODAY);
          return (
            <div key={i} style={{
              padding:"6px 0 8px", textAlign:"center",
              background: weekend ? "var(--tw-gray-6)" : "transparent",
              borderRight:"1px solid var(--border-weak)",
              fontFamily:"var(--font-ui)", lineHeight:1.1
            }}>
              <div style={{ fontSize:9, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", color:"var(--fg-2)" }}>
                {["S","M","T","W","T","F","S"][d.getDay()]}
              </div>
              <div style={{
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                width:22, height:22, borderRadius:"var(--r-pill)",
                marginTop:2,
                fontSize:12, fontWeight: today ? 700 : 500,
                background: today ? "var(--action-primary)" : "transparent",
                color: today ? "var(--fg-on-primary)" : "var(--fg-1)"
              }}>{d.getDate()}</div>
              <HolidayMarker items={holidays[iso(d)]}/>
            </div>
          );
        })}
      </div>

      {visibleEmps.map((emp, ri) => {
        const empEvents = events.filter(e => e.employeeId === emp.id && visibleTypes(e.type));
        const empTint = roleAvatarTint(emp.roleRaw || emp.role);
        return (
          <div key={emp.id} style={{ display:"grid",
            gridTemplateColumns:`${NAME_W}px repeat(${days.length}, ${DAY_W})`,
            borderBottom: ri < visibleEmps.length - 1 ? "1px solid var(--border-weak)" : "none",
            position:"relative", minHeight:52
          }}>
            <div style={{ padding:"10px 14px", borderRight:"1px solid var(--border-weak)", display:"flex", alignItems:"center", gap:10, background:"var(--bg-surface)" }}>
              <div style={{ width:28, height:28, borderRadius:"var(--r-pill)", background: empTint.bg, border: `1px solid ${empTint.border}`, color: empTint.fg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:11, fontFamily:"var(--font-ui)" }}>{emp.initials}</div>
              <div style={{ lineHeight:1.25, minWidth:0 }}>
                <div style={{ fontFamily:"var(--font-name)", fontSize:13, fontWeight:500, color:"var(--fg-1)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{emp.name}</div>
                <div style={{ fontFamily:"var(--font-ui)", fontSize:11, color:"var(--fg-2)" }}>{emp.roleRaw || emp.role}</div>
              </div>
            </div>
            {days.map((d,i) => {
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              const today = sameDay(d, TODAY);
              return (
                <div key={i} onClick={() => onAddAt(d, emp.id)} style={{
                  borderRight:"1px solid var(--border-weak)",
                  background: today ? "rgba(0,97,255,0.05)" : weekend ? "var(--tw-gray-6)" : "var(--bg-surface)",
                  cursor:"pointer"
                }}/>
              );
            })}
            {/* event overlay */}
            <div style={{ position:"absolute", top:10, bottom:10, left:NAME_W, right:0, pointerEvents:"none" }}>
              {empEvents.map(ev => {
                const s = ev.start < first ? first : ev.start;
                const e = ev.end   > last  ? last  : ev.end;
                if (e < first || s > last) return null;
                const startIdx = Math.round((new Date(s.getFullYear(),s.getMonth(),s.getDate()) - first)/86400000);
                const endIdx   = Math.round((new Date(e.getFullYear(),e.getMonth(),e.getDate()) - first)/86400000);
                const leftPct = (startIdx / days.length) * 100;
                const widthPct = ((endIdx - startIdx + 1) / days.length) * 100;
                const type = LEAVE_TYPES[ev.type];
                const continuesLeft = ev.start < first;
                const continuesRight = ev.end > last;
                const isGolden = !!ev.golden;
                return (
                  <div key={ev.id} onClick={(e)=>{ e.stopPropagation(); onOpenEvent(ev); }}
                    title={`${type.label} · ${ev.note || ""}`}
                    style={{
                      position:"absolute",
                      left: `calc(${leftPct}% + 3px)`,
                      width: `calc(${widthPct}% - 6px)`,
                      top:0, bottom:0,
                      background: isGolden ? "var(--role-teamlead-bg)" : type.bg,
                      color: isGolden ? "var(--role-teamlead-fg)" : type.fg,
                      border: isGolden ? "2px solid var(--role-teamlead-border)" : `1px solid ${type.bar}`,
                      borderRadius: 4,
                      padding:"0 10px",
                      display:"flex", alignItems:"center", gap:5,
                      fontFamily:"var(--font-ui)", fontSize:11, fontWeight:600,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      cursor:"pointer", pointerEvents:"auto",
                    }}>
                    {isGolden ? <span style={{ flexShrink:0 }}>★</span> : (type.icon ? <img src={type.icon} alt="" aria-hidden width={14} height={14} style={{ flexShrink:0, objectFit:"contain", display:"block" }}/> : null)}
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", fontWeight:700 }}>{type.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { MonthB });
