// Buttons.jsx — all colors come from colors_and_type.css (TW Foundations)
const buttonBase = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: 6, borderRadius: "var(--r-lg)", fontFamily: "var(--font-button)",
  fontWeight: 500, cursor: "pointer", border: "1px solid transparent",
  transition: "background .12s, border-color .12s, color .12s",
  userSelect: "none", whiteSpace: "nowrap",
};
const sizes = {
  sm: { height: 32, padding: "0 12px", fontSize: 14 },
  md: { height: 40, padding: "0 16px", fontSize: 16 },
  lg: { height: 48, padding: "0 24px", fontSize: 18 },
};
const variants = {
  primary:     { background: "var(--action-primary)",       color: "var(--fg-on-primary)" },
  secondary:   { background: "var(--action-secondary-bg)",  color: "var(--action-secondary-fg)" },
  outline:     { background: "transparent", borderColor: "var(--border-strong)", color: "var(--action-primary)" },
  link:        { background: "transparent", color: "var(--action-primary)", padding: 0, border: 0 },
  round:       { background: "var(--action-primary)", color: "var(--fg-on-primary)", borderRadius: "var(--r-pill)" },
  destructive: { background: "var(--action-destructive)",   color: "var(--fg-invert)" },
};
function Button({ variant = "primary", size = "md", children, loading, disabled, onClick, icon, style }) {
  const s = { ...buttonBase, ...sizes[size], ...variants[variant],
    ...(disabled || loading ? { opacity: .5, pointerEvents: "none" } : null),
    ...style };
  return (
    <button style={s} onClick={onClick}>
      {loading && <Spinner />}
      {!loading && icon}
      <span>{children}</span>
    </button>
  );
}
function Spinner() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" style={{ animation: "twspin 1s linear infinite" }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none" opacity=".25"/>
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
Object.assign(window, { Button });
