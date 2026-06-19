// ============================================================
// STUDENTS PAGE
// ✅ Click student name to see full detail modal
// ✅ Fees breakdown shown in admission form
// ✅ Select which fee types apply per student
// ============================================================
import { useState, useCallback, useEffect } from "react";
import { StudentsAPI, DB } from "../lib/api.js";
import { Validate, AuditAPI } from "../lib/api.js";
import { useData } from "../lib/useData.js";
import { useStore } from "../lib/store.js";
import { APP_CONFIG, MONTHS, CLASSES } from "../config/supabase.js";
import {
  Modal, Field, Input, Sel, Btn, Table, Td, TrHover, Badge,
  SearchBar, PageHeader, Loading, ErrorMsg, ConfirmDelete,
  FormRow, Notice, Card, Pagination, THEME
} from "../components/UI.jsx";

const now = new Date();
const CUR_MONTH = MONTHS[now.getMonth()];
const CUR_YEAR = now.getFullYear();

function getLastPaidMonth(studentId) {
  const paid = DB.fees
    .filter(f => f.student_id === studentId && f.status === "Paid")
    .sort((a, b) => b.year - a.year || MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month));
  return paid.length ? `${paid[0].month} ${paid[0].year}` : "—";
}

function getFeeStatus(studentId) {
  const f = DB.fees.find(x => x.student_id === studentId && x.month === CUR_MONTH && x.year === CUR_YEAR);
  return f ? f.status : "No Record";
}

// ── Student Detail Modal — Fix #6 fresh fee data ─────────
function StudentDetail({ student, onClose, fmt }) {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch fresh fee data directly for this student
    import("../lib/api.js").then(({ FeesAPI }) => {
      FeesAPI.getAll().then(allFees => {
        setFees(allFees.filter(f => f.student_id === student.student_id)
          .sort((a, b) => b.year - a.year || MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month)));
        setLoading(false);
      });
    });
  }, [student.student_id]);
  const totalPaid = fees.filter(f => f.status === "Paid").reduce((s, f) => s + f.paid_amount, 0);
  const totalPending = fees.filter(f => f.status !== "Paid").reduce((s, f) => s + (f.total_amount - f.paid_amount), 0);
  const feeStatus = getFeeStatus(student.student_id);
  const lastPaid = getLastPaidMonth(student.student_id);

  return (
    <Modal title={`👤 ${student.name}`} onClose={onClose} width="620px">
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>⏳ Loading fee history...</div>
      ) : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Personal Info */}
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 14 }}>
              <p style={S.secTitle}>Personal Information</p>
              {[
                ["Student ID", student.student_id],
                ["Full Name", student.name],
                ["Father Name", student.father_name || "—"],
                ["Class", `${student.class} ${student.section || ""}`],
                ["Phone", student.phone || "—"],
                ["Address", student.address || "—"],
                ["Reg. Date", student.reg_date || "—"],
                ["Status", student.status],
              ].map(([l, v]) => (
                <div key={l} style={S.detailRow}>
                  <span style={S.detailLabel}>{l}</span>
                  <span style={S.detailValue}>{v}</span>
                </div>
              ))}
            </div>

            {/* Fee Info */}
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 14 }}>
              <p style={S.secTitle}>Fee Information</p>
              {[
                ["Monthly Fee", fmt(student.monthly_fee)],
                ["Fee Types", [
                  student.has_tuition && "Tuition",
                  student.has_transport && "Transport",
                  student.has_library && "Library",
                  student.has_sports && "Sports",
                  student.has_other && "Other",
                ].filter(Boolean).join(", ") || "Standard"],
                ["This Month", feeStatus],
                ["Last Paid", lastPaid],
                ["Total Paid", fmt(totalPaid)],
                ["Total Pending", fmt(totalPending)],
              ].map(([l, v]) => (
                <div key={l} style={S.detailRow}>
                  <span style={S.detailLabel}>{l}</span>
                  <span style={{
                    ...S.detailValue,
                    color: l === "Total Pending" && totalPending > 0 ? THEME.danger :
                      l === "Total Paid" ? THEME.success : THEME.text
                  }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fee History */}
          <p style={{ ...S.secTitle, marginBottom: 8 }}>Fee Payment History</p>
          {fees.length === 0
            ? <p style={{ color: THEME.textLight, fontSize: 13, textAlign: "center", padding: "16px 0" }}>No fee records found</p>
            : <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>{["Receipt", "Month", "Year", "Total", "Paid", "Status", "Mode", "Date"].map(h => (
                    <th key={h} style={{
                      background: "#1a1a2e", color: "#fff", padding: "7px 10px",
                      textAlign: "left", fontSize: 11
                    }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {fees.map(f => (
                    <tr key={f.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={S.feeCell}><code style={{ fontSize: 11 }}>{f.receipt_no}</code></td>
                      <td style={S.feeCell}>{f.month}</td>
                      <td style={S.feeCell}>{f.year}</td>
                      <td style={S.feeCell}>{fmt(f.total_amount)}</td>
                      <td style={{ ...S.feeCell, color: THEME.success, fontWeight: 600 }}>{fmt(f.paid_amount)}</td>
                      <td style={S.feeCell}>
                        <span style={{
                          background: f.status === "Paid" ? "#d1fae5" : f.status === "Partial" ? "#fef9c3" : "#fee2e2",
                          color: f.status === "Paid" ? "#065f46" : f.status === "Partial" ? "#854d0e" : "#991b1b",
                          padding: "1px 7px", borderRadius: 8, fontSize: 11, fontWeight: 600
                        }}>{f.status}</span>
                      </td>
                      <td style={S.feeCell}>{f.payment_mode || "—"}</td>
                      <td style={S.feeCell}>{f.payment_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Btn variant="ghost" onClick={onClose}>Close</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Fee types helper ──────────────────────────────────────
const FEE_TYPES = [
  { key: "has_tuition", label: "Tuition Fee", field: "tuition_fee" },
  { key: "has_transport", label: "Transport Fee", field: "transport_fee" },
  { key: "has_library", label: "Library Fee", field: "library_fee" },
  { key: "has_sports", label: "Sports Fee", field: "sports_fee" },
  { key: "has_other", label: "Other Fee", field: "other_fee" },
];

const EMPTY = {
  num: "", student_id: "", name: "", father_name: "", class: "Class 5",
  section: "A", phone: "", address: "", reg_date: "", status: "Active",
  monthly_fee: "",
  // Fee type toggles
  has_tuition: true, tuition_fee: "",
  has_transport: false, transport_fee: "",
  has_library: false, library_fee: "",
  has_sports: false, sports_fee: "",
  has_other: false, other_fee: "",
};

export default function Students({ currentUser }) {
  const fetchStudents = useCallback(() => StudentsAPI.getAll(), []);
  const { data: students, loading, error, refresh } = useData(fetchStudents);
  const { getFeeForClass, fmt } = useStore();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const fBool = k => e => setForm(p => ({ ...p, [k]: e.target.checked }));

  const openAdd = () => {
    const nextNum = students.length ? Math.max(...students.map(s => s.num || 0)) + 1 : 1;
    setForm({
      ...EMPTY, num: nextNum,
      student_id: `STU${String(nextNum).padStart(3, "0")}`,
      reg_date: new Date().toISOString().split("T")[0]
    });
    setEditId(null); setShowForm(true);
  };

  const openEdit = s => {
    setForm({
      ...EMPTY, ...s,
      has_tuition: s.has_tuition ?? true,
      has_transport: s.has_transport ?? false,
      has_library: s.has_library ?? false,
      has_sports: s.has_sports ?? false,
      has_other: s.has_other ?? false,
    });
    setEditId(s.id); setShowForm(true);
  };
  const close = () => { setShowForm(false); setEditId(null); };

  // Auto-fill fees from fee structure when class changes
  const handleClassChange = e => {
    const cls = e.target.value;
    const structure = getFeeForClass(cls);
    setForm(p => ({
      ...p, class: cls,
      tuition_fee: structure ? structure.tuition_fee : p.tuition_fee,
      transport_fee: structure ? structure.transport_fee : p.transport_fee,
      library_fee: structure ? structure.library_fee : p.library_fee,
      sports_fee: structure ? structure.sports_fee : p.sports_fee,
      other_fee: structure ? structure.other_fee : p.other_fee,
      has_transport: structure ? structure.transport_fee > 0 : p.has_transport,
      has_library: structure ? structure.library_fee > 0 : p.has_library,
      has_sports: structure ? structure.sports_fee > 0 : p.has_sports,
    }));
  };

  // Auto-calculate monthly fee from selected fee types
  const calcMonthlyFee = () =>
    (form.has_tuition ? parseFloat(form.tuition_fee) || 0 : 0) +
    (form.has_transport ? parseFloat(form.transport_fee) || 0 : 0) +
    (form.has_library ? parseFloat(form.library_fee) || 0 : 0) +
    (form.has_sports ? parseFloat(form.sports_fee) || 0 : 0) +
    (form.has_other ? parseFloat(form.other_fee) || 0 : 0);

  const handleSave = async e => {
    e.preventDefault();
    const errors = Validate.collect(
      Validate.required(form.student_id, "Student ID"),
      Validate.required(form.name, "Student Name"),
      Validate.required(form.reg_date, "Registration Date"),
      Validate.phone(form.phone),
    );
    if (errors.length) { alert(errors.join("\n")); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        num: parseInt(form.num) || 1,
        monthly_fee: calcMonthlyFee(),
        tuition_fee: parseFloat(form.tuition_fee) || 0,
        transport_fee: parseFloat(form.transport_fee) || 0,
        library_fee: parseFloat(form.library_fee) || 0,
        sports_fee: parseFloat(form.sports_fee) || 0,
        other_fee: parseFloat(form.other_fee) || 0,
      };
      if (editId) {
        await StudentsAPI.update(editId, payload);
        await AuditAPI.log(currentUser, "UPDATE", "students", editId, `Updated student: ${form.name}`);
      } else {
        await StudentsAPI.create(payload);
        await AuditAPI.log(currentUser, "CREATE", "students", form.student_id, `Added student: ${form.name}`);
      }
      close(); refresh();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await AuditAPI.log(currentUser, "DELETE", "students", delTarget.id, `Deleted student: ${delTarget.name}`);
      await StudentsAPI.delete(delTarget.id);
      setDelTarget(null); refresh();
    } catch (err) { alert(err.message); }
  };

  const filtered = students.filter(s =>
    [s.name, s.student_id, s.class, s.father_name, s.phone].join(" ")
      .toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div>
      <PageHeader title="🎓 Students"
        sub={`${students.filter(s => s.status === "Active").length} active students`}
        action={<Btn onClick={openAdd}>+ Add Student</Btn>} />

      <Notice>Click on a student name to view their full details and fee history.</Notice>

      <div style={{ marginBottom: 12 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search name, ID, class, phone..." />
      </div>

      <Table headers={["#", "ID", "Name", "Class", "Phone", "Fee/Month", `${CUR_MONTH} Status`, "Paid Till", "Status", "Actions"]}>
        {paginated.map(s => (
          <TrHover key={s.id}>
            <Td>{s.num}</Td>
            <Td small><code>{s.student_id}</code></Td>
            <Td>
              <span onClick={() => setViewStudent(s)}
                style={{
                  fontWeight: 600, color: THEME.accent, cursor: "pointer",
                  textDecoration: "underline", textDecorationStyle: "dotted"
                }}>
                {s.name}
              </span>
              {s.father_name && <div style={{ fontSize: 11, color: THEME.textLight }}>{s.father_name}</div>}
            </Td>
            <Td center>{s.class} {s.section}</Td>
            <Td>{s.phone}</Td>
            <Td right bold color={THEME.success}>{fmt(s.monthly_fee)}</Td>
            <Td center><Badge status={getFeeStatus(s.student_id)} /></Td>
            <Td small color={THEME.info}>{getLastPaidMonth(s.student_id)}</Td>
            <Td center><Badge status={s.status} /></Td>
            <Td>
              <div style={{ display: "flex", gap: 5 }}>
                <Btn variant="ghost" small onClick={() => openEdit(s)}>✏️</Btn>
                <Btn variant="danger" small onClick={() => setDelTarget(s)}>🗑️</Btn>
              </div>
            </Td>
          </TrHover>
        ))}
      </Table>

      {/* Student detail modal */}
      {viewStudent && (
        <StudentDetail student={viewStudent} onClose={() => setViewStudent(null)} fmt={fmt} />
      )}

      {/* Add/Edit form */}
      {showForm && (
        <Modal title={editId ? "Edit Student" : "Add Student"} onClose={close} width="640px">
          <form onSubmit={handleSave}>
            <FormRow>
              <Field label="Serial No.">
                <Input type="number" value={form.num} onChange={f("num")} />
              </Field>
              <Field label="Student ID" required>
                <Input value={form.student_id} onChange={f("student_id")} placeholder="STU001" required />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Full Name" required>
                <Input value={form.name} onChange={f("name")} placeholder="Student name" required />
              </Field>
              <Field label="Father's Name">
                <Input value={form.father_name} onChange={f("father_name")} />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Class" required>
                <Sel value={form.class} onChange={handleClassChange}>
                  {CLASSES.map(c => <option key={c}>{c}</option>)}
                </Sel>
              </Field>
              <Field label="Section">
                <Sel value={form.section} onChange={f("section")}>
                  {["A", "B", "C", "D"].map(x => <option key={x}>{x}</option>)}
                </Sel>
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Phone"><Input value={form.phone} onChange={f("phone")} /></Field>
              <Field label="Registration Date" required>
                <Input type="date" value={form.reg_date} onChange={f("reg_date")} required />
              </Field>
            </FormRow>
            <Field label="Address">
              <Input value={form.address || ""} onChange={f("address")} placeholder="Student address" />
            </Field>

            {/* Fee types */}
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                Fee Components
                <span style={{ fontSize: 11, color: THEME.textLight, fontWeight: 400, marginLeft: 8 }}>
                  (check which fees apply to this student)
                </span>
              </p>
              {FEE_TYPES.map(ft => (
                <div key={ft.key} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr 140px",
                  alignItems: "center", gap: 10, marginBottom: 8
                }}>
                  <label style={{
                    display: "flex", alignItems: "center", gap: 6, fontSize: 13,
                    cursor: "pointer", minWidth: 130
                  }}>
                    <input type="checkbox" checked={form[ft.key] || false}
                      onChange={fBool(ft.key)} style={{ width: 15, height: 15 }} />
                    {ft.label}
                  </label>
                  <div />
                  <Input
                    type="number"
                    value={form[ft.field] || ""}
                    onChange={f(ft.field)}
                    placeholder="₹ 0"
                    disabled={!form[ft.key]}
                    style={{ opacity: form[ft.key] ? 1 : 0.4 }}
                  />
                </div>
              ))}
              <div style={{
                background: "#e0f2fe", borderRadius: 6, padding: "8px 12px",
                fontSize: 13, fontWeight: 600, color: "#0369a1", marginTop: 6
              }}>
                Total Monthly Fee: {fmt(calcMonthlyFee())}
              </div>
            </div>

            <Field label="Status">
              <Sel value={form.status} onChange={f("status")}>
                <option>Active</option><option>Inactive</option>
              </Sel>
            </Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="ghost" onClick={close}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>
                {saving ? "Saving..." : editId ? "Update Student" : "Add Student"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {delTarget && <ConfirmDelete name={delTarget.name} onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />}
      <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onChange={p => { setPage(p); window.scrollTo(0, 0); }} />
    </div>
  );
}

const S = {
  secTitle: { margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  detailRow: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f3f4f6", fontSize: 13 },
  detailLabel: { color: "#6b7280" },
  detailValue: { fontWeight: 500, color: "#1a1a2e", textAlign: "right", maxWidth: "55%" },
  feeCell: { padding: "6px 10px", color: "#374151" },
};