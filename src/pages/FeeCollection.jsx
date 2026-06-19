// ============================================================
// FEE COLLECTION PAGE
// ============================================================
import { useState, useCallback } from "react";
import { FeesAPI, StudentsAPI } from "../lib/api.js";
import { useData } from "../lib/useData.js";
import { Validate, generateReceiptNo, AuditAPI } from "../lib/api.js";
import { printFeeReceipt } from "../lib/printhelpers.js";
import { APP_CONFIG, MONTHS, YEARS, PAYMENT_MODES } from "../config/supabase.js";
import { useStore } from "../lib/store.js";
import {
  Modal, Field, Input, Sel, Btn, Table, Td, TrHover, Badge,
  SearchBar, PageHeader, Loading, ErrorMsg, ConfirmDelete,
  FormRow, MiniCard, Notice, Pagination, THEME
} from "../components/UI.jsx";

const now = new Date();
const CUR_MONTH = MONTHS[now.getMonth()];
const CUR_YEAR = now.getFullYear();

function printReceipt(f, students) {
  const s = students.find(x => x.student_id === f.student_id);
  const html = `<html><head><title>Receipt ${f.receipt_no}</title>
  <style>body{font-family:Arial,sans-serif;margin:0;padding:20px}
  .box{max-width:420px;margin:0 auto;border:2px solid #1a1a2e;padding:24px;border-radius:8px}
  .hdr{text-align:center;border-bottom:2px solid #1a1a2e;padding-bottom:12px;margin-bottom:14px}
  h2{margin:0;font-size:20px}p{margin:2px 0;font-size:12px;color:#555}
  table{width:100%;font-size:13px;border-collapse:collapse}
  td{padding:5px 0}tr.sep td{border-top:1px solid #ddd;padding-top:8px;font-weight:bold}
  .footer{margin-top:20px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:8px}
  </style></head><body>
  <div class="box">
    <div class="hdr"><h2>MY SCHOOL</h2><p>Fee Receipt</p></div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:12px">
      <span><b>Receipt:</b> ${f.receipt_no}</span><span><b>Date:</b> ${f.payment_date || "—"}</span>
    </div>
    <table>
      <tr><td style="color:#555">Student Name</td><td><b>${f.student_name}</b></td></tr>
      <tr><td style="color:#555">Class</td><td>${f.class}${s ? " " + s.section : ""}</td></tr>
      <tr><td style="color:#555">Father's Name</td><td>${s ? s.father_name : ""}</td></tr>
      <tr><td style="color:#555">Fee Month</td><td>${f.month} ${f.year}</td></tr>
    </table>
    <table style="margin-top:12px">
      <tr><td>Tuition Fee</td><td style="text-align:right">₹${f.tuition_fee || 0}</td></tr>
      <tr><td>Transport Fee</td><td style="text-align:right">₹${f.transport_fee || 0}</td></tr>
      <tr class="sep"><td>Total Amount</td><td style="text-align:right">₹${f.total_amount}</td></tr>
      <tr style="color:green;font-weight:bold"><td>Paid Amount</td><td style="text-align:right">₹${f.paid_amount}</td></tr>
    </table>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:12px">
      <span>Mode: <b>${f.payment_mode || "—"}</b></span>
      <span>Status: <b>${f.status}</b></span>
    </div>
    <div class="footer">Thank you · Computer generated receipt · ${new Date().toLocaleDateString("en-IN")}</div>
  </div></body></html>`;
  const w = window.open("", "_blank", "width=500,height=650");
  w.document.write(html); w.document.close(); w.print();
}

const EMPTY = {
  receipt_no: "", student_id: "", student_name: "", class: "",
  month: CUR_MONTH, year: CUR_YEAR, tuition_fee: "", transport_fee: "",
  total_amount: "", paid_amount: "", status: "Paid",
  payment_mode: "Cash", payment_date: new Date().toISOString().split("T")[0], notes: ""
};

export default function FeeCollection({ currentUser }) {
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterYear, setFilterYear] = useState(0);
  const [filterStatus, setFilterStatus] = useState("All");
  const [feePage, setFeePage] = useState(1);
  const FEE_PER_PAGE = 25;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchFees = useCallback(() => FeesAPI.getAll(), []);
  const fetchStudents = useCallback(() => StudentsAPI.getAll(), []);
  const { data: fees, loading: loadingF, error: errorF, refresh: refreshFees } = useData(fetchFees);
  const { data: students, loading: loadingS, refresh: refreshStudents } = useData(fetchStudents);
  const loading = loadingF || loadingS;
  const error = errorF;
  const load = () => { refreshFees(); refreshStudents(); };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openAdd = () => {
    const rcp = generateReceiptNo();
    setForm({ ...EMPTY, receipt_no: rcp });
    setStudentSearch("");
    setEditId(null); setShowForm(true);
  };
  const openEdit = r => {
    setForm({ ...r });
    setStudentSearch(r.student_name || "");
    setEditId(r.id); setShowForm(true);
  };
  const close = () => { setShowForm(false); setEditId(null); };

  const { getFeeForClass } = useStore();
  const [studentSearch, setStudentSearch] = useState("");

  // Filter students by name or ID for the dropdown
  const filteredStudents = students.filter(s =>
    !studentSearch ||
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.student_id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const handleStudentSelect = (sid) => {
    const stu = students.find(s => s.student_id === sid);
    if (stu) {
      // Use fee structure if available, else fall back to student's own fee fields
      const structure = getFeeForClass(stu.class);
      const tuition = stu.has_tuition !== false ? (structure?.tuition_fee || stu.tuition_fee || stu.monthly_fee || 0) : 0;
      const transport = stu.has_transport ? (structure?.transport_fee || stu.transport_fee || 0) : 0;
      const library = stu.has_library ? (structure?.library_fee || stu.library_fee || 0) : 0;
      const sports = stu.has_sports ? (structure?.sports_fee || stu.sports_fee || 0) : 0;
      const other = stu.has_other ? (stu.other_fee || 0) : 0;
      setForm(p => ({
        ...p,
        student_id: sid, student_name: stu.name, class: stu.class,
        tuition_fee: tuition, transport_fee: transport,
        library_fee: library, sports_fee: sports, other_fee: other,
      }));
      setStudentSearch(stu.name); // show selected name in search
    } else {
      setForm(p => ({ ...p, student_id: sid }));
    }
  };

  const calcTotal = () =>
    (parseFloat(form.tuition_fee) || 0) +
    (parseFloat(form.transport_fee) || 0) +
    (parseFloat(form.library_fee) || 0) +
    (parseFloat(form.sports_fee) || 0) +
    (parseFloat(form.other_fee) || 0);

  const handleSave = async e => {
    e.preventDefault();
    // Fix 5: Input validation
    const errors = Validate.collect(
      Validate.required(form.receipt_no, "Receipt No"),
      Validate.required(form.student_id, "Student"),
      Validate.required(form.month, "Month"),
      Validate.amount(form.tuition_fee || 0, "Tuition Fee"),
      Validate.amount(form.transport_fee || 0, "Transport Fee"),
      Validate.amount(form.paid_amount || 0, "Paid Amount"),
    );
    if (errors.length) { alert(errors.join("\n")); return; }
    setSaving(true);
    const total = calcTotal();
    const paid = parseFloat(form.paid_amount) || total;
    let status = form.status;
    if (paid >= total && total > 0) status = "Paid";
    else if (paid > 0) status = "Partial";
    else status = "Unpaid";
    try {
      const payload = {
        ...form,
        year: parseInt(form.year) || new Date().getFullYear(),
        total_amount: total || 0,
        paid_amount: paid || 0,
        tuition_fee: parseFloat(form.tuition_fee) || 0,
        transport_fee: parseFloat(form.transport_fee) || 0,
        library_fee: parseFloat(form.library_fee) || 0,
        sports_fee: parseFloat(form.sports_fee) || 0,
        other_fee: parseFloat(form.other_fee) || 0,
        status,
      };
      if (editId) {
        await FeesAPI.update(editId, payload);
        await AuditAPI.log(currentUser, "UPDATE", "fee_payments", editId, `Updated receipt: ${payload.receipt_no} for ${payload.student_name}`);
      } else {
        await FeesAPI.create(payload);
        await AuditAPI.log(currentUser, "CREATE", "fee_payments", payload.receipt_no, `Added fee: ${payload.receipt_no} for ${payload.student_name} (${payload.month} ${payload.year})`);
      }
      close(); load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await AuditAPI.log(currentUser, "DELETE", "fee_payments", delTarget.id, `Deleted receipt: ${delTarget.receipt_no} for ${delTarget.student_name}`);
      await FeesAPI.delete(delTarget.id);
      setDelTarget(null); load();
    } catch (err) { alert(err.message); }
  };

  const cf = APP_CONFIG.currencyFormat;
  let filtered = fees;
  if (filterMonth !== "All") filtered = filtered.filter(r => r.month === filterMonth);
  if (filterYear) filtered = filtered.filter(r => r.year === parseInt(filterYear));
  if (filterStatus !== "All") filtered = filtered.filter(r => r.status === filterStatus);
  if (search) filtered = filtered.filter(r =>
    [r.student_name, r.receipt_no, r.class, r.student_id].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  // Student ID quick-filter — shows all receipts for one student
  const [filterStudentId, setFilterStudentId] = useState("");
  if (filterStudentId) filtered = filtered.filter(r => r.student_id === filterStudentId);

  const selectedStudentName = filterStudentId
    ? students.find(s => s.student_id === filterStudentId)?.name || filterStudentId
    : "";

  const collected = filtered.filter(r => r.status === "Paid").reduce((s, r) => s + r.paid_amount, 0);
  const paginated = filtered.slice((feePage - 1) * FEE_PER_PAGE, feePage * FEE_PER_PAGE);

  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div>
      <PageHeader title="💰 Fee Collection"
        sub={`${fees.length} total records`}
        action={<Btn onClick={openAdd}>+ Add Payment</Btn>} />

      <Notice type="warning">You can record advance payments by selecting a future month. Fees are shown in descending order (latest first).</Notice>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
        <MiniCard label="Collected (filtered)" value={cf(collected)} color={THEME.success} />
        <MiniCard label="Unpaid" value={filtered.filter(r => r.status === "Unpaid").length} color={THEME.danger} />
        <MiniCard label="Records (filtered)" value={filtered.length} />
      </div>

      {/* Student ID quick filter banner */}
      {filterStudentId && (
        <div style={{
          background: "#e0f2fe", border: "1px solid #7dd3fc", borderRadius: 8,
          padding: "10px 14px", marginBottom: 12,
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontSize: 13, color: "#0369a1", fontWeight: 500 }}>
            📋 Showing all receipts for <strong>{selectedStudentName}</strong> ({filterStudentId})
            — {filtered.length} record(s)
          </span>
          <button onClick={() => setFilterStudentId("")}
            style={{
              background: "none", border: "none", color: "#0369a1",
              cursor: "pointer", fontSize: 13, fontWeight: 600
            }}>
            ✕ Clear Filter
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search name, ID, receipt..." />
        {/* Student ID quick filter */}
        <select style={SS.sel} value={filterStudentId}
          onChange={e => setFilterStudentId(e.target.value)}>
          <option value="">All Students</option>
          {students.map(s => (
            <option key={s.id} value={s.student_id}>
              {s.student_id} — {s.name}
            </option>
          ))}
        </select>
        <select style={SS.sel} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="All">All Months</option>
          {MONTHS.map(m => <option key={m}>{m}</option>)}
        </select>
        <select style={SS.sel} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value={0}>All Years</option>
          {YEARS.map(y => <option key={y}>{y}</option>)}
        </select>
        <select style={SS.sel} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Status</option>
          <option>Paid</option><option>Unpaid</option><option>Partial</option>
        </select>
      </div>

      <Table headers={["Receipt", "Student", "Class", "Month", "Year", "Total", "Paid", "Status", "Mode", "Date", "Actions"]}>
        {paginated.map(r => (
          <TrHover key={r.id}>
            <Td small><code>{r.receipt_no}</code></Td>
            <Td>
              <div style={{ fontWeight: 600 }}>{r.student_name}</div>
              <button
                onClick={() => setFilterStudentId(
                  filterStudentId === r.student_id ? "" : r.student_id
                )}
                style={{
                  background: "none", border: "none", color: THEME.info,
                  cursor: "pointer", fontSize: 11, padding: 0, marginTop: 2
                }}>
                {filterStudentId === r.student_id ? "✕ Clear" : `📋 View all (${r.student_id})`}
              </button>
            </Td>
            <Td center>{r.class}</Td>
            <Td>{r.month}</Td>
            <Td center>{r.year}</Td>
            <Td right>{cf(r.total_amount)}</Td>
            <Td right bold color={THEME.success}>{cf(r.paid_amount)}</Td>
            <Td center><Badge status={r.status} /></Td>
            <Td center small>{r.payment_mode || "—"}</Td>
            <Td small>{r.payment_date || "—"}</Td>
            <Td>
              <div style={{ display: "flex", gap: 5 }}>
                <Btn variant="ghost" small onClick={() => openEdit(r)}>✏️</Btn>
                <Btn variant="success" small onClick={() => printFeeReceipt(r, students.find(s => s.student_id === r.student_id))}>🖨️</Btn>
                <Btn variant="danger" small onClick={() => setDelTarget(r)}>🗑️</Btn>
              </div>
            </Td>
          </TrHover>
        ))}
      </Table>
      <Pagination total={filtered.length} page={feePage} perPage={FEE_PER_PAGE}
        onChange={p => { setFeePage(p); window.scrollTo(0, 0); }} />

      {showForm && (
        <Modal title={editId ? "Edit Payment" : "Add Fee Payment"} onClose={close} width="600px">
          <form onSubmit={handleSave}>
            <FormRow>
              <Field label="Receipt No" required><Input value={form.receipt_no} onChange={f("receipt_no")} required /></Field>
              <Field label="Payment Date"><Input type="date" value={form.payment_date} onChange={f("payment_date")} /></Field>
            </FormRow>

            {/* Searchable student selector */}
            <Field label="Search & Select Student *">
              <Input
                value={studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setForm(p => ({ ...p, student_id: "" })); }}
                placeholder="Type student name or ID to search..."
              />
            </Field>
            {studentSearch && !form.student_id && (
              <div style={{
                border: `1px solid ${THEME.border}`, borderRadius: 7, marginTop: -8,
                marginBottom: 12, maxHeight: 160, overflowY: "auto", background: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10, position: "relative"
              }}>
                {filteredStudents.length === 0
                  ? <p style={{ padding: "10px 12px", color: THEME.textLight, fontSize: 13 }}>No students found</p>
                  : filteredStudents.map(s => (
                    <div key={s.id}
                      onClick={() => handleStudentSelect(s.student_id)}
                      style={{
                        padding: "9px 12px", cursor: "pointer", fontSize: 13,
                        borderBottom: `1px solid #f3f4f6`, display: "flex",
                        justifyContent: "space-between", alignItems: "center"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0f4ff"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                      <span><strong>{s.student_id}</strong> — {s.name}</span>
                      <span style={{ fontSize: 11, color: THEME.textLight }}>{s.class} {s.section}</span>
                    </div>
                  ))
                }
              </div>
            )}
            {form.student_id && (
              <div style={{
                background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 7,
                padding: "8px 12px", marginBottom: 12, fontSize: 13,
                display: "flex", justifyContent: "space-between"
              }}>
                <span>✅ <strong>{form.student_name}</strong> ({form.class})</span>
                <button onClick={() => { setForm(p => ({ ...p, student_id: "", student_name: "" })); setStudentSearch(""); }}
                  style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer", fontSize: 12 }}>
                  ✕ Change
                </button>
              </div>
            )}

            <FormRow>
              <Field label="Month" required>
                <Sel value={form.month} onChange={f("month")}>
                  {MONTHS.map(m => <option key={m}>{m}</option>)}
                </Sel>
              </Field>
              <Field label="Year" required>
                <Sel value={form.year} onChange={f("year")}>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </Sel>
              </Field>
            </FormRow>
            <Notice type="warning">💡 You can select any month including future months for advance payment.</Notice>

            {/* All fee components */}
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Fee Breakdown</p>
              <FormRow>
                <Field label="Tuition Fee (₹)"><Input type="number" value={form.tuition_fee || ""} onChange={f("tuition_fee")} placeholder="0" /></Field>
                <Field label="Transport Fee (₹)"><Input type="number" value={form.transport_fee || ""} onChange={f("transport_fee")} placeholder="0" /></Field>
              </FormRow>
              <FormRow>
                <Field label="Library Fee (₹)"><Input type="number" value={form.library_fee || ""} onChange={f("library_fee")} placeholder="0" /></Field>
                <Field label="Sports Fee (₹)"><Input type="number" value={form.sports_fee || ""} onChange={f("sports_fee")} placeholder="0" /></Field>
              </FormRow>
              <Field label="Other Fee (₹)"><Input type="number" value={form.other_fee || ""} onChange={f("other_fee")} placeholder="0" /></Field>
              <div style={{
                background: "#e0f2fe", borderRadius: 6, padding: "8px 12px",
                fontSize: 13, fontWeight: 600, color: "#0369a1", marginTop: 6
              }}>
                Total: {cf(calcTotal())}
              </div>
            </div>

            <FormRow>
              <Field label={`Paid Amount (₹)`}>
                <Input type="number" value={form.paid_amount || ""} onChange={f("paid_amount")} placeholder={String(calcTotal())} />
              </Field>
              <Field label="Payment Mode">
                <Sel value={form.payment_mode} onChange={f("payment_mode")}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </Sel>
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Status">
                <Sel value={form.status} onChange={f("status")}>
                  <option>Paid</option><option>Unpaid</option><option>Partial</option>
                </Sel>
              </Field>
              <Field label="Notes"><Input value={form.notes} onChange={f("notes")} placeholder="Optional" /></Field>
            </FormRow>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="ghost" onClick={close}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Add Payment"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {delTarget && <ConfirmDelete name={`Receipt ${delTarget.receipt_no}`} onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />}
    </div>
  );
}
const SS = { sel: { padding: "7px 10px", border: `1px solid var(--color-border-secondary)`, borderRadius: 7, fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" } };