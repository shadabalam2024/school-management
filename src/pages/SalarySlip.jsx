// ============================================================
// SALARY SLIP — Feature #6
// Print formatted salary slip for any staff member
// ============================================================
import { useState } from "react";
import { DB } from "../lib/api.js";
import { APP_CONFIG, MONTHS, YEARS } from "../config/supabase.js";
import { printSalarySlip } from "../lib/printhelpers.js";
import { PageHeader, MiniCard, THEME } from "../components/UI.jsx";

const now = new Date();

function printSlip(sal, staff, settings = {}) {
    const schoolName = settings.school_name || APP_CONFIG.schoolName;
    const address = settings.school_address || "";
    const phone = settings.school_phone || "";

    const html = `<html><head><title>Salary Slip</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #1a1a2e; }
    .box { max-width: 520px; margin: 0 auto; border: 2px solid #1a1a2e; border-radius: 8px; overflow: hidden; }
    .header { background: #1a1a2e; color: #fff; padding: 18px 20px; text-align: center; }
    .header h2 { margin: 0; font-size: 20px; }
    .header p  { margin: 4px 0 0; font-size: 12px; opacity: 0.7; }
    .slip-title { background: #f3f4f6; padding: 10px 20px; font-size: 13px; font-weight: 700;
                  text-align: center; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb; }
    .section { padding: 14px 20px; }
    .row { display: flex; justify-content: space-between; padding: 5px 0;
           border-bottom: 1px solid #f9fafb; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 0; }
    .total-row { display: flex; justify-content: space-between; padding: 12px 20px;
                 background: #f0fdf4; font-size: 15px; font-weight: 700; }
    .deduct-row { display: flex; justify-content: space-between; padding: 12px 20px;
                  background: #fff5f5; font-size: 13px; }
    .footer { padding: 14px 20px; text-align: center; font-size: 11px; color: #9ca3af;
              border-top: 1px solid #e5e7eb; }
    .sign-row { display: flex; justify-content: space-between; padding: 20px 20px 10px; }
    .sign { text-align: center; font-size: 12px; color: #6b7280; }
    .sign-line { border-top: 1px solid #1a1a2e; width: 120px; margin: 0 auto 4px; }
  </style></head><body>
  <div class="box">
    <div class="header">
      <h2>${schoolName}</h2>
      <p>${address}${phone ? " · " + phone : ""}</p>
    </div>
    <div class="slip-title">SALARY SLIP — ${sal.month?.toUpperCase()} ${sal.year}</div>
    <div class="section">
      <div class="row"><span class="label">Employee Name</span><span class="value">${sal.staff_name}</span></div>
      <div class="row"><span class="label">Staff ID</span><span class="value">${sal.staff_id}</span></div>
      <div class="row"><span class="label">Designation</span><span class="value">${staff?.designation || "—"}</span></div>
      <div class="row"><span class="label">Department</span><span class="value">${staff?.department || "—"}</span></div>
      <div class="row"><span class="label">Payment Mode</span><span class="value">${sal.payment_mode || "—"}</span></div>
      <div class="row"><span class="label">Payment Date</span><span class="value">${sal.payment_date || "—"}</span></div>
    </div>
    <hr class="divider">
    <div class="section">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase">Earnings</p>
      <div class="row"><span class="label">Basic Salary</span><span class="value" style="color:#059669">₹${(sal.basic_salary || 0).toLocaleString("en-IN")}</span></div>
      <div class="row"><span class="label">Allowances</span><span class="value" style="color:#059669">₹${(sal.allowances || 0).toLocaleString("en-IN")}</span></div>
    </div>
    <div class="deduct-row">
      <span>Deductions</span>
      <span style="color:#dc2626">− ₹${(sal.deductions || 0).toLocaleString("en-IN")}</span>
    </div>
    <div class="total-row">
      <span>NET SALARY</span>
      <span style="color:#059669">₹${(sal.net_salary || 0).toLocaleString("en-IN")}</span>
    </div>
    <div class="sign-row">
      <div class="sign"><div class="sign-line"></div>Employee Signature</div>
      <div class="sign"><div class="sign-line"></div>Authorised Signatory</div>
    </div>
    <div class="footer">Computer generated salary slip · ${schoolName}</div>
  </div>
  </body></html>`;

    const w = window.open("", "_blank", "width=600,height=700");
    w.document.write(html);
    w.document.close();
    w.print();
}

export default function SalarySlip() {
    const [selStaff, setSelStaff] = useState("");
    const [selMonth, setSelMonth] = useState(MONTHS[now.getMonth()]);
    const [selYear, setSelYear] = useState(now.getFullYear());
    const cf = APP_CONFIG.currencyFormat;

    const salRecord = DB.salary.find(s =>
        s.staff_id === selStaff && s.month === selMonth && s.year === selYear
    );
    const staffMember = DB.staff.find(s => s.staff_id === selStaff);

    return (
        <div>
            <PageHeader title="🧾 Salary Slip" sub="Generate and print salary slips for staff" />

            {/* Selector */}
            <div style={{
                background: "#fff", borderRadius: 10, padding: "18px 20px",
                border: "1px solid #e5e7eb", marginBottom: 20
            }}>
                <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>Select Staff & Month</p>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                    <div>
                        <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Staff Member</label>
                        <select value={selStaff} onChange={e => setSelStaff(e.target.value)} style={{ ...SS.sel, width: "100%" }}>
                            <option value="">-- Select Staff --</option>
                            {DB.staff.filter(s => s.status === "Active").map(s => (
                                <option key={s.id} value={s.staff_id}>{s.staff_id} — {s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Month</label>
                        <select value={selMonth} onChange={e => setSelMonth(e.target.value)} style={{ ...SS.sel, width: "100%" }}>
                            {MONTHS.map(m => <option key={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Year</label>
                        <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} style={{ ...SS.sel, width: "100%" }}>
                            {YEARS.map(y => <option key={y}>{y}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={() => salRecord ? printSalarySlip(salRecord, staffMember) : alert("No salary record found for this staff and month.")}
                        style={{
                            padding: "9px 18px", background: "#1a1a2e", color: "#fff", border: "none",
                            borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap"
                        }}>
                        🖨️ Print Slip
                    </button>
                </div>
            </div>

            {/* Preview */}
            {selStaff && (
                salRecord ? (
                    <div style={{
                        background: "#fff", borderRadius: 10, padding: "20px",
                        border: "1px solid #e5e7eb", maxWidth: 500
                    }}>
                        <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>
                            Preview — {salRecord.staff_name} · {selMonth} {selYear}
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                            <MiniCard label="Basic Salary" value={cf(salRecord.basic_salary)} color={THEME.success} />
                            <MiniCard label="Allowances" value={cf(salRecord.allowances)} color={THEME.success} />
                            <MiniCard label="Deductions" value={cf(salRecord.deductions)} color={THEME.danger} />
                            <MiniCard label="Net Salary" value={cf(salRecord.net_salary)} color={THEME.accent} />
                        </div>
                        <div style={{
                            display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0",
                            borderTop: "2px solid #f3f4f6"
                        }}>
                            <span style={{ color: "#6b7280" }}>Payment Mode</span>
                            <span style={{ fontWeight: 600 }}>{salRecord.payment_mode || "—"}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0" }}>
                            <span style={{ color: "#6b7280" }}>Status</span>
                            <span style={{ fontWeight: 600, color: salRecord.status === "Paid" ? THEME.success : THEME.danger }}>
                                {salRecord.status}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10,
                        padding: "20px", textAlign: "center", color: THEME.danger, fontSize: 13
                    }}>
                        No salary record found for {staffMember?.name} in {selMonth} {selYear}.
                        Please add the salary record first from Staff & Salary page.
                    </div>
                )
            )}
        </div>
    );
}
const SS = { sel: { padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, background: "#fff" } };