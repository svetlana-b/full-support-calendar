// Holidays.jsx — shared holiday UI primitives. Shows country-tagged
// badges on days where one or more country teams have a holiday, with
// a hover affordance that lists the people on working coverage.

// Inline SVG flags so flag rendering doesn't depend on OS emoji support
// (e.g. Windows / many Linux distros don't ship flag glyphs and show
// the regional-indicator letters instead — "🇲🇽" → "MX"). 18×12 stripes.
const FLAG_SVG = {
  UA: (
    <svg viewBox="0 0 18 12" width="18" height="12" style={{ display:"block", borderRadius:2, boxShadow:"0 0 0 1px rgba(0,0,0,0.08)" }} aria-hidden>
      <rect width="18" height="6" fill="#0057B7"/>
      <rect y="6" width="18" height="6" fill="#FFD700"/>
    </svg>
  ),
  MX: (
    <svg viewBox="0 0 18 12" width="18" height="12" style={{ display:"block", borderRadius:2, boxShadow:"0 0 0 1px rgba(0,0,0,0.08)" }} aria-hidden>
      <rect width="6" height="12" fill="#006847"/>
      <rect x="6" width="6" height="12" fill="#FFFFFF"/>
      <rect x="12" width="6" height="12" fill="#CE1126"/>
      <circle cx="9" cy="6" r="1.6" fill="none" stroke="#8B5A2B" strokeWidth="0.4"/>
    </svg>
  ),
  CN: (
    <svg viewBox="0 0 18 12" width="18" height="12" style={{ display:"block", borderRadius:2, boxShadow:"0 0 0 1px rgba(0,0,0,0.08)" }} aria-hidden>
      <rect width="18" height="12" fill="#DE2910"/>
      <text x="3.4" y="4.4" fill="#FFDE00" fontSize="3" fontWeight="700" textAnchor="middle" fontFamily="serif">★</text>
    </svg>
  ),
};

function CountryFlag({ code }) {
  return FLAG_SVG[code] || null;
}

const COUNTRY_TINT = {
  UA: { bg: "var(--holiday-ua-bg)", border: "var(--holiday-ua-border)", fg: "var(--holiday-ua-fg)" },
  MX: { bg: "var(--holiday-mx-bg)", border: "var(--holiday-mx-border)", fg: "var(--holiday-mx-fg)" },
  CN: { bg: "var(--holiday-cn-bg)", border: "var(--holiday-cn-border)", fg: "var(--holiday-cn-fg)" },
};

// Compact row of country-coded holiday chips for a single day.
// Shows flag + country code; on hover a detail popover lists the
// holiday name and working coverage (if any).
function HolidayChips({ items, size = "sm" }) {
  if (!items || items.length === 0) return null;
  const flat = items.flatMap(h => h.teams.map(t => ({ team: t, name: h.name, working: h.working })));
  const pad = size === "sm" ? "2px 6px" : "3px 8px";
  const fsz = size === "sm" ? 11 : 11;
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
      {flat.map((it, i) => {
        const tint = COUNTRY_TINT[it.team] || { bg:"var(--bg-page)", border:"var(--border-weak)", fg:"var(--fg-2)" };
        return (
          <HolidayChip key={i} tint={tint} team={it.team} name={it.name} working={it.working} pad={pad} fsz={fsz}/>
        );
      })}
    </div>
  );
}

function HolidayChip({ tint, team, name, working, pad, fsz }) {
  const [hover, setHover] = React.useState(false);
  const country = COUNTRIES[team];
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); setHover(h => !h); }}
      style={{
        display:"inline-flex", alignItems:"center", gap:4,
        padding: pad, borderRadius:4,
        background: tint.bg, border:`1px solid ${tint.border}`,
        color: tint.fg, fontFamily:"var(--font-ui)", fontSize: fsz, fontWeight:600,
        letterSpacing:".02em", cursor:"default", position:"relative",
        lineHeight:1.2, whiteSpace:"wrap",
      }}
    >
      <span>{team}</span>
      {hover && (
        <HolidayPopover name={name} country={country} working={working}/>
      )}
    </span>
  );
}

function HolidayPopover({ name, country, working }) {
  return (
    <div style={{
      position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:20,
      minWidth: 240, maxWidth: 320,
      background:"var(--bg-surface)", color:"var(--fg-1)",
      border:"1px solid var(--border-strong)",
      borderRadius:"var(--r-card)",
      boxShadow:"var(--shadow-elev-3)",
      padding:"12px 14px", fontFamily:"var(--font-ui)", fontSize:12,
      fontWeight:400, letterSpacing:0,
    }}>
      <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
        <span style={{ flexShrink: 0 }}>
        <CountryFlag code={country?.code}/>
        </span>
        <span style={{ fontWeight:600, fontSize:13 }}>{name}</span>
      </div>
      <div style={{ color:"var(--fg-2)", fontSize:11, marginBottom:8 }}>
        {country?.name} team is off
      </div>
      {working && working.length > 0 ? (
        <>
          <div style={{ color:"var(--fg-3)", fontSize:9, fontWeight:600, textTransform:"uppercase",
            letterSpacing:".06em", marginBottom:4 }}>Working coverage</div>
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            {working.map((w, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                <span style={{ color:"var(--fg-1)" }}>{w.name || w.fullName}</span>
                <span style={{ color:"var(--fg-3)", fontVariantNumeric:"tabular-nums" }}>
                  {w.start}{w.end ? `–${w.end}` : ""}
                  <span style={{ marginLeft:4, color:"var(--fg-3)", fontWeight:500 }}>EST</span>
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ color:"var(--fg-3)", fontSize:11, fontStyle:"italic" }}>No extra coverage planned.</div>
      )}
    </div>
  );
}

// Full-width holiday bar for MonthB's column header.
function HolidayMarker({ items }) {
  if (!items || items.length === 0) return null;
  const teams = [...new Set(items.flatMap(h => h.teams))];
  return (
    <div style={{ display:"flex", gap:2, justifyContent:"center", marginTop:2 }}
         title={items.map(h => `${h.name} (${h.teams.join(", ")})`).join("\n")}>
      {teams.map(t => {
        const c = COUNTRIES[t];
        const tint = COUNTRY_TINT[t] || {};
        return <span key={t} style={{
          width:14, height:14, borderRadius:3,
          background: tint.bg, border:`1px solid ${tint.border}`,
          display:"inline-flex", alignItems:"center", justifyContent:"center",
          fontSize:9,
        }}>{c?.flag}</span>;
      })}
    </div>
  );
}

Object.assign(window, { HolidayChips, HolidayChip, HolidayMarker, COUNTRY_TINT, CountryFlag });
