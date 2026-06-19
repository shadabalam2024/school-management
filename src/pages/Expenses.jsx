import { useState, useCallback } from "react";
import { ExpensesAPI } from "../lib/api.js";
import { AuditAPI } from "../lib/api.js";
import { useData } from "../lib/useData.js";
import { APP_CONFIG, EXPENSE_CATEGORIES, PAYMENT_MODES } from "../config/supabase.js";
import {
  Modal, Field, Input, Sel, Btn, Table, Td, TrHover,
  SearchBar, PageHeader, Loading, ErrorMsg, ConfirmDelete,
  FormRow, MiniCard, THEME
} from "../components/UI.jsx";

const EMPTY = { expense_date: new Date().toISOString().split("T")[0], category: "Electricity", description: "", vendor: "", amount: "", payment_mode: "Cash" };

export default function Expenses({ currentUser }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(() => ExpensesAPI.getAll(), []);
  const { data: expenses, loading, error, refresh } = useData(fetchExpenses);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const openAdd = () => { setForm(EMPTY); setEditId(null); setShowForm(true); };
  const openEdit = r => { setForm({ ...r }); setEditId(r.id); setShowForm(true); };
  const close = () => { setShowForm(false); setEditId(null); };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        await ExpensesAPI.update(editId, form);
        await AuditAPI.log(currentUser, "UPDATE", "expenses", editId, `Updated expense: ${form.category} ₹${form.amount}`);
      } else {
        await ExpensesAPI.create(form);
        await AuditAPI.log(currentUser, "CREATE", "expenses", form.category, `Added expense: ${form.category} ₹${form.amount}`);
      }
      close(); refresh();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };
  const handleDelete = async () => {
    try {
      await AuditAPI.log(currentUser, "DELETE", "expenses", delTarget.id, `Deleted expense: ${delTarget.category} ₹${delTarget.amount}`);
      await ExpensesAPI.delete(delTarget.id);
      setDelTarget(null); refresh();
    } catch (err) { alert(err.message); }
  };

  const cf = APP_CONFIG.currencyFormat;
  let filtered = [...expenses];
  if (filterCat !== "All") filtered = filtered.filter(e => e.category === filterCat);
  if (search) filtered = filtered.filter(e => [e.description, e.vendor, e.category].join(" ").toLowerCase().includes(search.toLowerCase()));

  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const catTotals = EXPENSE_CATEGORIES.map(cat => ({
    cat, total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);

  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div>
      <PageHeader title="📤 Expenses" sub="School running expenses" action={<Btn onClick={openAdd}>+ Add Expense</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <MiniCard label="Total Expenses (filtered)" value={cf(total)} color={THEME.danger} />
        <div style={{ background: THEME.bg, borderRadius: 10, padding: "12px 14px", border: `0.5px solid ${THEME.border}` }}>
          <p style={{ fontSize: 11, color: THEME.textLight, margin: "0 0 8px", textTransform: "uppercase" }}>Top Categories</p>
          {catTotals.map(c => (
            <div key={c.cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
              <span>{c.cat}</span><span style={{ fontWeight: 600, color: THEME.danger }}>{cf(c.total)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search description, vendor..." />
        <select style={SS.sel} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="All">All Categories</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <Table headers={["Date", "Category", "Description", "Vendor", "Amount", "Mode", "Actions"]}>
        {filtered.map(e => (
          <TrHover key={e.id}>
            <Td>{e.expense_date}</Td>
            <Td><span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{e.category}</span></Td>
            <Td>{e.description}</Td>
            <Td>{e.vendor}</Td>
            <Td right bold color={THEME.danger}>{cf(e.amount)}</Td>
            <Td center>{e.payment_mode}</Td>
            <Td>
              <div style={{ display: "flex", gap: 5 }}>
                <Btn variant="ghost" small onClick={() => openEdit(e)}>✏️</Btn>
                <Btn variant="danger" small onClick={() => setDelTarget(e)}>🗑️</Btn>
              </div>
            </Td>
          </TrHover>
        ))}
      </Table>
      {showForm && (
        <Modal title={editId ? "Edit Expense" : "Add Expense"} onClose={close} width="500px">
          <form onSubmit={handleSave}>
            <FormRow>
              <Field label="Date" required><Input type="date" value={form.expense_date} onChange={f("expense_date")} required /></Field>
              <Field label="Category" required><Sel value={form.category} onChange={f("category")}>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</Sel></Field>
            </FormRow>
            <Field label="Description"><Input value={form.description} onChange={f("description")} placeholder="What was this for?" /></Field>
            <FormRow>
              <Field label="Vendor"><Input value={form.vendor} onChange={f("vendor")} /></Field>
              <Field label="Amount (₹)" required><Input type="number" value={form.amount} onChange={f("amount")} required /></Field>
            </FormRow>
            <Field label="Payment Mode"><Sel value={form.payment_mode} onChange={f("payment_mode")}>{PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}</Sel></Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="ghost" onClick={close}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Add Expense"}</Btn>
            </div>
          </form>
        </Modal>
      )}
      {delTarget && <ConfirmDelete name={delTarget.description || delTarget.category} onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />}
    </div>
  );
}
const SS = { sel: { padding: "7px 10px", border: `1px solid var(--color-border-secondary)`, borderRadius: 7, fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" } };