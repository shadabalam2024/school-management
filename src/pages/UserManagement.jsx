// ============================================================
// USER MANAGEMENT — Uses users table directly (no Supabase Auth)
// ============================================================
import { useState, useCallback } from "react";
import { AuditAPI } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import { useData } from "../lib/useData.js";
import {
  Modal, Field, Input, Sel, Btn, Table, Td, TrHover,
  PageHeader, Notice, ConfirmDelete, FormRow, THEME
} from "../components/UI.jsx";

const ALL_PAGES = [
  "dashboard", "students", "fees", "expenses", "petty", "staff", "analytics",
  "feestructure", "bulkfee", "defaulter", "promotion", "salaryslip", "export",
  "settings", "admin", "auditlog"
];
const ROLES = ["admin", "accountant", "clerk", "viewer"];
const EMPTY = { user_id: "", name: "", password: "", role: "clerk", access: ["dashboard"] };

// SHA-256 hash for password
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function fetchUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, user_id, name, role, access, is_deleted, created_at")
    .order("created_at");
  if (error) throw new Error(error.message);
  return data || [];
}

export default function UserManagement({ currentUser }) {
  const { data: users, loading, refresh } = useData(useCallback(() => fetchUsers(), []));

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (currentUser?.role !== "admin") {
    return <p style={{ padding: 20, color: THEME.danger }}>⛔ Admin access only.</p>;
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const toggleAccess = page => setForm(p => ({
    ...p,
    access: p.access.includes(page) ? p.access.filter(x => x !== page) : [...p.access, page],
  }));

  const openAdd = () => { setForm(EMPTY); setEditId(null); setShowForm(true); setError(""); };
  const openEdit = u => {
    setForm({ ...u, password: "" }); // never pre-fill password
    setEditId(u.id);
    setShowForm(true); setError("");
  };
  const close = () => { setShowForm(false); setEditId(null); };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (editId) {
        // Update — only hash password if a new one was entered
        const payload = { name: form.name, role: form.role, access: form.access };
        if (form.password) payload.password = await sha256(form.password);
        const { error } = await supabase.from("users").update(payload).eq("id", editId);
        if (error) throw new Error(error.message);
        await AuditAPI.log(currentUser, "UPDATE", "users", editId, `Updated user: ${form.name}`);
      } else {
        // Create new user
        if (!form.password) throw new Error("Password is required");
        if (form.password.length < 4) throw new Error("Password must be at least 4 characters");

        // Check if user_id already exists
        const { data: existing } = await supabase.from("users").select("id").eq("user_id", form.user_id.trim());
        if (existing?.length > 0) throw new Error(`User ID "${form.user_id}" already exists`);

        const hashed = await sha256(form.password);
        const { error } = await supabase.from("users").insert({
          user_id: form.user_id.trim(),
          name: form.name,
          password: hashed,
          role: form.role,
          access: form.access,
        });
        if (error) throw new Error(error.message);
        await AuditAPI.log(currentUser, "CREATE", "users", form.user_id, `Created user: ${form.name}`);
      }
      close(); refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("users")
        .update({ is_deleted: true }).eq("id", delTarget.id);
      if (error) throw new Error(error.message);
      await AuditAPI.log(currentUser, "DELETE", "users", delTarget.id, `Deleted user: ${delTarget.name}`);
      setDelTarget(null); refresh();
    } catch (err) { alert(err.message); }
  };

  const activeUsers = (users || []).filter(u => !u.is_deleted);

  return (
    <div>
      <PageHeader title="🔐 User Management"
        sub="Manage who can access the system"
        action={<Btn onClick={openAdd}>+ Add User</Btn>} />

      <Notice>
        Users log in with their User ID and password. Passwords are stored as SHA-256 hashes.
      </Notice>

      {loading
        ? <p style={{ padding: 20, color: "#6b7280" }}>Loading...</p>
        : (
          <Table headers={["User ID", "Name", "Role", "Access", "Actions"]}>
            {activeUsers.map(u => (
              <TrHover key={u.id}>
                <Td bold>{u.user_id}</Td>
                <Td>{u.name}</Td>
                <Td center>
                  <span style={{
                    background: u.role === "admin" ? "#e0e7ff" : "#f3f4f6",
                    color: u.role === "admin" ? "#3730a3" : "#374151",
                    padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600
                  }}>
                    {u.role}
                  </span>
                </Td>
                <Td small color={THEME.textLight}>
                  {(u.access || []).slice(0, 5).join(", ")}
                  {(u.access || []).length > 5 && ` +${u.access.length - 5} more`}
                </Td>
                <Td>
                  <div style={{ display: "flex", gap: 5 }}>
                    <Btn variant="ghost" small onClick={() => openEdit(u)}>✏️ Edit</Btn>
                    {u.user_id !== currentUser?.user_id && (
                      <Btn variant="danger" small onClick={() => setDelTarget(u)}>🗑️</Btn>
                    )}
                  </div>
                </Td>
              </TrHover>
            ))}
          </Table>
        )
      }

      {showForm && (
        <Modal title={editId ? "Edit User" : "Add User"} onClose={close} width="560px">
          <form onSubmit={handleSave}>
            <FormRow>
              {!editId && (
                <Field label="User ID" required>
                  <Input value={form.user_id} onChange={f("user_id")}
                    placeholder="e.g. admin, john, teacher1" required />
                </Field>
              )}
              <Field label="Full Name" required>
                <Input value={form.name} onChange={f("name")} placeholder="Full name" required />
              </Field>
            </FormRow>

            <FormRow>
              <Field label={editId ? "New Password (leave blank to keep)" : "Password"} required={!editId}>
                <Input type="password" value={form.password} onChange={f("password")}
                  placeholder={editId ? "Leave blank to keep current" : "Set a password"}
                  required={!editId} />
              </Field>
              <Field label="Role">
                <Sel value={form.role} onChange={f("role")}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </Sel>
              </Field>
            </FormRow>

            <Field label="Access Permissions">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 6 }}>
                {ALL_PAGES.map(page => (
                  <label key={page} style={{
                    display: "flex", alignItems: "center", gap: 6, fontSize: 12,
                    cursor: "pointer",
                    background: form.access?.includes(page) ? "#e0e7ff" : THEME.bgAlt,
                    padding: "5px 8px", borderRadius: 6,
                    border: `1px solid ${form.access?.includes(page) ? "#818cf8" : THEME.border}`,
                  }}>
                    <input type="checkbox"
                      checked={form.access?.includes(page) || false}
                      onChange={() => toggleAccess(page)} />
                    {page}
                  </label>
                ))}
              </div>
            </Field>

            {error && (
              <div style={{
                background: "#fee2e2", color: "#991b1b", borderRadius: 7,
                padding: "8px 12px", marginBottom: 10, fontSize: 12
              }}>
                ❌ {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <Btn variant="ghost" onClick={close}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>
                {saving ? "Saving..." : editId ? "Update User" : "Create User"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {delTarget && (
        <ConfirmDelete name={`user "${delTarget.name}"`}
          onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />
      )}
    </div>
  );
}