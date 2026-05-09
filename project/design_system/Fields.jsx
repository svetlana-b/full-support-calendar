// Fields.jsx
function Field({ label, caption, error, children, right }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {(label || right) && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          {label && <span style={{ fontFamily:"var(--font-button)", fontWeight:500, fontSize:16, lineHeight:1.5, color:"var(--fg-active)", whiteSpace:"nowrap" }}>{label}</span>}
          {right}
        </div>
      )}
      {children}
      {(caption || error) && (
        <span style={{ fontFamily:"var(--font-ui)", fontSize:14, lineHeight:"20px", color: error ? "var(--state-error)" : "var(--fg-2)" }}>
          {error || caption}
        </span>
      )}
    </label>
  );
}
function Input({ error, icon, ...p }) {
  const [f, setF] = React.useState(false);
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:8, height:40, padding:"0 12px",
      borderRadius:"var(--r-lg)",
      border:`1px solid ${error ? "var(--state-error)" : f ? "var(--action-primary)" : "var(--border-strong)"}`,
      background:"var(--bg-surface)",
      boxShadow: f ? "0 0 0 3px rgba(0,97,255,.15)" : "none"
    }}>
      {icon}
      <input {...p} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{ flex:1, border:0, outline:"none", fontFamily:"var(--font-ui)", fontSize:14, color:"var(--fg-1)", background:"transparent" }}/>
    </div>
  );
}
function Badge({ tone = "blue", children }) {
  const map = {
    // All swatches come straight from Foundations tag pairs
    red:     { bg:"var(--tw-tag-red-bg)",     fg:"var(--tw-tag-red-fg)" },
    emerald: { bg:"var(--tw-tag-emerald-bg)", fg:"var(--tw-tag-emerald-fg)" },
    cyan:    { bg:"var(--tw-tag-cyan-bg)",    fg:"var(--tw-tag-cyan-fg)" },
    blue:    { bg:"var(--tw-tag-blue-bg)",    fg:"var(--tw-tag-blue-fg)" },
    orange:  { bg:"var(--tw-tag-orange-bg)",  fg:"var(--tw-tag-orange-fg)" },
    neutral: { bg:"var(--tw-gray-6)",         fg:"var(--fg-active)" },
  };
  const c = map[tone] || map.blue;
  return <span style={{
    display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px",
    borderRadius:"var(--r-pill)", fontFamily:"var(--font-ui)",
    fontWeight:500, fontSize:12, lineHeight:"16px",
    background:c.bg, color:c.fg
  }}>{children}</span>;
}
Object.assign(window, { Field, Input, Badge });
