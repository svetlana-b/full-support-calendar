// Toolbar.jsx — filter bar shared across calendar directions.

function Toolbar({
  monthDate, onPrev, onNext, onToday,
  employees,
  employeeFilter, setEmployeeFilter,
  typeFilter, setTypeFilter,
  onAdd, onManage, onWeekendSignup, onRoster, user, onSignOut,
  currentVariant, onVariantChange,
}) {
  const monthLabel = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

  // Detect whether the buttons group has wrapped to a second row.
  const [twoRows, setTwoRows] = React.useState(false);
  const leftRef = React.useRef(null);
  const buttonsRef = React.useRef(null);
  React.useLayoutEffect(() => {
    const check = () => {
      if (leftRef.current && buttonsRef.current) {
        setTwoRows(buttonsRef.current.offsetTop > leftRef.current.offsetTop);
      }
    };
    check();
    const ro = new ResizeObserver(check);
    if (leftRef.current && leftRef.current.parentElement) {
      ro.observe(leftRef.current.parentElement);
    }
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ background:"var(--bg-surface)", borderBottom:"1px solid var(--border-weak)" }}>
      {/* Outer row: main wrapping area + sign-out column (never wraps, always top-right) */}
      <div style={{ display:"flex", alignItems:"flex-start" }}>

        {/* Main area — flex items wrap here */}
        <div style={{
          flex:1, display:"flex", flexWrap:"wrap", alignItems:"center",
          gap:"8px 12px", padding:"10px 0 10px 20px",
        }}>
          {/* Left group: nav + month + view switcher */}
          <div ref={leftRef} style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <button onClick={onPrev} style={chromeBtn} title="Previous month">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            <button onClick={onNext} style={chromeBtn} title="Next month">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
            </button>
            <button onClick={onToday} style={{ ...chromeBtn, width:"auto", padding:"0 12px", fontFamily:"var(--font-button)", fontSize:13, fontWeight:500 }}>Today</button>
            <h2 style={{
              margin:0, fontFamily:"var(--font-display)", fontWeight:700, fontSize:22, lineHeight:"26px",
              color:"var(--fg-1)", letterSpacing:".002em", minWidth:160
            }}>{monthLabel}</h2>
            {onVariantChange && (
              <ViewSwitcher current={currentVariant} onChange={onVariantChange}/>
            )}
          </div>

          {/* Celebrations: centered in spacer on one row; snaps left after nav on two rows */}
          {twoRows ? (
            <div style={{ flexShrink:0, display:"flex", alignItems:"center" }}>
              <TodayCelebrationsBadge employees={employees} onOpen={onRoster}/>
            </div>
          ) : (
            <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
              <TodayCelebrationsBadge employees={employees} onOpen={onRoster}/>
            </div>
          )}

          {/* Right group: filters + actions — wraps left-aligned to second row on narrow screens */}
          <div ref={buttonsRef} style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <FilterPill label="Team" value={employeeFilter} onChange={setEmployeeFilter}
              options={[["all","Everyone"], ...(employees || []).map(e => [e.id, e.name])]}/>
            <FilterPill label="Type" value={typeFilter} onChange={setTypeFilter}
              options={[["all","All leave types"], ...Object.values(LEAVE_TYPES).map(t => [t.id, t.label])]}/>

            {onWeekendSignup && (
              <button onClick={onWeekendSignup} style={secondaryBtn} title="Sign up for weekend coverage shifts">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                Weekend shifts
              </button>
            )}

            {onRoster && (
              <button onClick={onRoster} style={secondaryBtn} title="Birthdays & anniversaries">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v7"/><path d="M2 21h20"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><path d="M12 7V3"/><path d="M10 3h4"/></svg>
                Employees Events
              </button>
            )}

            {onManage && (
              <button onClick={onManage} style={secondaryBtn}>Manage</button>
            )}

            <button onClick={onAdd} style={{
              height:32, padding:"0 14px", border:"1px solid transparent",
              background:"var(--action-primary)", color:"var(--fg-invert)",
              borderRadius:"var(--r-lg)", fontFamily:"var(--font-button)",
              fontWeight:500, fontSize:13, cursor:"pointer",
              display:"inline-flex", alignItems:"center", gap:6
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Take day off
            </button>
          </div>
        </div>

        {/* Sign-out column — outside the wrapping flow, always stays at top-right */}
        {user && (
          <div style={{ flexShrink:0, alignSelf:"flex-start", padding:"10px 20px 10px 8px" }}>
            <div title={user.email || user.displayName || ""} style={{
              display:"inline-flex", alignItems:"center", gap:6, height:32, padding:"0 4px 0 8px",
              border:"1px solid var(--border-weak)", borderRadius:"var(--r-pill)",
              background:"var(--bg-surface)",
            }}>
              {user.photoURL && <img src={user.photoURL} alt="" style={{ width:24, height:24, borderRadius:"50%" }}/>}
              <button onClick={onSignOut} style={{ border:0, background:"transparent", color:"var(--fg-2)", fontFamily:"var(--font-button)", fontSize:12, cursor:"pointer", padding:"0 6px" }}>Sign out</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const secondaryBtn = {
  height:32, padding:"0 12px", border:"1px solid var(--border-weak)",
  background:"var(--bg-surface)", color:"var(--fg-active)",
  borderRadius:"var(--r-lg)", fontFamily:"var(--font-button)",
  fontWeight:500, fontSize:13, cursor:"pointer",
  display:"inline-flex", alignItems:"center", gap:6,
};

const chromeBtn = {
  width:32, height:32, border:"1px solid var(--border-weak)",
  background:"var(--bg-surface)", color:"var(--fg-active)",
  borderRadius:"var(--r-lg)", cursor:"pointer",
  display:"inline-flex", alignItems:"center", justifyContent:"center"
};

function FilterPill({ label, value, onChange, options }) {
  return (
    <label style={{
      display:"inline-flex", alignItems:"center", gap:8, height:32, padding:"0 10px 0 12px",
      border:"1px solid var(--border-weak)", borderRadius:"var(--r-lg)",
      background:"var(--bg-surface)", fontFamily:"var(--font-ui)", fontSize:13
    }}>
      <span style={{ color:"var(--fg-2)" }}>{label}</span>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{
        border:0, background:"transparent", outline:"none", color:"var(--fg-1)",
        fontFamily:"inherit", fontSize:13, cursor:"pointer", padding:"0 4px 0 0"
      }}>
        {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

// Legend rendered under the toolbar
function Legend({ status = "loading", error = null }) {
  const dotColor =
      status === "live"    ? "var(--state-success)"
    : status === "loading" ? "var(--tw-gray-3)"
    : status === "error"   ? "var(--action-destructive)"
    : "var(--fg-3)";
  const label =
      status === "live"    ? "synced just now"
    : status === "loading" ? "connecting…"
    : status === "error"   ? (error || "connection error")
    : "offline";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 20px", background:"var(--bg-page)",
      borderBottom:"1px solid var(--border-weak)", fontFamily:"var(--font-ui)", fontSize:11, color:"var(--fg-2)"
    }}>
      {Object.values(LEAVE_TYPES).map(t => (
        <span key={t.id} style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
          <span style={{ width:8, height:8, borderRadius:2, background:t.bar }}/>
          {t.label}
        </span>
      ))}
      <span style={{ flex:1 }}/>
      <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
        <span style={{ width:7, height:7, borderRadius:4, background: dotColor }}/>
        Firestore · <span style={{ color:"var(--fg-3)" }}>{label}</span>
      </span>
    </div>
  );
}

function ViewSwitcher({ current, onChange }) {
  const views = [
    { id:"A", label:"Month" },
    { id:"B", label:"Swimlane" },
    { id:"C", label:"Ops" },
  ];
  return (
    <div style={{
      display:"inline-flex", border:"1px solid var(--border-weak)",
      borderRadius:"var(--r-lg)", overflow:"hidden", flexShrink:0,
    }}>
      {views.map((v, i) => (
        <button key={v.id} onClick={() => onChange(v.id)} style={{
          height:32, padding:"0 14px", border:0,
          borderRight: i < views.length - 1 ? "1px solid var(--border-weak)" : "none",
          background: current === v.id ? "var(--action-primary)" : "var(--bg-surface)",
          color: current === v.id ? "var(--fg-invert)" : "var(--fg-active)",
          fontFamily:"var(--font-button)", fontSize:13, fontWeight:500, cursor:"pointer",
          transition:"background 120ms, color 120ms",
        }}>{v.label}</button>
      ))}
    </div>
  );
}

Object.assign(window, { Toolbar, Legend, ViewSwitcher });

// Compact pill that appears in the toolbar ONLY when today is someone's
// birthday or work anniversary. Shows up to 3 individual pills; any
// extras collapse into a "+N more" pill that opens the full roster.
function TodayCelebrationsBadge({ employees, onOpen }) {
  const items = celebrationsForDay(TODAY, employees || []);
  if (!items.length) return null;

  const VISIBLE = 2;
  const visible = items.slice(0, VISIBLE);
  const overflow = items.slice(VISIBLE);

  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
      {visible.map((c, i) => (
        <CelebrationPill key={c.kind + ":" + c.emp.id + ":" + i} item={c} onOpen={onOpen}/>
      ))}
      {overflow.length > 0 && (
        <button
          onClick={onOpen || undefined}
          title={overflow.map(c => c.kind === "birthday"
            ? `${c.emp.fullName} — birthday`
            : `${c.emp.fullName} — ${c.years}-year anniversary`).join("\n")}
          style={{
            display:"inline-flex", alignItems:"center", gap:4,
            height:20, padding:"0 8px",
            background:"var(--bg-surface)", color:"var(--fg-active)",
            border:"1px solid var(--border-weak)",
            borderRadius:"var(--r-pill)",
            fontFamily:"var(--font-ui)", fontSize:11, fontWeight:600,
            cursor: onOpen ? "pointer" : "default",
            whiteSpace:"nowrap",
          }}>
          +{overflow.length} more
        </button>
      )}
    </div>
  );
}

function CelebrationPill({ item, onOpen }) {
  const isBday = item.kind === "birthday";
  const shortName = (full) => {
    const parts = String(full || "").trim().split(/\s+/);
    if (parts.length < 2) return parts[0] || "";
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };
  const bg = isBday ? "#FCE7F3" : "#DCFCE7";
  const fg = isBday ? "#9D174D" : "#166534";
  const border = isBday ? "#F9A8D4" : "#86EFAC";
  const tip = isBday
    ? `${item.emp.fullName} · Birthday`
    : `${item.emp.fullName} · ${item.years}-year anniversary`;
  const label = isBday
    ? `${shortName(item.emp.fullName)}'s birthday`
    : `${shortName(item.emp.fullName)} · ${item.years}y`;
  return (
    <button
      onClick={onOpen || undefined}
      title={tip}
      style={{
        display:"inline-flex", alignItems:"center", gap:5,
        height:20, padding:"0 8px",
        background: bg, color: fg,
        border: `1px solid ${border}`,
        borderRadius:"var(--r-pill)",
        fontFamily:"var(--font-ui)", fontSize:11, fontWeight:600,
        cursor: onOpen ? "pointer" : "default",
        whiteSpace:"nowrap",
      }}>
      <CelebrationIcon kind={item.kind} size={11}/>
      <span>{label}</span>
    </button>
  );
}

Object.assign(window, { TodayCelebrationsBadge, CelebrationPill });
