// ============================================================
// FEE DEFAULTER REPORT — Uses fresh Supabase data (Fix #2)
// ============================================================
import { useState } from "react";
import { useFreshData } from "../lib/usefreshdata.js";
import { useStore } from "../lib/store.js";
import { APP_CONFIG, MONTHS, YEARS } from "../config/supabase.js";
import { PageHeader, Table, Td, TrHover, MiniCard, THEME } from "../components/UI.jsx";

const now = new Date();

export default function DefaulterReport() {
    const [selMonth, setSelMonth] = useState(MONTHS[now.getMonth()]);
    const [selYear, setSelYear] = useState(now.getFullYear());
    const [minMonths, setMinMonths] = useState(1);
    const { fmt } = useStore();

    // Fix #2 — fetch fresh data
    const { data, loading, error } = useFreshData([
        { name: "students", order: "num.asc" },
        { name: "fee_payments", order: "created_at.desc" },
    ]);

    if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>⏳ Loading fresh data...</div>;
    if (error) return <div style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>❌ {error}</div>;

    const students = data["students"] || [];
    const fees = data["fee_payments"] || [];

    // Find students who haven't paid for selected month
    const defaulters = students
        .filter(s => s.status === "Active")
        .map(s => {
            const fee = fees.find(f =>
                f.student_id === s.student_id && f.month === selMonth && f.year === selYear
            );
            let unpaidMonths = 0;
            for (let i = 0; i < 12; i++) {
                const mIdx = MONTHS.indexOf(selMonth) - i;
                const m = MONTHS[((mIdx % 12) + 12) % 12];
                const y = mIdx < 0 ? selYear - 1 : selYear;
                const f2 = fees.find(x => x.student_id === s.student_id && x.month === m && x.year === y);
                if (!f2 || f2.status !== "Paid") unpaidMonths++;
                else break;
            }
            const status = fee ? fee.status : "No Record";
            const pending = fee ? ((fee.total_amount || 0) - (fee.paid_amount || 0)) : (s.monthly_fee || 0);
            return { ...s, feeStatus: status, pendingAmount: pending, unpaidMonths };
        })
        .filter(s => s.feeStatus !== "Paid" && s.unpaidMonths >= minMonths)
        .sort((a, b) => b.unpaidMonths - a.unpaidMonths);

    const totalPending = defaulters.reduce((sum, s) => sum + s.pendingAmount, 0);

    const handlePrint = () => {
        const rows = defaulters.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${s.name}</td>
        <td>${s.class} ${s.section || ""}</td>
        <td>${s.father_name || ""}</td>
        <td>${s.phone || ""}</td>
        <td>${s.feeStatus}</td>
        <td style="color:red">₹${s.pendingAmount}</td>
        <td>${s.unpaidMonths} month(s)</td>
      </tr>`).join("");

        const html = `<html><head><title>Fee Defaulter Report</title>
    <style>
      body { font-family: Arial; padding: 20px; }
      h2 { text-align: center; }
      p  { text-align: center; color: #555; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
      th { background: #1a1a2e; color: #fff; padding: 8px; }
      td { padding: 7px 8px; border-bottom: 1px solid #eee; }
      .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #999; }
    </style></head><body>
    <h2>Fee Defaulter Report</h2>
    <p>${selMonth} ${selYear} &nbsp;|&nbsp; Total Pending: ₹${totalPending.toLocaleString("en-IN")}</p>
    <table>
      <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Father</th><th>Phone</th><th>Status</th><th>Pending</th><th>Unpaid For</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">Generated on ${new Date().toLocaleDateString("en-IN")} · School Management System</div>
    </body></html>`;

        const w = window.open("", "_blank", "width=900,height=600");
        w.document.write(html);
        w.document.close();
        w.print();
    };

    return (
        <div>
            <PageHeader title="⚠️ Fee Defaulter Report"
                sub="Students with pending fees"
                action={
                    <button onClick={handlePrint}
                        style={{
                            padding: "8px 16px", background: "#1a1a2e", color: "#fff",
                            border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600
                        }}>
                        🖨️ Print Report
                    </button>
                } />

            {/* Filters */}
            <div style={{
                background: "#fff", borderRadius: 10, padding: "14px 18px",
                border: "1px solid #e5e7eb", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap"
            }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Show defaulters for:</span>
                <select value={selMonth} onChange={e => setSelMonth(e.target.value)} style={SS.sel}>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                </select>
                <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} style={SS.sel}>
                    {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
                <span style={{ fontSize: 13, color: "#6b7280", marginLeft: 8 }}>Unpaid for at least:</span>
                <select value={minMonths} onChange={e => setMinMonths(parseInt(e.target.value))} style={SS.sel}>
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} month{n > 1 ? "s" : ""}</option>)}
                </select>
            </div>

            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                <MiniCard label="Total Defaulters" value={defaulters.length} color={THEME.danger} />
                <MiniCard label="Total Pending" value={fmt(totalPending)} color={THEME.warning} />
                <MiniCard label="Active Students" value={students.filter(s => s.status === "Active").length} />
            </div>

            <Table headers={["#", "Student", "Class", "Father", "Phone", "Status", "Pending", "Unpaid For"]}>
                {defaulters.length === 0
                    ? <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
                        No defaulters found for {selMonth} {selYear} 🎉
                    </td></tr>
                    : defaulters.map((s, i) => (
                        <TrHover key={s.id}>
                            <Td>{i + 1}</Td>
                            <Td bold>{s.name}</Td>
                            <Td>{s.class} {s.section}</Td>
                            <Td>{s.father_name}</Td>
                            <Td>{s.phone}</Td>
                            <Td center>
                                <span style={{
                                    background: "#fee2e2", color: "#991b1b",
                                    padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600
                                }}>
                                    {s.feeStatus}
                                </span>
                            </Td>
                            <Td right bold color={THEME.danger}>{fmt(s.pendingAmount)}</Td>
                            <Td center small>{s.unpaidMonths} month(s)</Td>
                        </TrHover>
                    ))
                }
            </Table>
        </div>
    );
}
const SS = { sel: { padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, background: "#fff" } };