// ============================================================
// ANALYTICS PAGE — Uses fresh Supabase data (Fix #2)
// ============================================================
import { useState } from "react";
import { useFreshData } from "../lib/usefreshdata.js";
import { useStore } from "../lib/store.js";
import { APP_CONFIG, MONTHS, YEARS } from "../config/supabase.js";
import { PageHeader, THEME } from "../components/UI.jsx";

const now = new Date();

// ── Mini stat card ─────────────────────────────────────────
function KPI({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "16px 18px",
      border: `1px solid #e5e7eb`, borderTop: `3px solid ${color}`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{
            fontSize: 11, color: "#6b7280", margin: "0 0 6px",
            textTransform: "uppercase", letterSpacing: 0.5
          }}>{label}</p>
          <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
          {sub && <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>{sub}</p>}
        </div>
        <span style={{ fontSize: 24, opacity: 0.7 }}>{icon}</span>
      </div>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "18px 20px",
      border: "1px solid #e5e7eb"
    }}>
      <p style={{
        margin: "0 0 16px", fontSize: 13, fontWeight: 700,
        color: "#1a1a2e", borderBottom: "1px solid #f3f4f6", paddingBottom: 10
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Horizontal bar ─────────────────────────────────────────
function Bar({ label, value, max, color, formatted }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: 12, marginBottom: 4
      }}>
        <span style={{ color: "#374151" }}>{label}</span>
        <span style={{ fontWeight: 600, color }}>{formatted}</span>
      </div>
      <div style={{ background: "#f3f4f6", borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: color,
          borderRadius: 4, transition: "width 0.4s ease"
        }} />
      </div>
    </div>
  );
}

// ── Donut-style progress ───────────────────────────────────
function RingProgress({ pct, color, label, value }) {
  const r = 36, c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#f3f4f6" strokeWidth="9" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          transform="rotate(-90 45 45)" />
        <text x="45" y="45" textAnchor="middle" dominantBaseline="middle"
          fontSize="14" fontWeight="700" fill={color}>{pct}%</text>
      </svg>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{label}</p>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: "#6b7280" }}>{value}</p>
      </div>
    </div>
  );
}

// ── Status row ─────────────────────────────────────────────
function StatusRow({ name, status }) {
  const colors = {
    Paid: { bg: "#d1fae5", color: "#065f46" },
    Unpaid: { bg: "#fee2e2", color: "#991b1b" },
    "No Record": { bg: "#fee2e2", color: "#991b1b" },
  };
  const s = colors[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", borderBottom: "1px solid #f9fafb", fontSize: 13
    }}>
      <span style={{ color: "#374151" }}>{name}</span>
      <span style={{
        background: s.bg, color: s.color, padding: "2px 10px",
        borderRadius: 10, fontSize: 11, fontWeight: 600
      }}>
        {status}
      </span>
    </div>
  );
}

export default function Analytics() {
  const [selMonth, setSelMonth] = useState(MONTHS[now.getMonth()]);
  const [selYear, setSelYear] = useState(now.getFullYear());
  const { settings } = useStore();
  const cf = (n) => (settings.currency || "₹") + Math.round(n || 0).toLocaleString("en-IN");

  // Fix #2 — always fetch fresh from Supabase
  const { data, loading, error } = useFreshData([
    { name: "fee_payments", order: "created_at.desc" },
    { name: "expenses", order: "expense_date.desc" },
    { name: "salary_payments", order: "created_at.desc" },
    { name: "petty_cash", order: "cash_date.desc" },
    { name: "staff", order: "num.asc" },
  ]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>⏳ Loading fresh data...</div>;
  if (error) return <div style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>❌ {error}</div>;

  const fees = data["fee_payments"] || [];
  const exps = data["expenses"] || [];
  const salary = data["salary_payments"] || [];
  const petty = data["petty_cash"] || [];
  const staff = data["staff"] || [];

  const monthIdx = MONTHS.indexOf(selMonth);
  const mm = String(monthIdx + 1).padStart(2, "0");
  const mFees = fees.filter(f => f.month === selMonth && f.year === selYear);
  const mExp = exps.filter(e => e.expense_date?.startsWith(`${selYear}-${mm}`));
  const mSal = salary.filter(s => s.month === selMonth && s.year === selYear);
  const mPetty = petty.filter(p => p.cash_date?.startsWith(`${selYear}-${mm}`));

  const collected = mFees.filter(f => f.status === "Paid").reduce((s, f) => s + (f.paid_amount || 0), 0);
  const pending = mFees.filter(f => f.status !== "Paid").reduce((s, f) => s + ((f.total_amount || 0) - (f.paid_amount || 0)), 0);
  const totalExp = mExp.reduce((s, e) => s + (e.amount || 0), 0);
  const salPaid = mSal.filter(s => s.status === "Paid").reduce((s, r) => s + (r.net_salary || 0), 0);
  const net = collected - totalExp - salPaid;
  const paidCount = mFees.filter(f => f.status === "Paid").length;
  const totalRec = mFees.length;
  const paidPct = totalRec ? Math.round((paidCount / totalRec) * 100) : 0;
  const pettyIn = mPetty.filter(p => p.type === "IN").reduce((s, p) => s + (p.amount || 0), 0);
  const pettyOut = mPetty.filter(p => p.type === "OUT").reduce((s, p) => s + (p.amount || 0), 0);

  // Category breakdown
  const catMap = {};
  mExp.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries[0]?.[1] || 1;

  // All-time (from fresh data)
  const allCollected = fees.filter(f => f.status === "Paid").reduce((s, f) => s + (f.paid_amount || 0), 0);
  const allExp = exps.reduce((s, e) => s + (e.amount || 0), 0);
  const allSal = salary.filter(s => s.status === "Paid").reduce((s, r) => s + (r.net_salary || 0), 0);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <PageHeader title="📈 Analytics" sub="Financial insights" />

      {/* Month Picker */}
      <div style={{
        background: "#fff", borderRadius: 10, padding: "14px 18px",
        border: "1px solid #e5e7eb", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap"
      }}>
        <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>Viewing:</span>
        <select value={selMonth} onChange={e => setSelMonth(e.target.value)} style={SS.sel}>
          {MONTHS.map(m => <option key={m}>{m}</option>)}
        </select>
        <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} style={SS.sel}>
          {YEARS.map(y => <option key={y}>{y}</option>)}
        </select>
        <span style={{
          marginLeft: "auto", fontSize: 12, color: "#6b7280",
          background: "#f9fafb", padding: "5px 12px", borderRadius: 20,
          border: "1px solid #e5e7eb"
        }}>
          📅 {selMonth} {selYear}
        </span>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <KPI label="Fee Collected" value={cf(collected)} color={THEME.success} icon="💰" sub={`${paidCount} of ${totalRec} paid`} />
        <KPI label="Fee Pending" value={cf(pending)} color={THEME.warning} icon="⏳" sub={`${totalRec - paidCount} unpaid`} />
        <KPI label="Expenses" value={cf(totalExp)} color={THEME.danger} icon="🧾" sub={`${mExp.length} records`} />
        <KPI label="Salary Paid" value={cf(salPaid)} color={THEME.info} icon="👥" sub={`${mSal.filter(s => s.status === "Paid").length} staff paid`} />
      </div>

      {/* Net Balance + Fee Rate */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Net Balance */}
        <Section title={`💹 Net Balance — ${selMonth} ${selYear}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 4px", textTransform: "uppercase" }}>Net</p>
              <p style={{
                fontSize: 32, fontWeight: 700, margin: 0,
                color: net >= 0 ? THEME.success : THEME.danger
              }}>
                {cf(net)}
              </p>
            </div>
            <div style={{ flex: 1, borderLeft: "1px solid #f3f4f6", paddingLeft: 20 }}>
              {[
                ["Income", cf(collected), THEME.success, "+"],
                ["Expenses", cf(totalExp), THEME.danger, "−"],
                ["Salary", cf(salPaid), THEME.danger, "−"],
              ].map(([l, v, c, sign]) => (
                <div key={l} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 13, padding: "5px 0",
                  borderBottom: "1px solid #f9fafb"
                }}>
                  <span style={{ color: "#6b7280" }}>{l}</span>
                  <span style={{ fontWeight: 600, color: c }}>{sign} {v}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Fee Collection Rate */}
        <Section title="🎯 Fee Collection Rate">
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "8px 0" }}>
            <RingProgress pct={paidPct} color={THEME.success} label="Paid"
              value={`${paidCount} of ${totalRec} records`} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Paid", mFees.filter(f => f.status === "Paid").length, "#d1fae5", "#065f46"],
                ["Partial", mFees.filter(f => f.status === "Partial").length, "#fef9c3", "#854d0e"],
                ["Unpaid", mFees.filter(f => f.status === "Unpaid").length, "#fee2e2", "#991b1b"],
              ].map(([l, v, bg, color]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    background: bg, color, padding: "2px 10px",
                    borderRadius: 10, fontSize: 11, fontWeight: 600
                  }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Expense Breakdown + Staff Salary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Section title="🧾 Expense Breakdown">
          {catEntries.length === 0
            ? <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              No expenses for {selMonth} {selYear}
            </p>
            : catEntries.map(([cat, amt]) => (
              <Bar key={cat} label={cat} value={amt} max={maxCat}
                color={THEME.danger} formatted={cf(amt)} />
            ))
          }
        </Section>

        <Section title="👥 Staff Salary Status">
          {staff.filter(s => s.status === "Active").length === 0
            ? <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              No active staff
            </p>
            : staff.filter(s => s.status === "Active").map(s => {
              const sal = mSal.find(x => x.staff_id === s.staff_id);
              return <StatusRow key={s.id} name={s.name} status={sal ? sal.status : "No Record"} />;
            })
          }
        </Section>
      </div>

      {/* Petty Cash + All-time */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Section title="💵 Petty Cash">
          {mPetty.length === 0
            ? <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              No petty cash entries for {selMonth} {selYear}
            </p>
            : <>
              {mPetty.map(p => (
                <div key={p.id} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 13, padding: "7px 0",
                  borderBottom: "1px solid #f9fafb"
                }}>
                  <span style={{ color: "#374151" }}>{p.purpose}</span>
                  <span style={{
                    fontWeight: 600,
                    color: p.type === "IN" ? THEME.success : THEME.danger
                  }}>
                    {p.type === "IN" ? "+" : "−"}{cf(p.amount)}
                  </span>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 13, fontWeight: 700, padding: "10px 0 0",
                marginTop: 6, borderTop: "2px solid #f3f4f6"
              }}>
                <span>Net</span>
                <span style={{ color: THEME.info }}>{cf(pettyIn - pettyOut)}</span>
              </div>
            </>
          }
        </Section>

        <Section title="📊 All-Time Totals">
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" }}>
            {[
              ["Total Fees Collected", allCollected, THEME.success, "💰"],
              ["Total Expenses", allExp, THEME.danger, "🧾"],
              ["Total Salary Paid", allSal, THEME.info, "👥"],
              ["Overall Net", allCollected - allExp - allSal,
                (allCollected - allExp - allSal) >= 0 ? THEME.success : THEME.danger, "📈"],
            ].map(([l, v, c, icon]) => (
              <div key={l} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "10px 14px",
                background: "#f9fafb", borderRadius: 8,
                border: "1px solid #f3f4f6"
              }}>
                <span style={{ fontSize: 13, color: "#374151" }}>{icon} {l}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: c }}>{cf(v)}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

const SS = {
  sel: {
    padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 7,
    fontSize: 13, background: "#fff", color: "#1a1a2e", cursor: "pointer"
  },
};