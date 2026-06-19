// ============================================================
// SHARED UI COMPONENTS
// ✏️  Edit THEME object to retheme the entire app
// ============================================================
import { useState } from "react";

export const THEME = {
  primary: "#1a1a2e",
  accent: "#0f3460",
  highlight: "#e94560",
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0284c7",
  purple: "#7c3aed",
  text: "var(--color-text-primary)",
  textLight: "var(--color-text-secondary)",
  border: "var(--color-border-tertiary)",
  bg: "var(--color-background-primary)",
  bgAlt: "var(--color-background-secondary)",
};

// ── Overlay + Modal ────────────────────────────────────────
export function Modal({ title, onClose, children, width = "500px" }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: width }} onClick={e => e.stopPropagation()}>
        <div style={S.mHead}>
          <span style={S.mTitle}>{title}</span>
          <button onClick={onClose} style={S.mClose}>✕</button>
        </div>
        <div style={S.mBody}>{children}</div>
      </div>
    </div>
  );
}

// ── Form helpers ───────────────────────────────────────────
export function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={S.label}>
        {label}{required && <span style={{ color: THEME.danger }}> *</span>}
      </label>
      {children}
    </div>
  );
}
export const Input = (p) => <input style={S.input}  {...p} />;
export const Sel = ({ children, ...p }) => <select style={S.input} {...p}>{children}</select>;
export const Textarea = (p) => <textarea style={{ ...S.input, height: 70, resize: "vertical" }} {...p} />;
export function FormRow({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}

// ── Button ─────────────────────────────────────────────────
const BTN_VARIANTS = {
  primary: { background: THEME.accent, color: "#fff" },
  success: { background: THEME.success, color: "#fff" },
  danger: { background: THEME.danger, color: "#fff" },
  warning: { background: THEME.warning, color: "#fff" },
  ghost: { background: "transparent", color: THEME.accent, border: `1px solid ${THEME.accent}` },
  dark: { background: THEME.primary, color: "#fff" },
  info: { background: THEME.info, color: "#fff" },
};
export function Btn({ children, variant = "primary", onClick, type = "button", disabled, style: ex = {}, small }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        ...S.btn, ...(small ? S.btnSm : {}), ...BTN_VARIANTS[variant],
        opacity: disabled ? 0.5 : 1, ...ex
      }}>
      {children}
    </button>
  );
}

// ── Badge ──────────────────────────────────────────────────
const BADGE_MAP = {
  Paid: { bg: "#d1fae5", color: "#065f46" },
  Unpaid: { bg: "#fee2e2", color: "#991b1b" },
  Partial: { bg: "#fef9c3", color: "#854d0e" },
  Active: { bg: "#d1fae5", color: "#065f46" },
  Inactive: { bg: "#fee2e2", color: "#991b1b" },
  Resigned: { bg: "#fee2e2", color: "#991b1b" },
  IN: { bg: "#d1fae5", color: "#065f46" },
  OUT: { bg: "#fee2e2", color: "#991b1b" },
  "No Record": { bg: "#fee2e2", color: "#991b1b" },
};
export function Badge({ status }) {
  const s = BADGE_MAP[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 8px", borderRadius: 10,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap"
    }}>
      {status}
    </span>
  );
}

// ── Stat Card ──────────────────────────────────────────────
export function StatCard({ label, value, icon, color, sub, onClick }) {
  return (
    <div style={{ ...S.card, borderLeft: `4px solid ${color}`, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={S.statLabel}>{label}</p>
          <p style={{ ...S.statValue, color }}>{value}</p>
          {sub && <p style={S.statSub}>{sub}</p>}
        </div>
        <span style={{ fontSize: 26 }}>{icon}</span>
      </div>
    </div>
  );
}

// ── Table ──────────────────────────────────────────────────
export function Table({ headers, children, empty = "No records found." }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>{headers.map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {children || (
            <tr><td colSpan={headers.length} style={S.empty}>{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function Td({ children, center, right, bold, color, small }) {
  return (
    <td style={{
      ...S.td,
      textAlign: center ? "center" : right ? "right" : "left",
      fontWeight: bold ? 600 : 400,
      color: color || THEME.text,
      fontSize: small ? 11 : 13,
    }}>
      {children}
    </td>
  );
}
export function TrHover({ children, style: ex = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <tr style={{ background: hov ? THEME.bgAlt : THEME.bg, ...ex }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      {children}
    </tr>
  );
}

// ── Card ───────────────────────────────────────────────────
export function Card({ children, style: ex = {} }) {
  return <div style={{ ...S.card, ...ex }}>{children}</div>;
}

// ── Page header ────────────────────────────────────────────
export function PageHeader({ title, sub, action }) {
  return (
    <div style={S.pageHeader}>
      <div>
        <h2 style={S.pageTitle}>{title}</h2>
        {sub && <p style={S.pageSub}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Search bar ─────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = "Search..." }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} style={{ ...S.input, width: 220 }} />
  );
}

// ── Mini summary card ──────────────────────────────────────
export function MiniCard({ label, value, color }) {
  return (
    <div style={S.card}>
      <p style={S.statLabel}>{label}</p>
      <p style={{ ...S.statValue, color: color || THEME.accent, fontSize: 20 }}>{value}</p>
    </div>
  );
}

// ── Confirm delete ─────────────────────────────────────────
export function ConfirmDelete({ name, onConfirm, onCancel }) {
  return (
    <Modal title="Confirm Delete" onClose={onCancel} width="360px">
      <p style={{ marginBottom: 20, color: THEME.textLight, fontSize: 14 }}>
        Delete <strong>{name}</strong>? This cannot be undone.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant="danger" onClick={onConfirm}>Delete</Btn>
      </div>
    </Modal>
  );
}

// ── Notice box ─────────────────────────────────────────────
export function Notice({ children, type = "info" }) {
  const colors = {
    info: { bg: "var(--color-background-info)", color: "var(--color-text-info)", border: "var(--color-border-info)" },
    warning: { bg: "#fef9c3", color: "#92400e", border: "#d97706" },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{
      background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: 6,
      padding: "7px 11px", fontSize: 12, color: c.color, marginBottom: 12
    }}>
      {children}
    </div>
  );
}

// ── Loading / Error ────────────────────────────────────────
export function Loading() { return <div style={S.center}>⏳ Loading...</div>; }
export function ErrorMsg({ msg }) { return <div style={{ ...S.center, color: THEME.danger }}>❌ {msg}</div>; }

// ── Progress bar ───────────────────────────────────────────
export function ProgressBar({ pct, color = THEME.success }) {
  return (
    <div style={{ background: THEME.bgAlt, borderRadius: 4, height: 10, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.3s" }} />
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────
const S = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16
  },
  modal: {
    background: "#ffffff", borderRadius: 12, width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)", maxHeight: "92vh",
    display: "flex", flexDirection: "column"
  },
  mHead: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "13px 18px", background: THEME.primary,
    borderRadius: "12px 12px 0 0"
  },
  mTitle: { color: "#fff", fontSize: 14, fontWeight: 600 },
  mClose: {
    background: "rgba(255,255,255,0.18)", border: "none", color: "#fff",
    width: 26, height: 26, borderRadius: 6, cursor: "pointer", fontSize: 13
  },
  mBody: { padding: 18, overflowY: "auto", background: "#ffffff" },
  label: { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#1a1a2e" },
  input: {
    width: "100%", padding: "8px 10px", border: `1px solid #d1d5db`,
    borderRadius: 7, fontSize: 13, fontFamily: "inherit",
    background: "#ffffff", color: "#1a1a2e", outline: "none", boxSizing: "border-box"
  },
  btn: {
    padding: "8px 14px", border: "none", borderRadius: 7, cursor: "pointer",
    fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5
  },
  btnSm: { padding: "4px 9px", fontSize: 11 },
  card: {
    background: THEME.bg, borderRadius: 10, padding: "13px 15px",
    border: `0.5px solid ${THEME.border}`
  },
  statLabel: {
    fontSize: 11, color: THEME.textLight, margin: "0 0 3px",
    textTransform: "uppercase", letterSpacing: 0.4
  },
  statValue: { fontSize: 22, fontWeight: 700, margin: 0 },
  statSub: { fontSize: 11, color: THEME.textLight, margin: "2px 0 0" },
  tableWrap: { overflowX: "auto", borderRadius: 9, border: `0.5px solid ${THEME.border}` },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    background: THEME.primary, color: "#fff", padding: "9px 11px",
    textAlign: "left", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap"
  },
  td: { padding: "9px 11px", borderBottom: `0.5px solid ${THEME.border}`, verticalAlign: "middle" },
  empty: { padding: 40, textAlign: "center", color: THEME.textLight },
  pageHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 18, flexWrap: "wrap", gap: 10
  },
  pageTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: THEME.text },
  pageSub: { margin: "3px 0 0", fontSize: 12, color: THEME.textLight },
  center: { textAlign: "center", padding: 60, color: THEME.textLight },
};

// ── Pagination ─────────────────────────────────────────────
export function Pagination({ total, page, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        style={PB(page === 1)}>‹</button>
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)}
          style={{
            ...PB(false), background: p === page ? THEME.primary : "transparent",
            color: p === page ? "#fff" : THEME.text, fontWeight: p === page ? 700 : 400
          }}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        style={PB(page === totalPages)}>›</button>
      <span style={{ fontSize: 12, color: THEME.textLight, marginLeft: 8 }}>
        {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
    </div>
  );
}
function PB(disabled) {
  return {
    padding: "5px 10px", border: `1px solid ${THEME.border}`, borderRadius: 6,
    cursor: disabled ? "default" : "pointer", fontSize: 13,
    background: "transparent", color: disabled ? THEME.textLight : THEME.text,
    opacity: disabled ? 0.4 : 1
  };
}