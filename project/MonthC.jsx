// MonthC.jsx — Direction C: Ops dashboard
// Left column = "Out today" + "This week" summary panels.
// Right = compact calendar where each day shows chips (initials + type color).

function MonthC({ monthDate, events, employees = EMPLOYEES, coverage = WEEKEND_COVERAGE, holidays = HOLIDAYS, employeeFilter, typeFilter, onOpenEvent, onAddAt, onWeekendCoverageAt }) {
  const weeks = buildMonthGrid(monthDate, 0);
  const visibleEvents = events.filter(e =>
    (employeeFilter === "all" || e.employeeId === employeeFilter) &&
    (typeFilter === "all" || e.type === typeFilter)
  );

  // Out today / this week
  const outToday = visibleEvents.filter(ev => dateInRange(TODAY, ev.start, ev.end));
  const weekStart = startOfWeek(TODAY, 0);
  const weekEnd = addDays(weekStart, 6);
  const outThisWeek = visibleEvents.filter(ev =>
    !(ev.end < weekStart || ev.start > weekEnd)
  );
  // Upcoming next 14d (excluding currently-out)
  const horizon = addDays(TODAY, 14);
  const upcoming = visibleEvents
    .filter(ev => ev.start > TODAY && ev.start <= horizon)
    .sort((a,b) => a.start - b.start);

  // Weekend coverage list for the visible month
  const coverageEntries = Object.entries(coverage)
    .filter(([k]) => {
      const d = new Date(k); return d.getMonth() === monthDate.getMonth() && d.getFullYear() === monthDate.getFullYear();
    });

  // Holidays list for the visible month (flattened — one row per
  // holiday even if multiple share a date).
  const holidayEntries = Object.entries(holidays || {})
    .filter(([k]) => {
      const d = new Date(k + "T00:00:00");
      return d.getMonth() === monthDate.getMonth() && d.getFullYear() === monthDate.getFullYear();
    })
    .flatMap(([k, arr]) => arr.map(h => [k, h]))
    .sort(([a],[b]) => a.localeCompare(b));

  return (
    <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:16 }}>
      {/* LEFT: ops panels */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <OpsPanel title="Out Today" count={outToday.length} accent="#FF8D28">
          {outToday.length === 0 && <EmptyRow>Everyone is in today.</EmptyRow>}
          {outToday.map(ev => <PersonRow key={ev.id} ev={ev} onOpen={()=>onOpenEvent(ev)} showDates={false}/>)}
        </OpsPanel>

        <OpsPanel title="This Week" count={outThisWeek.length}>
          {outThisWeek.length === 0 && <EmptyRow>No one is scheduled off.</EmptyRow>}
          {outThisWeek.map(ev => <PersonRow key={ev.id} ev={ev} onOpen={()=>onOpenEvent(ev)}/>)}
        </OpsPanel>

        <OpsPanel title="Coming Up (14 Days)" count={upcoming.length}>
          {upcoming.length === 0 && <EmptyRow>Nothing pending.</EmptyRow>}
          {upcoming.slice(0, 6).map(ev => <PersonRow key={ev.id} ev={ev} onOpen={()=>onOpenEvent(ev)}/>)}
        </OpsPanel>

        <OpsPanel title="Holidays This Month" count={holidayEntries.length}>
          {holidayEntries.length === 0 && <EmptyRow>No holidays.</EmptyRow>}
          {holidayEntries.map(([k, h], i) => {
            const d = new Date(k + "T00:00:00");
            return (
              <div key={k+i} style={{ padding:"10px 14px",
                borderTop: i>0 ? "1px solid var(--border-weak)" : "none",
                display:"flex", alignItems:"flex-start", gap:10 }}>
                <div style={{ fontFamily:"var(--font-ui)", fontSize:11, fontWeight:600,
                  color:"var(--fg-2)", minWidth:46, fontVariantNumeric:"tabular-nums" }}>
                  {MONTH_NAMES[d.getMonth()].slice(0,3)} {d.getDate()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"var(--font-ui)", fontSize:13, fontWeight:500,
                    color:"var(--fg-1)", lineHeight:1.3 }}>{h.name}</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:4 }}>
                    {h.teams.map(t => {
                      const tint = COUNTRY_TINT[t] || {};
                      const c = COUNTRIES[t];
                      return (
                        <span key={t} style={{
                          display:"inline-flex", alignItems:"center",
                          padding:"2px 6px", borderRadius:4,
                          background: tint.bg, border:`1px solid ${tint.border}`, color: tint.fg,
                          fontFamily:"var(--font-ui)", fontSize:10, fontWeight:600, letterSpacing:".02em"
                        }}>
                          {c?.name || t}
                        </span>
                      );
                    })}
                  </div>
                  {h.working && h.working.length > 0 && (
                    <div style={{ fontFamily:"var(--font-ui)", fontSize:11, color:"var(--fg-3)",
                      marginTop:6, lineHeight:1.4 }}>
                      Coverage: {h.working.map(w => w.name || w.fullName).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </OpsPanel>

        <OpsPanel title="Weekend Coverage">
          {coverageEntries.length === 0 && <EmptyRow>No coverage set.</EmptyRow>}
          {coverageEntries.map(([k, cov]) => {
            const d = new Date(k);
            return (
              <div key={k} style={{ padding:"8px 14px", borderTop:"1px solid var(--tw-gold-border)", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, fontFamily:"var(--font-ui)", fontSize:12 }}>
                <div style={{ minWidth:90 }}>
                  <div style={{ color:"var(--tw-gold-fg-deep)", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em" }}>
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]} · {MONTH_NAMES[d.getMonth()].slice(0,3)} {d.getDate()}
                  </div>
                </div>
                <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {SHIFTS.map(sh => {
                    const slot = cov[sh.id];
                    const name = slot ? slot.name : null;
                    return (
                    <div key={sh.id}>
                      <div style={{ color:"var(--tw-gold-fg-deep)", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em" }}>{sh.label}</div>
                      <div style={{ color: name ? "var(--fg-1)" : "var(--fg-3)", fontWeight: name ? 600 : 500 }}
                           title={slot ? `${name} · ${slot.start}–${slot.end}${slot.timezone ? " " + slot.timezone : ""}` : "Unassigned"}>
                        {name || "—"}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </OpsPanel>
      </div>

      {/* RIGHT: compact month grid */}
      <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-weak)", borderRadius:"var(--r-lg)", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", background:"var(--bg-page)", borderBottom:"1px solid var(--border-weak)" }}>
          {DOW_SHORT_SU.map((d,i) => (
            <div key={d} style={{
              padding:"8px 10px", textAlign:"left",
              fontFamily:"var(--font-ui)", fontSize:10, fontWeight:600,
              textTransform:"uppercase", letterSpacing:".08em", color:"var(--fg-2)",
              borderRight: i<6 ? "1px solid var(--border-weak)" : "none",
            }}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)",
            minHeight: 140 }}>
            {week.map((day, di) => {
              const inMonth = day.getMonth() === monthDate.getMonth();
              const isToday = sameDay(day, TODAY);
              const isWeekend = di === 0 || di === 6;
              const cov = isWeekend && inMonth ? coverage[iso(day)] : null;
              const dayEvents = isWeekend ? [] : visibleEvents.filter(ev => dateInRange(day, ev.start, ev.end));
              const todayMidnight = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
              const isPast = day < todayMidnight;
              return (
                <div key={di} onClick={() => {
                  if (!inMonth || isPast) return;
                  if (isWeekend && onWeekendCoverageAt) onWeekendCoverageAt(day);
                  else onAddAt(day);
                }} style={{
                  borderRight: di<6 ? "1px solid var(--border-weak)" : "none",
                  borderBottom: wi < weeks.length-1 ? (isWeekend ? "1px solid var(--tw-gold-border)" : "1px solid var(--border-weak)") : "none",
                  padding:"6px 6px 8px",
                  background: isToday ? "var(--today-highlight)" : isWeekend && inMonth ? "var(--tw-gray-6)" : "var(--bg-surface)",
                  boxShadow: isToday ? "inset 3px 0 0 var(--role-tier1-border)" : "none",
                  opacity: inMonth ? 1 : 0.5,
                  cursor: inMonth && !isPast ? "pointer" : "default", minHeight:140,
                  display:"flex", flexDirection:"column"
                }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4, gap:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"nowrap", flex:1, minWidth:0 }}>
                      <span style={{
                        display:"inline-flex", alignItems:"center", justifyContent:"center",
                        minWidth:20, height:20, padding:"0 5px", borderRadius:"var(--r-pill)",
                        fontFamily:"var(--font-ui)", fontSize:11, fontWeight: isToday ? 700 : 500,
                        background: "transparent",
                        color: "var(--fg-1)",
                        flexShrink:0
                      }}>{day.getDate()}</span>
                      {inMonth && <HolidayChips items={holidays[iso(day)]} size="sm"/>}
                    </div>
                    {dayEvents.length > 2 && inMonth && (
                      <span style={{ fontFamily:"var(--font-ui)", fontSize:10, color:"var(--fg-2)", flexShrink:0 }}>{dayEvents.length}</span>
                    )}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    {dayEvents.slice(0,3).map(ev => {
                      const emp = EMPLOYEES.find(e=>e.id===ev.employeeId) || { name: ev.fullName || "Unknown", initials: "?" };
                      const t = LEAVE_TYPES[ev.type];
                      return (
                        <div key={ev.id} onClick={(e)=>{ e.stopPropagation(); onOpenEvent(ev); }}
                          title={`${emp.name} · ${t.label}`}
                          style={{
                            display:"flex", alignItems:"center", gap:5,
                            padding:"2px 6px", borderRadius:4,
                            background: t.bg,
                            color: t.fg,
                            border: `1px solid ${t.bar}`,
                            fontFamily:"var(--font-ui)", fontSize:10, fontWeight:600,
                            whiteSpace:"nowrap", overflow:"hidden"
                          }}>
                          {t.icon ? <img src={t.icon} alt="" aria-hidden width={11} height={11} style={{ flexShrink:0, objectFit:"contain", display:"block" }}/> : null}
                          <span style={{ overflow:"hidden", textOverflow:"ellipsis", fontWeight:700 }}>{emp.initials}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div style={{ fontFamily:"var(--font-ui)", fontSize:10, color:"var(--fg-2)", paddingLeft:4 }}>
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                  {isWeekend && inMonth && (
                    <div style={{
                      flex:1,
                      minHeight:0,
                      overflow:"hidden",
                      display:"flex", flexDirection:"column",
                    }}>
                      {SHIFTS.map((sh, si) => {
                        const slot = cov && cov[sh.id];
                        const name = slot ? slot.name : null;
                        return (
                          <div key={sh.id} style={{
                            flex:1,
                            borderTop: si > 0 ? "1px dashed var(--tw-gold-border)" : "none",
                            display:"flex", flexDirection:"column", justifyContent:"center", gap:1, lineHeight:1.2
                          }}>
                            <div style={{
                              fontSize:10, fontWeight:700, color:"var(--tw-gold-fg-deep)",
                              letterSpacing:".05em", textTransform:"uppercase",
                              fontVariantNumeric:"tabular-nums"
                            }}>{sh.label}</div>
                            <div style={{
                              fontFamily:"var(--font-name)", fontSize:13,
                              color: name ? "var(--fg-1)" : "var(--fg-3)",
                              fontWeight:500,
                              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"
                            }}
                              title={slot ? `${name} · ${slot.start}–${slot.end}${slot.timezone ? " " + slot.timezone : ""}` : "Unassigned"}>
                              {name || "—"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function OpsPanel({ title, count, accent, children }) {
  return (
    <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-weak)", borderRadius:"var(--r-lg)", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 14px", borderBottom:"1px solid var(--border-weak)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {accent && <span style={{ width:8, height:8, borderRadius:4, background:accent }}/>}
          <span style={{ fontFamily:"var(--font-ui)", fontSize:13, fontWeight:600, color:"var(--fg-1)" }}>{title}</span>
        </div>
        {typeof count === "number" && (
          <span style={{ fontFamily:"var(--font-ui)", fontSize:11, color:"var(--fg-2)",
            background:"var(--bg-page)", padding:"2px 8px", borderRadius:"var(--r-pill)",
            fontVariantNumeric:"tabular-nums", minWidth:22, textAlign:"center" }}>{count}</span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function PersonRow({ ev, onOpen, showDates = true }) {
  const emp = EMPLOYEES.find(e => e.id === ev.employeeId) || { name: ev.fullName || "Unknown", initials: "?", role: "" };
  const t = LEAVE_TYPES[ev.type];
  const fmt = (d) => `${MONTH_NAMES[d.getMonth()].slice(0,3)} ${d.getDate()}`;
  const av = roleAvatarTint(emp.roleRaw || emp.role);
  return (
    <div onClick={onOpen} style={{
      padding:"10px 14px", borderTop:"1px solid var(--border-weak)",
      display:"flex", alignItems:"center", gap:10, cursor:"pointer"
    }}>
      <div style={{ width:28, height:28, borderRadius:"var(--r-pill)", background: av.bg, border: `1px solid ${av.border}`, color: av.fg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:11, fontFamily:"var(--font-ui)", flex:"none" }}>{emp.initials}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"var(--font-name)", fontSize:13, fontWeight:500, color:"var(--fg-1)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{emp.name}</div>
        {showDates && (
          <div style={{ fontFamily:"var(--font-ui)", fontSize:11, color:"var(--fg-2)" }}>
            {fmt(ev.start)}{!sameDay(ev.start, ev.end) ? ` – ${fmt(ev.end)}` : ""}
          </div>
        )}
      </div>
      <span style={{ display:"inline-flex", alignItems:"center", gap:4,
        padding:"2px 8px", borderRadius:"var(--r-pill)",
        background: t.bg, border: `1px solid ${t.bar}`, color: t.fg,
        fontFamily:"var(--font-ui)", fontSize:11, fontWeight:600 }}>
        <span style={{ width:6, height:6, borderRadius:3, background:t.bar }}/>{t.label}
      </span>
    </div>
  );
}

function EmptyRow({ children }) {
  return <div style={{ padding:"12px 14px", fontFamily:"var(--font-ui)", fontSize:12, color:"var(--fg-2)" }}>{children}</div>;
}

Object.assign(window, { MonthC });
