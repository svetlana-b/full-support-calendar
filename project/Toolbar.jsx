// Toolbar.jsx — filter bar shared across calendar directions.

// Tiny hook + button used by the toolbar to flip between light & dark.
// State of truth is the `data-theme` attribute on <html>; localStorage
// persistence is handled here so the choice survives reloads. An inline
// bootstrap script in the HTML head sets the initial attribute BEFORE
// React renders, which is why we don't need to also set it in a useEffect.
function useTheme() {
  const getInitial = () =>
    (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")) || "light";
  const [theme, setTheme] = React.useState(getInitial);
  const apply = React.useCallback((next) => {
    setTheme(next);
    try {
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("calendar-theme", next);
    } catch (_) { /* localStorage blocked — attr-only is fine */ }
  }, []);
  return [theme, () => apply(theme === "dark" ? "light" : "dark")];
}

function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={chromeBtn}>
      {isDark ? (
        // Sun icon — click to go light
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      ) : (
        // Moon icon — click to go dark
        <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
        </svg>
      )}
    </button>
  );
}

function Toolbar({
  monthDate, onPrev, onNext, onToday,
  employees,
  employeeFilter, setEmployeeFilter,
  typeFilter, setTypeFilter,
  onAdd, onManage, onEmployees, onWeekendSignup, onRoster, user, onSignOut,
  currentVariant, onVariantChange,
}) {
  const monthLabel = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

  const [p0Open, setP0Open] = React.useState(false);

  // Derive available type filter options from the selected employee's team.
  const selectedEmpForType = employeeFilter !== "all"
    ? (employees || []).find(e => e.id === employeeFilter)
    : null;
  const typeFilterTeam = (selectedEmpForType?.team || "").toUpperCase();
  const typeFilterIsMXCN = typeFilterTeam === "MX" || typeFilterTeam === "CN";
  const typeFilterOptions = [
    ["all", "All Leave Types"],
    ...Object.values(LEAVE_TYPES)
      .filter(t => !t.teamsOnly || typeFilterIsMXCN)
      .map(t => [t.id, t.label]),
  ];

  // Reset typeFilter to "all" when the employee filter switches away from MX/CN.
  React.useEffect(() => {
    if (!typeFilterIsMXCN && typeFilter !== "all") {
      const currentTypeObj = LEAVE_TYPES[typeFilter];
      if (currentTypeObj && currentTypeObj.teamsOnly) setTypeFilter("all");
    }
  }, [employeeFilter]);

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
              options={typeFilterOptions}/>

            {onEmployees && (
              <button onClick={onEmployees} style={secondaryBtn} title="View support employees">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>
                Employees
              </button>
            )}

            {onWeekendSignup && (
              <button onClick={onWeekendSignup} style={secondaryBtn} title="Sign up for weekend coverage shifts">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                Weekend Shifts
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

            {onAdd && (
              <button onClick={onAdd} style={{
                height:32, padding:"0 14px", border:"1px solid var(--action-primary-border)",
                background:"var(--action-primary)", color:"var(--fg-on-primary)",
                borderRadius:"var(--r-lg)", fontFamily:"var(--font-button)",
                fontWeight:500, fontSize:13, cursor:"pointer",
                display:"inline-flex", alignItems:"center", gap:6
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Take Day Off
              </button>
            )}

          </div>
        </div>

        {/* Sign-out column — outside the wrapping flow, always stays at top-right */}
        {user && (
          <div style={{ flexShrink:0, alignSelf:"flex-start", padding:"10px 20px 10px 8px", display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setP0Open(true)} title="P0 Escalation — Team Lead Contacts" style={{
              height:32, padding:"0 10px",
              border:"1px solid var(--tw-gold-border)",
              background:"var(--role-teamlead-bg)", color:"var(--role-teamlead-fg)",
              borderRadius:"var(--r-lg)", fontFamily:"var(--font-button)",
              fontSize:12, fontWeight:700, cursor:"pointer",
              display:"inline-flex", alignItems:"center", gap:5, letterSpacing:".03em",
              boxShadow:"0 0 8px rgba(240,208,128,0.35), 0 0 0 1px rgba(240,208,128,0.15)",
            }}>
              <img src="assets/call.png" alt="" style={{ width:18, height:18, objectFit:"contain", filter:"var(--p0-icon-filter)" }}/>
              PO Contacts
            </button>
            <ThemeToggle/>
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
      <P0ContactsModal open={p0Open} onClose={() => setP0Open(false)} employees={employees}/>
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
        fontFamily:"inherit", fontSize:13, cursor:"pointer", padding:"0 4px 0 0",
        // Inherit the document-level light/dark color-scheme so the native
        // dropdown popup (chevron + option list) flips with the theme.
        colorScheme: "inherit",
      }}>
        {options.map(([v,l]) => (
          // Explicit bg + color on the option keeps the rendered list
          // readable in both themes — Chrome/Edge respect option inline
          // styles for the popup.
          <option key={v} value={v} style={{ background:"var(--bg-surface)", color:"var(--fg-1)" }}>{l}</option>
        ))}
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
    { id:"B", label:"Employees" },
    { id:"C", label:"Events" },
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
          color: current === v.id ? "var(--fg-on-primary)" : "var(--fg-active)",
          fontFamily:"var(--font-button)", fontSize:13, fontWeight:500, cursor:"pointer",
          transition:"background 120ms, color 120ms",
        }}>{v.label}</button>
      ))}
    </div>
  );
}

const _P0_GOLD_RING = "rgba(240,208,128,0.40)";
const _P0_CHIP = { bg:"var(--role-teamlead-bg)", border:"var(--role-teamlead-border)", fg:"var(--role-teamlead-fg)" };

function P0ContactsModal({ open, onClose, employees }) {
  const [contacts, setContacts] = React.useState({});

  React.useEffect(() => {
    if (!open || !window.__firebaseReady) return;
    const { fbDb, fb } = window;
    const leads = (employees || []).filter(e => /team\s*lead/i.test(e.roleRaw || e.role || ""));
    if (!leads.length) return;
    Promise.all(
      leads.map(emp =>
        fb.getDoc(fb.doc(fbDb, "contacts", emp.fullName))
          .then(snap => [emp.fullName, snap.exists() ? snap.data() : {}])
          .catch(() => [emp.fullName, {}])
      )
    ).then(pairs => setContacts(Object.fromEntries(pairs)));
  }, [open]);

  if (!open) return null;

  const leads = (employees || [])
    .filter(e => /team\s*lead/i.test(e.roleRaw || e.role || ""))
    .sort((a, b) => {
      const isMX = e => /mx/i.test(e.roleRaw || e.role || "");
      return isMX(a) - isMX(b); // non-MX first
    });

  return ReactDOM.createPortal((
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position:"fixed", inset:0, background:"rgba(15,23,42,0.45)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1000, padding:24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"var(--bg-surface)", border:`1px solid ${_P0_GOLD_RING}`,
        borderRadius:"var(--r-xl)", width:"min(460px,100%)",
        boxShadow:"0 20px 60px rgba(15,23,42,0.25)",
        fontFamily:"var(--font-ui)", overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 20px", borderBottom:`1px solid ${_P0_GOLD_RING}`,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{
              width:30, height:30, borderRadius:"var(--r-md)", flexShrink:0,
              background:"var(--role-teamlead-bg)", color:"var(--role-teamlead-fg)",
              border:"1px solid var(--role-teamlead-border)",
              display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:14,
            }}>⚡</span>
            <div>
              <div style={{ fontFamily:"var(--font-name)", fontSize:18, fontWeight:300, color:"var(--fg-1)" }}>P0 Escalation</div>
              <div style={{ fontSize:11, color:"var(--role-teamlead-fg)", marginTop:1, opacity:.8 }}>Team Lead Contacts</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            display:"inline-flex", alignItems:"center", gap:4,
            height:28, padding:"0 10px",
            border:`1px solid ${_P0_GOLD_RING}`, borderRadius:"var(--r-pill)",
            background:"var(--role-teamlead-bg)", color:"var(--role-teamlead-fg)",
            fontFamily:"var(--font-button)", fontSize:12, cursor:"pointer",
          }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            Close
          </button>
        </div>

        {/* Team lead cards */}
        <div style={{ padding:"12px 20px 20px", display:"flex", flexDirection:"column", gap:12 }}>
          {leads.length === 0 ? (
            <div style={{ fontSize:13, color:"var(--fg-3)", fontStyle:"italic", padding:"8px 0" }}>No team leads found.</div>
          ) : leads.map((emp, i) => {
            const contact = contacts[emp.fullName] || {};
            const phone = contact.contact || "";
            const messengerRaw = contact.preferred_messenger;
            const messengers = Array.isArray(messengerRaw)
              ? messengerRaw.filter(Boolean)
              : messengerRaw ? [messengerRaw] : [];
            const telHref = phone ? `tel:${phone.replace(/\s+/g, "")}` : null;
            const displayPhone = phone ? (/^\+/.test(phone) ? phone : "+" + phone) : "";
            const av = roleAvatarTint(emp.roleRaw || emp.role || "");
            return (
              <div key={emp.id || i} style={{
                background:"var(--bg-page)", border:`1px solid ${_P0_GOLD_RING}`,
                borderRadius:"var(--r-lg)", padding:"14px 16px",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{
                    width:38, height:38, borderRadius:"50%", flexShrink:0,
                    background:av.bg, border:`1px solid ${av.border}`, color:av.fg,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"var(--font-name)", fontWeight:700, fontSize:13,
                  }}>{emp.initials || "?"}</div>
                  <div>
                    <div style={{ fontFamily:"var(--font-name)", fontSize:15, fontWeight:500, color:"var(--fg-1)", lineHeight:1.2 }}>
                      {emp.fullName || emp.name}
                    </div>
                    <div style={{ fontSize:11, color:"var(--fg-2)", marginTop:2 }}>{emp.roleRaw || emp.role}</div>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {phone && (
                    <P0ContactRow label="Phone">
                      <a href={telHref} style={{ color:_P0_CHIP.fg, textDecoration:"none", fontWeight:500 }}>{displayPhone}</a>
                    </P0ContactRow>
                  )}
                  {messengers.length > 0 && (
                    <P0ContactRow label="Preferred Messenger">
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {messengers.map((m, mi) => (
                          <span key={mi} style={{
                            display:"inline-flex", alignItems:"center",
                            height:22, padding:"0 8px",
                            background:_P0_CHIP.bg, border:`1px solid ${_P0_CHIP.border}`,
                            color:_P0_CHIP.fg, borderRadius:"var(--r-pill)",
                            fontSize:11, fontWeight:500,
                          }}>{m}</span>
                        ))}
                      </div>
                    </P0ContactRow>
                  )}
                  {!phone && !messengers.length && (
                    <div style={{ fontSize:12, color:"var(--fg-3)", fontStyle:"italic" }}>No contact info on file.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          padding:"12px 20px", borderTop:`1px solid ${_P0_GOLD_RING}`,
          textAlign:"center", fontSize:13, fontWeight:500, color:"var(--role-teamlead-fg)", opacity:.9,
        }}>
          🔒 Phone number can be used <strong style={{ fontWeight:700 }}>ONLY</strong> by Support members
        </div>
      </div>
    </div>
  ), document.body);
}

function P0ContactRow({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:".08em", color:"var(--role-teamlead-fg)", opacity:.6, marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:12 }}>{children}</div>
    </div>
  );
}

// ---------- Employees Modal ----------

const TEAM_LABEL = { UA: "Ukraine 🇺🇦", MX: "Mexico 🇲🇽", CN: "China 🇨🇳" };

function _fmtTime(hhmm) {
  if (!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  if (isNaN(h)) return hhmm;
  const ampm = h < 12 ? "AM" : "PM";
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function _tzShortLabel(iana) {
  if (!iana) return "";
  try {
    const ref = new Date("2026-06-15T12:00:00Z");
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: iana, timeZoneName: "short", hour: "numeric" }).formatToParts(ref);
    const tzn = parts.find(p => p.type === "timeZoneName");
    return tzn ? tzn.value : "";
  } catch { return ""; }
}

// Convert "HH:MM" local time in fromTz to EDT (America/New_York, UTC−4 summer).
// Uses today's date as reference so DST offsets are current.
function _convertToEDT(hhmm, fromTz) {
  if (!hhmm || !fromTz) return null;
  try {
    const [hStr, mStr] = hhmm.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr || "0", 10);
    if (isNaN(h) || isNaN(m)) return null;

    // Pick today at noon UTC as reference to capture today's DST offset for fromTz
    const now = new Date();
    const refUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: fromTz, hour: "numeric", minute: "numeric", hour12: false,
    }).formatToParts(refUTC);
    let tzH = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
    const tzM = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
    if (tzH === 24) tzH = 0;
    // offset of fromTz vs UTC in minutes (e.g. Kyiv EEST = +180, MX CDT = -300)
    const fromOffsetMins = (tzH * 60 + tzM) - (12 * 60);

    // local → UTC → EDT (UTC−4)
    const edtMins = ((((h * 60 + m) - fromOffsetMins - 240) % 1440) + 1440) % 1440;
    const eh = Math.floor(edtMins / 60);
    const em = edtMins % 60;
    return _fmtTime(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
  } catch { return null; }
}

function EmployeesModal({ open, onClose, employees }) {
  if (!open) return null;

  const ROLE_ICON = (role) => {
    const r = (role || "").toLowerCase();
    if (r.includes("team lead")) return "⭐";
    if (r.includes("tech lead") || r.includes("teach lead")) return "🔧";
    if (r.includes("tier2") || r.includes("tier 2")) return "🔵";
    if (r.includes("tier1") || r.includes("tier 1")) return "🟢";
    return "👤";
  };

  const ROLE_BUCKETS = [
    { key: "tier1",     label: "Tier 1",     test: r => r.includes("tier1") || r.includes("tier 1") },
    { key: "tier2",     label: "Tier 2",     test: r => r.includes("tier2") || r.includes("tier 2") },
    { key: "techlead",  label: "Tech Lead",  test: r => r.includes("tech lead") || r.includes("teach lead") },
    { key: "teamlead",  label: "Team Lead",  test: r => r.includes("team lead") },
  ];
  const roleBucket = (role) => {
    const r = (role || "").toLowerCase();
    return ROLE_BUCKETS.find(b => b.test(r)) || { key: "other", label: "Other" };
  };

  const sorted = (employees || []).slice().sort((a, b) => {
    const orderA = ROLE_BUCKETS.findIndex(bkt => bkt.test((a.roleRaw || a.role || "").toLowerCase()));
    const orderB = ROLE_BUCKETS.findIndex(bkt => bkt.test((b.roleRaw || b.role || "").toLowerCase()));
    const oa = orderA === -1 ? 99 : orderA;
    const ob = orderB === -1 ? 99 : orderB;
    if (oa !== ob) return oa - ob;
    return (a.fullName || "").localeCompare(b.fullName || "");
  });

  const groups = [];
  sorted.forEach(emp => {
    const bucket = roleBucket(emp.roleRaw || emp.role);
    const last = groups[groups.length - 1];
    if (!last || last.key !== bucket.key) groups.push({ key: bucket.key, label: bucket.label, emps: [emp] });
    else last.emps.push(emp);
  });

  return ReactDOM.createPortal((
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position:"fixed", inset:0, background:"rgba(15,23,42,0.45)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1000, padding:24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"var(--bg-surface)", border:"1px solid var(--border-weak)",
        borderRadius:"var(--r-xl)", width:"min(540px,100%)",
        maxHeight:"calc(100vh - 48px)", display:"flex", flexDirection:"column",
        boxShadow:"0 20px 60px rgba(15,23,42,0.25)", fontFamily:"var(--font-ui)",
      }}>
        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 20px", borderBottom:"1px solid var(--border-weak)", flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{
              width:30, height:30, borderRadius:"var(--r-md)", flexShrink:0,
              background:"var(--role-tier1-bg)", border:"1px solid var(--role-tier1-border)",
              display:"inline-flex", alignItems:"center", justifyContent:"center",
            }}><img src="assets/id-card.png" alt="" style={{ width:24, height:24, objectFit:"contain" }}/></span>
            <div>
              <div style={{ fontFamily:"var(--font-name)", fontSize:18, fontWeight:300, color:"var(--fg-1)" }}>Support Employees</div>
              <div style={{ fontSize:11, color:"var(--fg-2)", marginTop:1 }}>{sorted.length} team member{sorted.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            display:"inline-flex", alignItems:"center", gap:4,
            height:28, padding:"0 10px",
            border:"1px solid var(--border-weak)", borderRadius:"var(--r-pill)",
            background:"var(--bg-surface)", color:"var(--fg-2)",
            fontFamily:"var(--font-button)", fontSize:12, cursor:"pointer",
          }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            Close
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY:"auto", padding:"12px 20px 20px" }}>
          {groups.map(({ key, label, emps }) => (
            <div key={key} style={{ marginBottom:16 }}>
              <div style={{
                fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase",
                color:"var(--fg-3)", padding:"4px 0 8px",
              }}>{label}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {emps.map((emp, i) => {
                  const av = roleAvatarTint(emp.roleRaw || emp.role || "");
                  const hasSched = emp.start || emp.end;
                  const schedLabel = hasSched ? (() => {
                    if (emp.timezone) {
                      const s = _convertToEDT(emp.start, emp.timezone);
                      const e = _convertToEDT(emp.end, emp.timezone);
                      return [s, e].filter(Boolean).join(" – ") + " EST";
                    }
                    return [_fmtTime(emp.start), _fmtTime(emp.end)].filter(Boolean).join(" – ") + " EST";
                  })() : null;
                  return (
                    <div key={emp.id || i} style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding:"10px 12px",
                      background:"var(--bg-page)", border:"1px solid var(--border-weak)",
                      borderRadius:"var(--r-lg)",
                    }}>
                      {/* Role icon (initials badge) */}
                      <div style={{
                        width:36, height:36, borderRadius:"50%", flexShrink:0,
                        background:av.bg, border:`1px solid ${av.border}`, color:av.fg,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontFamily:"var(--font-name)", fontWeight:700, fontSize:12,
                        position:"relative",
                      }}>
                        {emp.initials || "?"}
                        {/trainee/i.test(emp.roleRaw || emp.role || "") && (
                          <span style={{
                            position:"absolute", bottom:-4, right:-4,
                            fontSize:12, lineHeight:1,
                            filter:"drop-shadow(0 0 2px var(--bg-page))",
                          }}>💡</span>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"var(--font-name)", fontSize:14, fontWeight:500, color:"var(--fg-1)", lineHeight:1.2 }}>
                          {emp.fullName || emp.name}
                        </div>
                        <div style={{ fontSize:11, color:"var(--fg-2)", marginTop:2 }}>
                          {emp.roleRaw || emp.role || "—"}
                        </div>
                      </div>

                      {/* Schedule */}
                      {schedLabel && (
                        <div style={{
                          flexShrink:0, fontSize:11, color:"var(--fg-3)",
                          fontFamily:"var(--font-mono, monospace)",
                          background:"var(--bg-surface)", border:"1px solid var(--border-weak)",
                          borderRadius:"var(--r-md)", padding:"3px 8px",
                          whiteSpace:"nowrap",
                        }}>{schedLabel}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <div style={{ fontSize:13, color:"var(--fg-3)", fontStyle:"italic", padding:"12px 0" }}>No employees found.</div>
          )}
        </div>
      </div>
    </div>
  ), document.body);
}

Object.assign(window, { Toolbar, Legend, ViewSwitcher, ThemeToggle, useTheme, EmployeesModal });

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
  const bg     = isBday ? "var(--celebration-birthday-bg)"     : "var(--celebration-anniversary-bg)";
  const fg     = isBday ? "var(--celebration-birthday-fg)"     : "var(--celebration-anniversary-fg)";
  const border = isBday ? "var(--celebration-birthday-border)" : "var(--celebration-anniversary-border)";
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
