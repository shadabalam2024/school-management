import { useState, useCallback } from "react";
import { StaffAPI, SalaryAPI } from "../lib/api.js";
import { useData } from "../lib/useData.js";
import { Validate, AuditAPI } from "../lib/api.js";
import { APP_CONFIG, MONTHS, YEARS, DESIGNATIONS, SALARY_MODES } from "../config/supabase.js";
import {
  Modal, Field, Input, Sel, Btn, Table, Td, TrHover, Badge,
  SearchBar, PageHeader, Loading, ErrorMsg, ConfirmDelete,
  FormRow, MiniCard, Notice, THEME
} from "../components/UI.jsx";

const now = new Date();
const CUR_MONTH = MONTHS[now.getMonth()];
const CUR_YEAR = now.getFullYear();

function getLastPaidSalary(staffId, salary) {
  const paid = salary.filter(s => s.staff_id === staffId && s.status === "Paid")
    .sort((a, b) => b.year - a.year || MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month));
  return paid.length ? `${paid[0].month} ${paid[0].year}` : "—";
}
function getSalaryStatus(staffId, salary) {
  const s = salary.find(x => x.staff_id === staffId && x.month === CUR_MONTH && x.year === CUR_YEAR);
  return s ? s.status : "No Record";
}

const EMPTY_STAFF = { num: "", staff_id: "", name: "", designation: "Teacher", department: "", phone: "", reg_date: "", basic_salary: "", allowances: "", status: "Active" };
const EMPTY_SAL = { staff_id: "", staff_name: "", month: CUR_MONTH, year: CUR_YEAR, basic_salary: "", allowances: "", deductions: "0", net_salary: "", status: "Paid", payment_date: new Date().toISOString().split("T")[0], payment_mode: "Bank Transfer", notes: "" };

export default function StaffSalary({ currentUser }) {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterYear, setFilterYear] = useState(0);
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("staff"); // "staff" | "salary"
  const [form, setForm] = useState(EMPTY_STAFF);
  const [editId, setEditId] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(() => StaffAPI.getAll(), []);
  const fetchSalary = useCallback(() => SalaryAPI.getAll(), []);
  const { data: staff, loading: loadingSt, error: errorSt, refresh: refreshStaff } = useData(fetchStaff);
  const { data: salary, loading: loadingSal, refresh: refreshSalary } = useData(fetchSalary);
  const loading = loadingSt || loadingSal;
  const error = errorSt;
  const load = () => { refreshStaff(); refreshSalary(); };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const cf = APP_CONFIG.currencyFormat;

  const openAddStaff = () => {
    const n = staff.length ? Math.max(...staff.map(s => s.num || 0)) + 1 : 1;
    setForm({ ...EMPTY_STAFF, num: n, staff_id: `STF${String(n).padStart(3, "0")}`, reg_date: new Date().toISOString().split("T")[0] });
    setEditId(null); setFormType("staff"); setShowForm(true);
  };
  const openEditStaff = s => { setForm({ ...s }); setEditId(s.id); setFormType("staff"); setShowForm(true); };
  const openAddSalary = () => { setForm({ ...EMPTY_SAL }); setEditId(null); setFormType("salary"); setShowForm(true); };
  const openEditSalary = s => { setForm({ ...s }); setEditId(s.id); setFormType("salary"); setShowForm(true); };
  const close = () => { setShowForm(false); setEditId(null); };

  const handleStaffSelect = e => {
    const sid = e.target.value;
    const s = staff.find(x => x.staff_id === sid);
    if (s) setForm(p => ({ ...p, staff_id: sid, staff_name: s.name, basic_salary: s.basic_salary, allowances: s.allowances }));
  };
  const calcNet = () => (parseFloat(form.basic_salary) || 0) + (parseFloat(form.allowances) || 0) - (parseFloat(form.deductions) || 0);

  const handleSaveStaff = async e => {
    e.preventDefault();
    const errors = Validate.collect(
      Validate.required(form.staff_id, "Staff ID"),
      Validate.required(form.name, "Full Name"),
      Validate.required(form.reg_date, "Registration Date"),
      Validate.phone(form.phone),
      Validate.amount(form.basic_salary || 0, "Basic Salary"),
      Validate.amount(form.allowances || 0, "Allowances"),
    );
    if (errors.length) { alert(errors.join("\n")); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        num: parseInt(form.num) || 1,
        basic_salary: parseFloat(form.basic_salary) || 0,
        allowances: parseFloat(form.allowances) || 0,
      };
      if (editId) {
        await StaffAPI.update(editId, payload);
        await AuditAPI.log(currentUser, "UPDATE", "staff", editId, `Updated staff: ${form.name}`);
      } else {
        await StaffAPI.create(payload);
        await AuditAPI.log(currentUser, "CREATE", "staff", form.staff_id, `Added staff: ${form.name}`);
      }
      close(); load();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };
  const handleSaveSalary = async e => {
    e.preventDefault();
    const errors = Validate.collect(
      Validate.required(form.staff_id, "Staff"),
      Validate.required(form.month, "Month"),
      Validate.amount(form.basic_salary || 0, "Basic Salary"),
      Validate.amount(form.allowances || 0, "Allowances"),
      Validate.amount(form.deductions || 0, "Deductions"),
    );
    if (errors.length) { alert(errors.join("\n")); return; }
    setSaving(true);
    const net = calcNet();
    try {
      const payload = { ...form, year: parseInt(form.year), net_salary: net };
      if (editId) {
        await SalaryAPI.update(editId, payload);
        await AuditAPI.log(currentUser, "UPDATE", "salary_payments", editId, `Updated salary: ${form.staff_name} ${form.month} ${form.year}`);
      } else {
        await SalaryAPI.create(payload);
        await AuditAPI.log(currentUser, "CREATE", "salary_payments", form.staff_id, `Added salary: ${form.staff_name} ${form.month} ${form.year} ₹${net}`);
      }
      close(); load();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };
  const handleDelete = async () => {
    try {
      const label = delTarget._type === "staff" ? `staff: ${delTarget.name}` : `salary: ${delTarget.staff_name}`;
      await AuditAPI.log(currentUser, "DELETE", delTarget._type === "staff" ? "staff" : "salary_payments", delTarget.id, `Deleted ${label}`);
      if (delTarget._type === "staff") await StaffAPI.delete(delTarget.id);
      else await SalaryAPI.delete(delTarget.id);
      setDelTarget(null); load();
    } catch (err) { alert(err.message); }
  };

  let salRows = [...salary];
  if (filterMonth !== "All") salRows = salRows.filter(s => s.month === filterMonth);
  if (filterYear) salRows = salRows.filter(s => s.year === parseInt(filterYear));
  if (filterStatus !== "All") salRows = salRows.filter(s => s.status === filterStatus);
  if (search && tab === 1) salRows = salRows.filter(s => s.staff_name.toLowerCase().includes(search.toLowerCase()));
  salRows.sort((a, b) => b.year - a.year || MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month));

  const filteredStaff = staff.filter(s =>
    [s.name, s.staff_id, s.designation, s.department].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div>
      <PageHeader title="👩‍🏫 Staff & Salary"
        sub={`${staff.filter(s => s.status === "Active").length} active staff`}
        action={tab === 0
          ? <Btn onClick={openAddStaff}>+ Add Staff</Btn>
          : <Btn onClick={openAddSalary}>+ Add Salary</Btn>} />

      <div style={{ display: "flex", gap: 3, marginBottom: 16, borderBottom: `1px solid ${THEME.border}` }}>
        {["Staff Directory", "Salary Payments"].map((label, i) => (
          <button key={i} onClick={() => { setTab(i); setSearch(""); }}
            style={{
              padding: "9px 18px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: tab === i ? THEME.primary : "transparent",
              color: tab === i ? "#fff" : THEME.textLight,
              borderRadius: "8px 8px 0 0"
            }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <>
          <Notice>Salary status shown for {CUR_MONTH} {CUR_YEAR}. "Paid Till" shows the last month salary was paid.</Notice>
          <div style={{ marginBottom: 12 }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search name, ID..." />
          </div>
          <Table headers={["#", "ID", "Name", "Designation", "Dept", "Phone", "Reg Date", "Basic+Allow", `${CUR_MONTH} Salary`, "Paid Till", "Status", "Actions"]}>
            {filteredStaff.map(s => (
              <TrHover key={s.id}>
                <Td>{s.num}</Td>
                <Td small><code>{s.staff_id}</code></Td>
                <Td bold>{s.name}</Td>
                <Td>{s.designation}</Td>
                <Td>{s.department}</Td>
                <Td>{s.phone}</Td>
                <Td small>{s.reg_date}</Td>
                <Td right bold color={THEME.success}>{cf(s.basic_salary + s.allowances)}</Td>
                <Td center><Badge status={getSalaryStatus(s.staff_id, salary)} /></Td>
                <Td small color={THEME.info}>{getLastPaidSalary(s.staff_id, salary)}</Td>
                <Td center><Badge status={s.status} /></Td>
                <Td>
                  <div style={{ display: "flex", gap: 5 }}>
                    <Btn variant="ghost" small onClick={() => openEditStaff(s)}>✏️</Btn>
                    <Btn variant="danger" small onClick={() => setDelTarget({ ...s, _type: "staff" })}>🗑️</Btn>
                  </div>
                </Td>
              </TrHover>
            ))}
          </Table>
        </>
      )}

      {tab === 1 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
            <MiniCard label="Salary Paid (filtered)" value={cf(salRows.filter(s => s.status === "Paid").reduce((s, r) => s + r.net_salary, 0))} color={THEME.danger} />
            <MiniCard label="Unpaid" value={salRows.filter(s => s.status === "Unpaid").length} color={THEME.warning} />
            <MiniCard label="Records" value={salRows.length} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search staff name..." />
            <select style={SS.sel} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="All">All Months</option>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
            <select style={SS.sel} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value={0}>All Years</option>
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </select>
            <select style={SS.sel} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Status</option><option>Paid</option><option>Unpaid</option>
            </select>
          </div>
          <Table headers={["Staff", "Month", "Year", "Basic", "Allow", "Deduct", "Net", "Status", "Mode", "Date", "Actions"]}>
            {salRows.map(s => (
              <TrHover key={s.id}>
                <Td bold>{s.staff_name}</Td>
                <Td>{s.month}</Td>
                <Td center>{s.year}</Td>
                <Td right>{cf(s.basic_salary)}</Td>
                <Td right color={THEME.success}>{cf(s.allowances)}</Td>
                <Td right color={THEME.danger}>−{cf(s.deductions)}</Td>
                <Td right bold color={THEME.accent}>{cf(s.net_salary)}</Td>
                <Td center><Badge status={s.status} /></Td>
                <Td small center>{s.payment_mode || "—"}</Td>
                <Td small>{s.payment_date || "—"}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 5 }}>
                    <Btn variant="ghost" small onClick={() => openEditSalary(s)}>✏️</Btn>
                    <Btn variant="danger" small onClick={() => setDelTarget({ ...s, _type: "salary" })}>🗑️</Btn>
                  </div>
                </Td>
              </TrHover>
            ))}
          </Table>
        </>
      )}

      {/* Staff Form */}
      {showForm && formType === "staff" && (
        <Modal title={editId ? "Edit Staff" : "Add Staff"} onClose={close} width="580px">
          <form onSubmit={handleSaveStaff}>
            <FormRow>
              <Field label="Serial No."><Input type="number" value={form.num} onChange={f("num")} /></Field>
              <Field label="Staff ID" required><Input value={form.staff_id} onChange={f("staff_id")} required /></Field>
            </FormRow>
            <FormRow>
              <Field label="Full Name" required><Input value={form.name} onChange={f("name")} required /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={f("phone")} /></Field>
            </FormRow>
            <FormRow>
              <Field label="Designation"><Sel value={form.designation} onChange={f("designation")}>{DESIGNATIONS.map(d => <option key={d}>{d}</option>)}</Sel></Field>
              <Field label="Department"><Input value={form.department} onChange={f("department")} placeholder="e.g. Mathematics" /></Field>
            </FormRow>
            <FormRow>
              <Field label="Registration Date" required><Input type="date" value={form.reg_date} onChange={f("reg_date")} required /></Field>
              <Field label="Status"><Sel value={form.status} onChange={f("status")}><option>Active</option><option>Resigned</option><option>Inactive</option></Sel></Field>
            </FormRow>
            <FormRow>
              <Field label="Basic Salary (₹)"><Input type="number" value={form.basic_salary} onChange={f("basic_salary")} /></Field>
              <Field label="Allowances (₹)"><Input type="number" value={form.allowances} onChange={f("allowances")} /></Field>
            </FormRow>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="ghost" onClick={close}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Add Staff"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Salary Form */}
      {showForm && formType === "salary" && (
        <Modal title={editId ? "Edit Salary" : "Add Salary Payment"} onClose={close} width="560px">
          <form onSubmit={handleSaveSalary}>
            <Field label="Select Staff" required>
              <select style={{ width: "100%", padding: "8px 10px", border: `1px solid ${THEME.border}`, borderRadius: 7, fontSize: 13 }}
                value={form.staff_id} onChange={handleStaffSelect} required>
                <option value="">-- Select Staff --</option>
                {staff.map(s => <option key={s.id} value={s.staff_id}>{s.staff_id} — {s.name}</option>)}
              </select>
            </Field>
            <FormRow>
              <Field label="Month"><Sel value={form.month} onChange={f("month")}>{MONTHS.map(m => <option key={m}>{m}</option>)}</Sel></Field>
              <Field label="Year"><Sel value={form.year} onChange={f("year")}>{YEARS.map(y => <option key={y}>{y}</option>)}</Sel></Field>
            </FormRow>
            <Notice type="warning">💡 You can select any month including future months for advance salary payment.</Notice>
            <FormRow>
              <Field label="Basic Salary (₹)"><Input type="number" value={form.basic_salary} onChange={f("basic_salary")} /></Field>
              <Field label="Allowances (₹)"><Input type="number" value={form.allowances} onChange={f("allowances")} /></Field>
            </FormRow>
            <FormRow>
              <Field label="Deductions (₹)"><Input type="number" value={form.deductions} onChange={f("deductions")} /></Field>
              <Field label={`Net Salary = ${cf(calcNet())}`}>
                <Input value={cf(calcNet())} readOnly style={{ background: "#f0fdf4", fontWeight: 600 }} />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Payment Mode"><Sel value={form.payment_mode} onChange={f("payment_mode")}>{SALARY_MODES.map(m => <option key={m}>{m}</option>)}</Sel></Field>
              <Field label="Payment Date"><Input type="date" value={form.payment_date} onChange={f("payment_date")} /></Field>
            </FormRow>
            <FormRow>
              <Field label="Status"><Sel value={form.status} onChange={f("status")}><option>Paid</option><option>Unpaid</option></Sel></Field>
              <Field label="Notes"><Input value={form.notes} onChange={f("notes")} /></Field>
            </FormRow>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="ghost" onClick={close}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Add Salary"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {delTarget && <ConfirmDelete name={delTarget.name || delTarget.staff_name} onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />}
    </div>
  );
}
const SS = { sel: { padding: "7px 10px", border: `1px solid var(--color-border-secondary)`, borderRadius: 7, fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" } };