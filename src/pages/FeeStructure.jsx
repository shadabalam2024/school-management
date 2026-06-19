// ============================================================
// FEE STRUCTURE PAGE — Feature #5
// Define fee per class — auto-fills when adding fee payments
// ============================================================
import { useState, useCallback } from "react";
import { FeeStructureAPI, AuditAPI } from "../lib/api.js";
import { Store } from "../lib/store.js";
import { useData } from "../lib/useData.js";
import { APP_CONFIG, CLASSES } from "../config/supabase.js";
import {
    Modal, Field, Input, Btn, Table, Td, TrHover,
    PageHeader, Loading, ErrorMsg, ConfirmDelete,
    FormRow, Notice, THEME
} from "../components/UI.jsx";

const EMPTY = {
    class: "Class 1", tuition_fee: "", transport_fee: "",
    library_fee: "", sports_fee: "", other_fee: "",
};

export default function FeeStructure({ currentUser }) {
    const fetchFS = useCallback(() => FeeStructureAPI.getAll(), []);
    const { data: structures, loading, error, refresh } = useData(fetchFS);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);
    const [delTarget, setDelTarget] = useState(null);
    const [saving, setSaving] = useState(false);

    const cf = APP_CONFIG.currencyFormat;
    const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const calcTotal = () =>
        (parseFloat(form.tuition_fee) || 0) +
        (parseFloat(form.transport_fee) || 0) +
        (parseFloat(form.library_fee) || 0) +
        (parseFloat(form.sports_fee) || 0) +
        (parseFloat(form.other_fee) || 0);

    const openAdd = () => { setForm(EMPTY); setEditId(null); setShowForm(true); };
    const openEdit = r => { setForm({ ...r }); setEditId(r.id); setShowForm(true); };
    const close = () => { setShowForm(false); setEditId(null); };

    const handleSave = async e => {
        e.preventDefault(); setSaving(true);
        try {
            const payload = {
                ...form,
                tuition_fee: parseFloat(form.tuition_fee) || 0,
                transport_fee: parseFloat(form.transport_fee) || 0,
                library_fee: parseFloat(form.library_fee) || 0,
                sports_fee: parseFloat(form.sports_fee) || 0,
                other_fee: parseFloat(form.other_fee) || 0,
                total_fee: calcTotal(),
            };
            if (editId) {
                await FeeStructureAPI.update(editId, payload);
                await AuditAPI.log(currentUser, "UPDATE", "fee_structure", editId, `Updated fee structure for ${form.class}`);
            } else {
                await FeeStructureAPI.create(payload);
                await AuditAPI.log(currentUser, "CREATE", "fee_structure", form.class, `Created fee structure for ${form.class}`);
            }
            // Reload store so fee structure reflects everywhere
            await Store.loadFeeStructure();
            close(); refresh();
        } catch (err) { alert(err.message); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        try {
            await AuditAPI.log(currentUser, "DELETE", "fee_structure", delTarget.id, `Deleted fee structure for ${delTarget.class}`);
            await FeeStructureAPI.delete(delTarget.id);
            await Store.loadFeeStructure();
            setDelTarget(null); refresh();
        } catch (err) { alert(err.message); }
    };

    if (loading) return <Loading />;
    if (error) return <ErrorMsg msg={error} />;

    return (
        <div>
            <PageHeader title="📋 Fee Structure"
                sub="Define fees per class — auto-fills in fee collection"
                action={<Btn onClick={openAdd}>+ Add Class Fee</Btn>} />

            <Notice>Fee structure is used to auto-fill fees when adding payments and for bulk fee generation.</Notice>

            <Table headers={["Class", "Tuition", "Transport", "Library", "Sports", "Other", "Total/Month", "Actions"]}>
                {structures.map(s => (
                    <TrHover key={s.id}>
                        <Td bold>{s.class}</Td>
                        <Td right>{cf(s.tuition_fee)}</Td>
                        <Td right>{cf(s.transport_fee)}</Td>
                        <Td right>{cf(s.library_fee)}</Td>
                        <Td right>{cf(s.sports_fee)}</Td>
                        <Td right>{cf(s.other_fee)}</Td>
                        <Td right bold color={THEME.success}>{cf(s.total_fee)}</Td>
                        <Td>
                            <div style={{ display: "flex", gap: 5 }}>
                                <Btn variant="ghost" small onClick={() => openEdit(s)}>✏️</Btn>
                                <Btn variant="danger" small onClick={() => setDelTarget(s)}>🗑️</Btn>
                            </div>
                        </Td>
                    </TrHover>
                ))}
            </Table>

            {showForm && (
                <Modal title={editId ? "Edit Fee Structure" : "Add Fee Structure"} onClose={close} width="520px">
                    <form onSubmit={handleSave}>
                        <Field label="Class" required>
                            <select style={{
                                width: "100%", padding: "8px 10px", border: `1px solid ${THEME.border}`,
                                borderRadius: 7, fontSize: 13
                            }}
                                value={form.class} onChange={f("class")}>
                                {CLASSES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </Field>
                        <FormRow>
                            <Field label="Tuition Fee (₹)"><Input type="number" value={form.tuition_fee} onChange={f("tuition_fee")} placeholder="0" /></Field>
                            <Field label="Transport Fee (₹)"><Input type="number" value={form.transport_fee} onChange={f("transport_fee")} placeholder="0" /></Field>
                        </FormRow>
                        <FormRow>
                            <Field label="Library Fee (₹)"><Input type="number" value={form.library_fee} onChange={f("library_fee")} placeholder="0" /></Field>
                            <Field label="Sports Fee (₹)"><Input type="number" value={form.sports_fee} onChange={f("sports_fee")} placeholder="0" /></Field>
                        </FormRow>
                        <Field label="Other Fee (₹)"><Input type="number" value={form.other_fee} onChange={f("other_fee")} placeholder="0" /></Field>
                        <div style={{
                            background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
                            padding: "10px 14px", marginBottom: 12, fontSize: 13
                        }}>
                            <strong>Total Monthly Fee: {cf(calcTotal())}</strong>
                        </div>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <Btn variant="ghost" onClick={close}>Cancel</Btn>
                            <Btn type="submit" disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Add"}</Btn>
                        </div>
                    </form>
                </Modal>
            )}

            {delTarget && <ConfirmDelete name={`fee structure for ${delTarget.class}`}
                onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />}
        </div>
    );
}