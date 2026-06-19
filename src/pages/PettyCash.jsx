import { useState, useCallback } from "react";
import { PettyCashAPI } from "../lib/api.js";
import { AuditAPI } from "../lib/api.js";
import { useData } from "../lib/useData.js";
import { APP_CONFIG } from "../config/supabase.js";
import {
  Modal, Field, Input, Sel, Btn, Table, Td, TrHover, Badge,
  SearchBar, PageHeader, Loading, ErrorMsg, ConfirmDelete,
  FormRow, MiniCard, THEME
} from "../components/UI.jsx";

const EMPTY = { cash_date: new Date().toISOString().split("T")[0], type: "OUT", amount: "", purpose: "", recorded_by: "" };

export default function PettyCash({ currentUser }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchPetty = useCallback(() => PettyCashAPI.getAll(), []);
  const { data: records, loading, error, refresh } = useData(fetchPetty);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const openAdd = (type = "OUT") => { setForm({ ...EMPTY, type }); setEditId(null); setShowForm(true); };
  const openEdit = r => { setForm({ ...r }); setEditId(r.id); setShowForm(true); };
  const close = () => { setShowForm(false); setEditId(null); };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        await PettyCashAPI.update(editId, form);
        await AuditAPI.log(currentUser, "UPDATE", "petty_cash", editId, `Updated petty cash: ${form.type} ₹${form.amount}`);
      } else {
        await PettyCashAPI.create(form);
        await AuditAPI.log(currentUser, "CREATE", "petty_cash", form.type, `Added petty cash ${form.type}: ₹${form.amount} — ${form.purpose}`);
      }
      close(); refresh();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };
  const handleDelete = async () => {
    try {
      await AuditAPI.log(currentUser, "DELETE", "petty_cash", delTarget.id, `Deleted petty cash: ${delTarget.purpose}`);
      await PettyCashAPI.delete(delTarget.id);
      setDelTarget(null); refresh();
    } catch (err) { alert(err.message); }
  };

  const cf = APP_CONFIG.currencyFormat;
  const totalIn = records.filter(r => r.type === "IN").reduce((s, r) => s + r.amount, 0);
  const totalOut = records.filter(r => r.type === "OUT").reduce((s, r) => s + r.amount, 0);
  const bal = totalIn - totalOut;

  let running = 0;
  const withBal = [...records]
    .sort((a, b) => a.cash_date.localeCompare(b.cash_date))
    .map(r => { running += r.type === "IN" ? r.amount : -r.amount; return { ...r, runBal: running }; })
    .reverse();

  const filtered = withBal.filter(r =>
    [r.purpose, r.recorded_by].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div>
      <PageHeader title="💵 Petty Cash" sub="Daily small cash management"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="success" onClick={() => openAdd("IN")}>+ Cash IN</Btn>
            <Btn variant="danger" onClick={() => openAdd("OUT")}>+ Cash OUT</Btn>
          </div>
        } />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
        <MiniCard label="Total IN" value={cf(totalIn)} color={THEME.success} />
        <MiniCard label="Total OUT" value={cf(totalOut)} color={THEME.danger} />
        <MiniCard label="Balance" value={cf(bal)} color={bal >= 0 ? THEME.info : THEME.danger} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search purpose, recorded by..." />
      </div>
      <Table headers={["Date", "Type", "Amount", "Purpose", "Recorded By", "Balance", "Actions"]}>
        {filtered.map(r => (
          <TrHover key={r.id} style={{ background: r.type === "IN" ? "rgba(5,150,105,0.04)" : "rgba(220,38,38,0.04)" }}>
            <Td>{r.cash_date}</Td>
            <Td center><Badge status={r.type} /></Td>
            <Td right bold color={r.type === "IN" ? THEME.success : THEME.danger}>
              {r.type === "IN" ? "+" : "−"}{cf(r.amount)}
            </Td>
            <Td>{r.purpose}</Td>
            <Td>{r.recorded_by}</Td>
            <Td right bold color={r.runBal >= 0 ? THEME.text : THEME.danger}>{cf(r.runBal)}</Td>
            <Td>
              <div style={{ display: "flex", gap: 5 }}>
                <Btn variant="ghost" small onClick={() => openEdit(r)}>✏️</Btn>
                <Btn variant="danger" small onClick={() => setDelTarget(r)}>🗑️</Btn>
              </div>
            </Td>
          </TrHover>
        ))}
      </Table>
      {showForm && (
        <Modal title={editId ? "Edit Entry" : `Cash ${form.type}`} onClose={close} width="420px">
          <form onSubmit={handleSave}>
            <FormRow>
              <Field label="Date" required><Input type="date" value={form.cash_date} onChange={f("cash_date")} required /></Field>
              <Field label="Type"><Sel value={form.type} onChange={f("type")}><option>IN</option><option>OUT</option></Sel></Field>
            </FormRow>
            <Field label="Amount (₹)" required><Input type="number" value={form.amount} onChange={f("amount")} placeholder="0" required /></Field>
            <Field label="Purpose"><Input value={form.purpose} onChange={f("purpose")} placeholder="What was it for?" /></Field>
            <Field label="Recorded By"><Input value={form.recorded_by} onChange={f("recorded_by")} placeholder="Person's name" /></Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="ghost" onClick={close}>Cancel</Btn>
              <Btn type="submit" variant={form.type === "IN" ? "success" : "danger"} disabled={saving}>
                {saving ? "Saving..." : editId ? "Update" : `Add Cash ${form.type}`}
              </Btn>
            </div>
          </form>
        </Modal>
      )}
      {delTarget && <ConfirmDelete name={delTarget.purpose || "entry"} onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />}
    </div>
  );
}