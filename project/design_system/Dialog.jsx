// Dialog.jsx
function Dialog({ open, title, children, onClose, primary, secondary, size = "sm" }) {
  if (!open) return null;
  const w = size === "lg" ? 640 : size === "md" ? 520 : 440;
  return (
    <div style={{
      position:"fixed", inset:0, background:"var(--tw-overlay)", zIndex:100,
      display:"flex", alignItems:"center", justifyContent:"center"
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width:w, background:"var(--bg-surface)", borderRadius:"var(--r-2xl)",
        boxShadow:"var(--shadow-modal)", padding:"20px 20px 24px"
      }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:12 }}>
          <div className="tw-h2" style={{ margin:0 }}>{title}</div>
          <button onClick={onClose} style={{ background:"transparent", border:0, cursor:"pointer", color:"var(--fg-2)", padding:4 }}>
            <X size={18}/>
          </button>
        </div>
        <div style={{ fontFamily:"var(--font-body)", fontSize:15, lineHeight:"20px", color:"var(--fg-1)", marginBottom:20 }}>
          {children}
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          {secondary}
          {primary}
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { Dialog });
