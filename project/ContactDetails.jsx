// ContactDetails.jsx — read-only contact popover for Tier 2 / weekend coverage.
// Triggered by clicking a name in the calendar. Pulls phone + preferred
// messengers from the `contacts/{Full Name}` Firestore collection (passed in
// as a `contact` prop), and falls back to the employee record for slack/email.
//
// Sections render only when their underlying field is present, so people
// with partial contact info still get a clean card.
//
// Portals to document.body so it escapes the design-canvas transform.

function ContactDetails({ employee, contact, onClose }) {
  if (!employee) return null;
  const messengers = (contact && Array.isArray(contact.messengers)) ? contact.messengers : [];
  const phone = contact && contact.phone ? contact.phone : "";
  const role = employee.roleRaw || employee.role || "";
  const team = employee.team || "";
  // Palette from the Pro-Support Schedule app (index.html reference).
  const _accent = (() => {
    const r = role.toLowerCase();
    if (r.includes("tech lead") || r.includes("teach lead"))
      return { chipBg:"rgba(129,140,248,0.08)", chipBorder:"rgba(129,140,248,0.2)", chipFg:"#a5b4fc", ring:"rgba(129,140,248,0.3)" };
    if (r.includes("team lead"))
      return { chipBg:"rgba(240,208,128,0.08)", chipBorder:"rgba(240,208,128,0.2)", chipFg:"#f5d78a", ring:"rgba(240,208,128,0.3)" };
    if (r.includes("tier1") || r.includes("tier 1"))
      return { chipBg:"rgba(110,231,160,0.08)", chipBorder:"rgba(110,231,160,0.2)", chipFg:"#86efac", ring:"rgba(110,231,160,0.3)" };
    return { chipBg:"rgba(56,189,248,0.08)", chipBorder:"rgba(56,189,248,0.2)", chipFg:"#7dd3fc", ring:"rgba(56,189,248,0.3)" };
  })();
  const teamAccent = roleAvatarTint(role);
  const linkColor  = _accent.chipFg;

  // Format a phone number for tel: links — strip spaces but keep +.
  const telHref = phone ? `tel:${phone.replace(/\s+/g, "")}` : null;
  // Display version: ensure a leading + if it looks like an E.164 number
  // without one (the Firestore rows are stored without the +).
  const displayPhone = phone
    ? (/^\+/.test(phone) ? phone : "+" + phone)
    : "";

  return ReactDOM.createPortal((
    <div onClick={onClose} role="dialog" aria-modal="true"
      style={{
        position:"fixed", inset:0, background:"rgba(15,23,42,0.45)",
        display:"flex", alignItems:"center", justifyContent:"center",
        zIndex:1000, padding:24,
      }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"var(--bg-surface)",
        border: `1px solid ${_accent.ring}`,
        borderRadius:"var(--r-xl)", width:"min(420px, 100%)",
        boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
        fontFamily:"var(--font-ui)", overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 20px", borderBottom:"1px solid var(--border-weak)",
        }}>
          <div style={{ fontSize:16, fontWeight:600, color:"var(--fg-1)" }}>Contact details</div>
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

        {/* Identity row */}
        <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:44, height:44, borderRadius:"50%",
            background: teamAccent.bg, border: `1px solid ${teamAccent.border}`, color: teamAccent.fg,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:700, fontSize:14, letterSpacing:".02em",
            flexShrink:0,
          }}>
            {employee.initials || "?"}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:600, color:"var(--fg-1)", lineHeight:1.2 }}>
              {employee.fullName || employee.name || "—"}
            </div>
            {role && (
              <div style={{ fontSize:12, color:"var(--fg-2)", marginTop:2 }}>{role}</div>
            )}
          </div>
        </div>

        <div style={{ padding:"0 20px 16px", display:"flex", flexDirection:"column", gap:14 }}>
          {phone && (
            <ContactSection label="Phone">
              <a href={telHref} style={contactLink}>{displayPhone}</a>
            </ContactSection>
          )}

          {messengers.length > 0 && (
            <ContactSection label="Preferred messenger">
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {messengers.map(m => (
                  <span key={m} style={{
                    display:"inline-flex", alignItems:"center",
                    height:24, padding:"0 10px",
                    background: _accent.chipBg, border:`1px solid ${_accent.chipBorder}`,
                    color: _accent.chipFg,
                    borderRadius:"var(--r-pill)",
                    fontSize:12, fontWeight:500,
                  }}>{m}</span>
                ))}
              </div>
            </ContactSection>
          )}

          {employee.slackUrl && (
            <ContactSection label="Slack">
              <a href={employee.slackUrl} target="_blank" rel="noreferrer" style={{...contactLink, color: linkColor}}>Open in Slack ↗</a>
            </ContactSection>
          )}

          {employee.email && (
            <ContactSection label="Email">
              <a href={`mailto:${employee.email}`} style={{...contactLink, color: linkColor}}>{employee.email}</a>
            </ContactSection>
          )}

          {!phone && messengers.length === 0 && !employee.slackUrl && !employee.email && (
            <div style={{ fontSize:12, color:"var(--fg-3)", fontStyle:"italic", padding:"8px 0" }}>
              No contact info on file.
            </div>
          )}
        </div>

        {/* Footer disclaimer */}
        <div style={{
          padding:"12px 20px",
          background:"transparent",
          borderTop:"1px solid var(--border-weak)",
          display:"flex", alignItems:"center", gap:10,
          fontSize:13, fontWeight:500, color:"var(--fg-2)",
        }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, color:"var(--fg-2)" }}>
            <rect x="4" y="11" width="16" height="9" rx="2"/>
            <path d="M8 11V7a4 4 0 1 1 8 0v4"/>
          </svg>
          <span>Phone number can be used <strong style={{ fontWeight:700 }}>ONLY</strong> by Support members.</span>
        </div>
      </div>
    </div>
  ), document.body);
}

function ContactSection({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:".08em",
        color:"var(--fg-3)", marginBottom:4,
      }}>{label}</div>
      <div style={{ fontSize:13, color:"var(--fg-1)" }}>{children}</div>
    </div>
  );
}

const contactLink = {
  color:"var(--tw-blue-800)",
  textDecoration:"none",
  fontWeight:500,
};

Object.assign(window, { ContactDetails });
