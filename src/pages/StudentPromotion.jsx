// ============================================================
// STUDENT PROMOTION — Revamped
// ✅ Select which students to promote / exclude
// ✅ Preview before confirm
// ✅ Undo last promotion (stored in localStorage)
// ✅ Promote individual or all
// ============================================================
import { useState } from "react";
import { DB, StudentsAPI, AuditAPI } from "../lib/api.js";
import { CLASSES } from "../config/supabase.js";
import { PageHeader, Table, Td, TrHover, Btn, Notice, MiniCard, Modal, Badge, THEME } from "../components/UI.jsx";

const UNDO_KEY = "school_promotion_undo";

export default function StudentPromotion({ currentUser }) {
    const activeStudents = DB.students.filter(s => s.status === "Active");

    // Build initial selection — all selected by default
    const [selected, setSelected] = useState(() => new Set(activeStudents.map(s => s.id)));
    const [promoting, setPromoting] = useState(false);
    const [results, setResults] = useState(null);
    const [showUndo, setShowUndo] = useState(!!localStorage.getItem(UNDO_KEY));
    const [undoing, setUndoing] = useState(false);
    const [filterClass, setFilterClass] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const toggle = (id) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const toggleAll = () => {
        if (selected.size === activeStudents.length) setSelected(new Set());
        else setSelected(new Set(activeStudents.map(s => s.id)));
    };

    const promotionPlan = activeStudents
        .filter(s => filterClass === "All" || s.class === filterClass)
        .filter(s => !searchQuery ||
            s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(s => {
            const curIdx = CLASSES.indexOf(s.class);
            const nextCls = curIdx >= 0 && curIdx < CLASSES.length - 1 ? CLASSES[curIdx + 1] : null;
            return { ...s, nextClass: nextCls, willGraduate: !nextCls, isSelected: selected.has(s.id) };
        });

    const toActOn = promotionPlan.filter(s => s.isSelected);
    const toPromote = toActOn.filter(s => !s.willGraduate);
    const toGraduate = toActOn.filter(s => s.willGraduate);
    const uniqueClasses = ["All", ...new Set(activeStudents.map(s => s.class).filter(Boolean))];

    const handlePromote = async () => {
        if (!toActOn.length) { alert("No students selected."); return; }
        if (!window.confirm(
            `Promote ${toPromote.length} students and graduate ${toGraduate.length}?\n\nYou can undo this action afterwards.`
        )) return;

        setPromoting(true);
        // Save undo snapshot BEFORE making changes
        const snapshot = activeStudents.map(s => ({ id: s.id, class: s.class, status: s.status }));
        localStorage.setItem(UNDO_KEY, JSON.stringify(snapshot));

        const res = { promoted: 0, graduated: 0, skipped: 0, errors: [] };

        for (const s of toPromote) {
            try {
                await StudentsAPI.update(s.id, { class: s.nextClass });
                await AuditAPI.log(currentUser, "UPDATE", "students", s.id,
                    `Promoted ${s.name} from ${s.class} to ${s.nextClass}`);
                res.promoted++;
            } catch (e) { res.errors.push(`${s.name}: ${e.message}`); }
        }
        for (const s of toGraduate) {
            try {
                await StudentsAPI.update(s.id, { status: "Inactive" });
                await AuditAPI.log(currentUser, "UPDATE", "students", s.id,
                    `Graduated ${s.name} — marked Inactive`);
                res.graduated++;
            } catch (e) { res.errors.push(`${s.name}: ${e.message}`); }
        }

        // Count skipped
        res.skipped = activeStudents.length - toActOn.length;
        setResults(res);
        setShowUndo(true);
        setPromoting(false);
        // Refresh DB cache
        const updated = await StudentsAPI.getAll();
        DB._cache["students"] = updated;
    };

    const handleUndo = async () => {
        const raw = localStorage.getItem(UNDO_KEY);
        if (!raw) { alert("No undo snapshot found."); return; }
        if (!window.confirm("This will restore all students to their previous classes. Continue?")) return;

        setUndoing(true);
        const snapshot = JSON.parse(raw);
        let restored = 0;
        for (const s of snapshot) {
            try {
                await StudentsAPI.update(s.id, { class: s.class, status: s.status });
                restored++;
            } catch (e) { console.warn(e); }
        }
        await AuditAPI.log(currentUser, "UPDATE", "students", "bulk", `Undid promotion — restored ${restored} students`);
        localStorage.removeItem(UNDO_KEY);
        setShowUndo(false);
        setResults(null);
        const updated = await StudentsAPI.getAll();
        DB._cache["students"] = updated;
        alert(`✅ Restored ${restored} students to previous classes.`);
        setUndoing(false);
    };

    // Students who were NOT promoted this year (still in same class as last year)
    // We detect this by checking if any student has no promotion record in audit log
    // Simple approach: show Inactive students (graduated) and skipped ones
    const notPromotedList = DB.students.filter(s =>
        s.status === "Inactive" ||
        (activeStudents.find(a => a.id === s.id) && !selected.has(s.id))
    );

    return (
        <div>
            <PageHeader title="🎓 Student Promotion" sub="Promote students to next class at year end" />

            <Notice type="warning">
                ⚠️ Select which students to promote. Uncheck any student to skip them.
                Students in the last class will be graduated (marked Inactive).
                You can undo the last promotion anytime.
            </Notice>

            {/* Undo banner */}
            {showUndo && (
                <div style={{
                    background: "#fef9c3", border: "1px solid #d97706", borderRadius: 10,
                    padding: "12px 18px", marginBottom: 16,
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                    <span style={{ fontSize: 13, color: "#92400e", fontWeight: 500 }}>
                        ↩️ A previous promotion can be undone
                    </span>
                    <Btn variant="warning" onClick={handleUndo} disabled={undoing}>
                        {undoing ? "Restoring..." : "↩️ Undo Last Promotion"}
                    </Btn>
                </div>
            )}

            {/* Results */}
            {results && (
                <div style={{
                    background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 10,
                    padding: "14px 18px", marginBottom: 16
                }}>
                    <p style={{ fontWeight: 700, color: "#065f46", margin: "0 0 4px" }}>✅ Promotion Complete!</p>
                    <p style={{ fontSize: 13, color: "#065f46", margin: 0 }}>
                        {results.promoted} promoted · {results.graduated} graduated · {results.skipped} skipped
                        {results.errors.length > 0 && ` · ${results.errors.length} errors`}
                    </p>
                </div>
            )}

            {/* Stats + controls */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
                <MiniCard label="Total Active" value={activeStudents.length} />
                <MiniCard label="Selected" value={selected.size} color={THEME.success} />
                <MiniCard label="Will Promote" value={toPromote.length} color={THEME.info} />
                <MiniCard label="Will Graduate" value={toGraduate.length} color={THEME.warning} />
            </div>

            {/* Filter + actions */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by student ID or name..."
                    style={{
                        padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 7,
                        fontSize: 13, width: 240, background: "#fff", color: "#1a1a2e"
                    }}
                />
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                    style={{ padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13 }}>
                    {uniqueClasses.map(c => <option key={c}>{c}</option>)}
                </select>
                {searchQuery && (
                    <span style={{ fontSize: 12, color: THEME.textLight }}>
                        Showing {promotionPlan.length} result(s)
                    </span>
                )}
                <Btn variant="ghost" onClick={toggleAll}>
                    {selected.size === activeStudents.length ? "☐ Deselect All" : "☑ Select All"}
                </Btn>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <Btn variant="danger" onClick={handlePromote} disabled={promoting || !toActOn.length}>
                        {promoting ? "⏳ Promoting..." : `🎓 Promote ${toActOn.length} Students`}
                    </Btn>
                </div>
            </div>

            {/* Student table with checkboxes */}
            <Table headers={["☑", "#", "Student", "Current Class", "→ New Class", "Note"]}>
                {promotionPlan.map((s, i) => (
                    <TrHover key={s.id} style={{ opacity: s.isSelected ? 1 : 0.45 }}>
                        <Td center>
                            <input type="checkbox" checked={s.isSelected} onChange={() => toggle(s.id)}
                                style={{ width: 16, height: 16, cursor: "pointer" }} />
                        </Td>
                        <Td>{s.num}</Td>
                        <Td bold>{s.name}<div style={{ fontSize: 11, color: THEME.textLight }}>{s.father_name}</div></Td>
                        <Td center><Badge status="Active" /><div style={{ fontSize: 11, marginTop: 3 }}>{s.class}</div></Td>
                        <Td center bold color={s.willGraduate ? THEME.warning : THEME.success}>
                            {s.isSelected
                                ? s.willGraduate ? "🎓 Graduate" : s.nextClass
                                : <span style={{ color: THEME.textLight }}>Skip</span>}
                        </Td>
                        <Td small color={THEME.textLight}>
                            {!s.isSelected ? "Will not be promoted" :
                                s.willGraduate ? "Last class — will be Inactive" : ""}
                        </Td>
                    </TrHover>
                ))}
            </Table>
            {/* Not Promoted / Skipped List */}
            {notPromotedList.length > 0 && (
                <div style={{ marginTop: 24 }}>
                    <div style={{
                        background: "#fff", borderRadius: 10, padding: "14px 18px",
                        border: "1px solid #e5e7eb", marginBottom: 12
                    }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>
                            ⏭️ Not Promoted / Inactive Students ({notPromotedList.length})
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
                            Students who are deselected, graduated, or marked Inactive
                        </p>
                    </div>
                    <Table headers={["#", "Student ID", "Name", "Class", "Reason"]}>
                        {notPromotedList.map((s, i) => (
                            <TrHover key={s.id}>
                                <Td>{i + 1}</Td>
                                <Td small><code>{s.student_id}</code></Td>
                                <Td bold>{s.name}</Td>
                                <Td center>{s.class}</Td>
                                <Td center>
                                    {s.status === "Inactive"
                                        ? <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                            Graduated / Inactive
                                        </span>
                                        : <span style={{ background: "#fef9c3", color: "#854d0e", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                            Manually Skipped
                                        </span>
                                    }
                                </Td>
                            </TrHover>
                        ))}
                    </Table>
                </div>
            )}
        </div>
    );
}