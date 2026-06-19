// ============================================================
// DATA EXPORT — Fix #8 (always fresh data from Supabase)
// ============================================================
import { useState } from "react";
import { useFreshData } from "../lib/usefreshdata.js";
import { APP_CONFIG, MONTHS, YEARS } from "../config/supabase.js";
import { PageHeader, Loading, ErrorMsg, THEME } from "../components/UI.jsx";

function downloadCSV(filename, rows, headers) {
    const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
        headers.map(escape).join(","),
        ...rows.map(r => headers.map(h => escape(r[h] ?? "")).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

export default function DataExport() {
    const [selMonth, setSelMonth] = useState("All");
    const [selYear, setSelYear] = useState(0);

    const { data, loading, error, refresh } = useFreshData([
        { name: "students", order: "num.asc" },
        { name: "fee_payments", order: "year.desc" },
        { name: "expenses", order: "expense_date.desc" },
        { name: "petty_cash", order: "cash_date.desc" },
        { name: "staff", order: "num.asc" },
        { name: "salary_payments", order: "year.desc" },
    ]);

    if (loading) return <Loading />;
    if (error) return <ErrorMsg msg={error} />;

    const EXPORTS = [
        {
            id: "students", label: "Students", icon: "🎓", color: THEME.accent,
            headers: ["student_id", "name", "father_name", "class", "section", "phone", "reg_date", "monthly_fee", "status"],
            rows: data["students"] || []
        },
        {
            id: "fees", label: "Fee Payments", icon: "💰", color: THEME.success,
            headers: ["receipt_no", "student_name", "class", "month", "year", "tuition_fee", "transport_fee", "library_fee", "sports_fee", "total_amount", "paid_amount", "status", "payment_mode", "payment_date"],
            rows: data["fee_payments"] || []
        },
        {
            id: "expenses", label: "Expenses", icon: "🧾", color: THEME.danger,
            headers: ["expense_date", "category", "description", "vendor", "amount", "payment_mode"],
            rows: data["expenses"] || []
        },
        {
            id: "petty", label: "Petty Cash", icon: "💵", color: "#8b5cf6",
            headers: ["cash_date", "type", "amount", "purpose", "recorded_by"],
            rows: data["petty_cash"] || []
        },
        {
            id: "staff", label: "Staff", icon: "👥", color: THEME.info,
            headers: ["staff_id", "name", "designation", "department", "phone", "reg_date", "basic_salary", "allowances", "status"],
            rows: data["staff"] || []
        },
        {
            id: "salary", label: "Salary Payments", icon: "💼", color: "#d97706",
            headers: ["staff_name", "staff_id", "month", "year", "basic_salary", "allowances", "deductions", "net_salary", "status", "payment_mode", "payment_date"],
            rows: data["salary_payments"] || []
        },
    ];

    const filterRows = (exp) => {
        let rows = [...exp.rows];
        if ((exp.id === "fees" || exp.id === "salary") && selMonth !== "All")
            rows = rows.filter(r => r.month === selMonth);
        if ((exp.id === "fees" || exp.id === "salary") && selYear)
            rows = rows.filter(r => r.year === selYear);
        if (exp.id === "expenses" && selMonth !== "All") {
            const mm = String(MONTHS.indexOf(selMonth) + 1).padStart(2, "0");
            const yr = selYear || new Date().getFullYear();
            rows = rows.filter(e => e.expense_date?.startsWith(`${yr}-${mm}`));
        }
        return rows;
    };

    const handleExport = (exp) => {
        const rows = filterRows(exp);
        if (!rows.length) { alert("No data to export for the selected filters."); return; }
        downloadCSV(`${exp.id}_${new Date().toISOString().split("T")[0]}.csv`, rows, exp.headers);
    };

    const handlePrintAll = () => {
        const sections = EXPORTS.map(exp => {
            const rows = exp.rows.slice(0, 100);
            const tRows = rows.map(r =>
                `<tr>${exp.headers.map(h => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`
            ).join("");
            return `
        <h3 style="margin:24px 0 8px;color:#1a1a2e">${exp.icon} ${exp.label} (${exp.rows.length} records)</h3>
        <table>
          <thead><tr>${exp.headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${tRows}</tbody>
        </table>`;
        }).join("");

        const html = `<html><head><title>Full Data Export</title>
    <style>
      body{font-family:Arial;padding:20px;font-size:11px}
      h2{text-align:center;color:#1a1a2e}
      table{width:100%;border-collapse:collapse;margin-bottom:8px}
      th{background:#1a1a2e;color:#fff;padding:5px 6px;text-align:left}
      td{padding:4px 6px;border-bottom:1px solid #f0f0f0}
    </style></head><body>
    <h2>School Management — Full Data Export</h2>
    <p style="text-align:center;color:#999">Generated: ${new Date().toLocaleString("en-IN")}</p>
    ${sections}
    </body></html>`;

        const w = window.open("", "_blank", "width=1100,height=700");
        w.document.write(html); w.document.close(); w.print();
    };

    return (
        <div>
            <PageHeader title="📥 Data Export"
                sub="Download fresh data as CSV or print as PDF"
                action={
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={refresh}
                            style={{
                                padding: "8px 14px", background: "#f3f4f6", border: "1px solid #e5e7eb",
                                borderRadius: 7, cursor: "pointer", fontSize: 13
                            }}>
                            🔄 Refresh
                        </button>
                        <button onClick={handlePrintAll}
                            style={{
                                padding: "8px 14px", background: "#1a1a2e", color: "#fff",
                                border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600
                            }}>
                            🖨️ Print All
                        </button>
                    </div>
                } />

            <div style={{
                background: "#fff", borderRadius: 10, padding: "14px 18px",
                border: "1px solid #e5e7eb", marginBottom: 20,
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap"
            }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Filter Fees/Salary/Expenses by:</span>
                <select value={selMonth} onChange={e => setSelMonth(e.target.value)} style={SS.sel}>
                    <option value="All">All Months</option>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                </select>
                <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} style={SS.sel}>
                    <option value={0}>All Years</option>
                    {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {EXPORTS.map(exp => {
                    const filtered = filterRows(exp);
                    return (
                        <div key={exp.id} style={{
                            background: "#fff", borderRadius: 10, padding: "18px 20px",
                            border: "1px solid #e5e7eb", borderTop: `3px solid ${exp.color}`
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                        {exp.label}
                                    </p>
                                    <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: exp.color }}>
                                        {filtered.length} <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400 }}>records</span>
                                    </p>
                                </div>
                                <span style={{ fontSize: 28 }}>{exp.icon}</span>
                            </div>
                            <button onClick={() => handleExport(exp)}
                                style={{
                                    width: "100%", padding: "8px", background: exp.color, color: "#fff",
                                    border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600
                                }}>
                                ⬇️ Download CSV
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
const SS = { sel: { padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, background: "#fff" } };