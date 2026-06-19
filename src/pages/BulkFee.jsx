// ============================================================
// BULK FEE GENERATION — Fix #4 (batch insert)
// ============================================================
import { useState } from "react";
import { DB, AuditAPI, batchInsert, generateReceiptNo } from "../lib/api.js";
import { APP_CONFIG, MONTHS, YEARS } from "../config/supabase.js";
import { useStore } from "../lib/store.js";
import { PageHeader, Notice, Btn, MiniCard, Table, Td, TrHover, THEME } from "../components/UI.jsx";

const now = new Date();

export default function BulkFee({ currentUser }) {
    const [selMonth, setSelMonth] = useState(MONTHS[now.getMonth()]);
    const [selYear, setSelYear] = useState(now.getFullYear());
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState(null);
    const { getFeeForClass, fmt } = useStore();

    const activeStudents = DB.students.filter(s => s.status === "Active");

    const alreadyHave = activeStudents.filter(s =>
        DB.fees.find(f => f.student_id === s.student_id && f.month === selMonth && f.year === selYear)
    );
    const willGenerate = activeStudents.filter(s =>
        !DB.fees.find(f => f.student_id === s.student_id && f.month === selMonth && f.year === selYear)
    );

    const handleGenerate = async () => {
        if (!willGenerate.length) { alert("All students already have fee records for this month."); return; }
        if (!window.confirm(`Generate fee records for ${willGenerate.length} students for ${selMonth} ${selYear}?`)) return;

        setRunning(true); setResults(null);
        try {
            // Build all rows at once — one API call instead of N calls
            const rows = willGenerate.map(student => {
                const structure = getFeeForClass(student.class);
                const tuition = structure ? structure.tuition_fee : (student.monthly_fee || 0);
                const transport = structure ? structure.transport_fee : 0;
                const library = structure ? structure.library_fee : 0;
                const sports = structure ? structure.sports_fee : 0;
                const other = structure ? structure.other_fee : 0;
                const total = tuition + transport + library + sports + other;
                return {
                    receipt_no: generateReceiptNo(),
                    student_id: student.student_id,
                    student_name: student.name,
                    class: student.class,
                    month: selMonth,
                    year: parseInt(selYear),
                    tuition_fee: tuition,
                    transport_fee: transport,
                    library_fee: library,
                    sports_fee: sports,
                    other_fee: other,
                    total_amount: total,
                    paid_amount: 0,
                    status: "Unpaid",
                    payment_mode: "",
                    payment_date: "",
                    notes: "Auto-generated",
                };
            });

            // Single batch insert — much faster
            await batchInsert("fee_payments", rows);
            await AuditAPI.log(currentUser, "CREATE", "fee_payments", "bulk",
                `Bulk generated ${rows.length} fees for ${selMonth} ${selYear}`);

            setResults({ created: rows.length, skipped: alreadyHave.length, errors: [] });

            // Refresh DB cache
            const { FeesAPI } = await import("../lib/api.js");
            DB._cache["fee_payments"] = await FeesAPI.getAll();
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div>
            <PageHeader title="⚡ Bulk Fee Generation"
                sub="Generate fee records for all active students at once" />

            <Notice>
                Generates <strong>Unpaid</strong> fee records for all active students in one fast batch.
                Students who already have a record for that month are skipped automatically.
                Fee amounts come from Fee Structure — falls back to student's individual monthly fee.
            </Notice>

            <div style={{
                background: "#fff", borderRadius: 10, padding: "14px 18px",
                border: "1px solid #e5e7eb", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap"
            }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Generate fees for:</span>
                <select value={selMonth} onChange={e => setSelMonth(e.target.value)} style={SS.sel}>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                </select>
                <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} style={SS.sel}>
                    {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
                <Btn onClick={handleGenerate} disabled={running || !willGenerate.length} style={{ marginLeft: "auto" }}>
                    {running ? "⏳ Generating..." : `⚡ Generate for ${willGenerate.length} Students`}
                </Btn>
            </div>

            {results && (
                <div style={{
                    background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 10,
                    padding: "14px 18px", marginBottom: 16
                }}>
                    <p style={{ fontWeight: 700, color: "#065f46", margin: "0 0 4px" }}>✅ Done!</p>
                    <p style={{ fontSize: 13, color: "#065f46", margin: 0 }}>
                        {results.created} fee records created in one batch · {results.skipped} skipped
                    </p>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                <MiniCard label="Active Students" value={activeStudents.length} />
                <MiniCard label="Will Generate" value={willGenerate.length} color={THEME.success} />
                <MiniCard label="Already Have Record" value={alreadyHave.length} color={THEME.warning} />
            </div>

            <Table headers={["Student", "Class", "Status", "Monthly Fee", "Action"]}>
                {activeStudents.map(s => {
                    const existing = DB.fees.find(f =>
                        f.student_id === s.student_id && f.month === selMonth && f.year === selYear
                    );
                    return (
                        <TrHover key={s.id}>
                            <Td bold>{s.name}<div style={{ fontSize: 11, color: THEME.textLight }}>{s.student_id}</div></Td>
                            <Td>{s.class} {s.section}</Td>
                            <Td center>
                                {existing
                                    ? <span style={{ background: "#fef9c3", color: "#854d0e", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                        Already exists ({existing.status})
                                    </span>
                                    : <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                        Will generate
                                    </span>
                                }
                            </Td>
                            <Td right>{fmt(s.monthly_fee)}</Td>
                            <Td small color={THEME.textLight}>{existing ? "Skip" : "Create Unpaid record"}</Td>
                        </TrHover>
                    );
                })}
            </Table>
        </div>
    );
}
const SS = { sel: { padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, background: "#fff" } };