// ContactDetails.jsx — read-only contact popover for Tier 2 / weekend coverage.
// Triggered by clicking a name in the calendar. Pulls phone + preferred
// messengers from the `contacts/{Full Name}` Firestore collection (passed in
// as a `contact` prop), and falls back to the employee record for slack/email.
//
// Sections render only when their underlying field is present, so people
// with partial contact info still get a clean card.
//
// Portals to document.body so it escapes the design-canvas transform.

// Fixed sky-blue chrome from the Pro-Support Schedule app (index.html):
// modal border, chips, and links are always sky-blue regardless of role.
// Only the initials avatar tint is role-aware.
const _SKY_RING  = "rgba(56,189,248,0.3)";
const _SKY_CHIP  = { bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.2)", fg: "var(--role-tier2-fg)" };

function ContactDetails({ employee, contact, onClose }) {
  if (!employee) return null;
  const messengers = (contact && Array.isArray(contact.messengers)) ? contact.messengers : [];
  const phone = contact && contact.phone ? contact.phone : "";
  const role = employee.roleRaw || employee.role || "";
  const teamAccent = roleAvatarTint(role);

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
        border: `1px solid ${_SKY_RING}`,
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

        {/* Identity row — avatar tint is role-aware; everything else is sky-blue */}
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
              <a href={telHref} style={{...contactLink, color: _SKY_CHIP.fg}}>{displayPhone}</a>
            </ContactSection>
          )}

          {messengers.length > 0 && (
            <ContactSection label="Preferred messenger">
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {messengers.map(m => (
                  <span key={m} style={{
                    display:"inline-flex", alignItems:"center",
                    height:24, padding:"0 10px",
                    background: _SKY_CHIP.bg, border:`1px solid ${_SKY_CHIP.border}`,
                    color: _SKY_CHIP.fg,
                    borderRadius:"var(--r-pill)",
                    fontSize:12, fontWeight:500,
                  }}>{m}</span>
                ))}
              </div>
            </ContactSection>
          )}

          {employee.slackUrl && (
            <ContactSection label="Slack">
              <a href={employee.slackUrl} target="_blank" rel="noreferrer" style={{...contactLink, color: _SKY_CHIP.fg}}>Open in Slack ↗</a>
            </ContactSection>
          )}

          {employee.email && (
            <ContactSection label="Email">
              <a href={`mailto:${employee.email}`} style={{...contactLink, color: _SKY_CHIP.fg}}>{employee.email}</a>
            </ContactSection>
          )}

          {!phone && messengers.length === 0 && !employee.slackUrl && !employee.email && (
            <div style={{ fontSize:12, color:"var(--fg-3)", fontStyle:"italic", padding:"8px 0" }}>
              No contact info on file.
            </div>
          )}
        </div>

        {/* Footer disclaimer — matches index.html: 🔒 emoji + centered text */}
        <div style={{
          padding:"12px 20px",
          borderTop:"1px solid var(--border-weak)",
          textAlign:"center",
          fontSize:13, fontWeight:500, color:"var(--fg-2)",
        }}>
          🔒 Phone number can be used <strong style={{ fontWeight:700 }}>ONLY</strong> by Support members
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
