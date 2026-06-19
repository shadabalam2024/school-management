// ============================================================
// DATABASE API — Uses Supabase JS client with Auth
// localStorage cache for instant refresh
// ============================================================
import { supabase } from "./supabase.js";

const DB_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── localStorage helpers ───────────────────────────────────
function lsWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() })); } catch { }
}
function lsRead(key, ttl = DB_CACHE_TTL) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { value, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > ttl) return null;
    return value;
  } catch { return null; }
}
function lsClear(key) {
  try { localStorage.removeItem(key); } catch { }
}

// ── Generic helpers ────────────────────────────────────────
async function getAll(table, order = "created_at", ascending = false) {
  const { data, error } = await supabase
    .from(table).select("*").order(order, { ascending });
  if (error) throw new Error(error.message);
  return data || [];
}

async function insert(table, payload) {
  const { data, error } = await supabase
    .from(table).insert(payload).select();
  if (error) throw new Error(error.message);
  return data || [];
}

async function update(table, id, payload) {
  const { data, error } = await supabase
    .from(table).update(payload).eq("id", id).select();
  if (error) throw new Error(error.message);
  return data || [];
}

async function del(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

// ── Fix #7: Unique receipt number ─────────────────────────
export function generateReceiptNo() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `RCP-${ts}-${rand}`;
}

// ── Fix #5: Input validation ───────────────────────────────
export const Validate = {
  phone(val) {
    if (!val) return null;
    const clean = val.replace(/\s/g, "");
    if (!/^\d{10}$/.test(clean)) return "Phone must be exactly 10 digits";
    return null;
  },
  amount(val, label = "Amount") {
    const n = parseFloat(val);
    if (isNaN(n)) return `${label} must be a number`;
    if (n < 0) return `${label} cannot be negative`;
    return null;
  },
  required(val, label) {
    if (!val || !String(val).trim()) return `${label} is required`;
    return null;
  },
  collect(...checks) { return checks.filter(Boolean); },
};

// ── STUDENTS ──────────────────────────────────────────────
export const StudentsAPI = {
  getAll: () => getAll("students", "num"),
  async create(d) {
    const { data: ex } = await supabase.from("students")
      .select("id").eq("student_id", d.student_id);
    if (ex?.length > 0) throw new Error(`Student ID "${d.student_id}" already exists`);
    const result = await insert("students", d);
    DB.invalidate("students");
    return result;
  },
  async update(id, d) {
    const result = await update("students", id, d);
    DB.invalidate("students");
    return result;
  },
  async delete(id) {
    const { data } = await supabase.from("students").select("student_id").eq("id", id);
    if (data?.[0]) {
      await supabase.from("fee_payments").delete().eq("student_id", data[0].student_id);
      DB.invalidate("fee_payments");
    }
    const result = await del("students", id);
    DB.invalidate("students");
    return result;
  },
};

// ── FEE PAYMENTS ──────────────────────────────────────────
export const FeesAPI = {
  getAll: () => getAll("fee_payments", "year", false),
  async create(d) {
    const { data: ex } = await supabase.from("fee_payments")
      .select("id").eq("receipt_no", d.receipt_no);
    if (ex?.length > 0) d = { ...d, receipt_no: generateReceiptNo() };
    const result = await insert("fee_payments", d);
    DB.invalidate("fee_payments");
    return result;
  },
  async update(id, d) {
    const result = await update("fee_payments", id, d);
    DB.invalidate("fee_payments");
    return result;
  },
  async delete(id) {
    const result = await del("fee_payments", id);
    DB.invalidate("fee_payments");
    return result;
  },
};

// ── EXPENSES ──────────────────────────────────────────────
export const ExpensesAPI = {
  getAll: () => getAll("expenses", "expense_date", false),
  async create(d) { const r = await insert("expenses", d); DB.invalidate("expenses"); return r; },
  async update(id, d) { const r = await update("expenses", id, d); DB.invalidate("expenses"); return r; },
  async delete(id) { const r = await del("expenses", id); DB.invalidate("expenses"); return r; },
};

// ── PETTY CASH ────────────────────────────────────────────
export const PettyCashAPI = {
  getAll: () => getAll("petty_cash", "cash_date", false),
  async create(d) { const r = await insert("petty_cash", d); DB.invalidate("petty_cash"); return r; },
  async update(id, d) { const r = await update("petty_cash", id, d); DB.invalidate("petty_cash"); return r; },
  async delete(id) { const r = await del("petty_cash", id); DB.invalidate("petty_cash"); return r; },
};

// ── STAFF ─────────────────────────────────────────────────
export const StaffAPI = {
  getAll: () => getAll("staff", "num"),
  async create(d) {
    const { data: ex } = await supabase.from("staff")
      .select("id").eq("staff_id", d.staff_id);
    if (ex?.length > 0) throw new Error(`Staff ID "${d.staff_id}" already exists`);
    const result = await insert("staff", d);
    DB.invalidate("staff");
    return result;
  },
  async update(id, d) { const r = await update("staff", id, d); DB.invalidate("staff"); return r; },
  async delete(id) {
    const { data } = await supabase.from("staff").select("staff_id").eq("id", id);
    if (data?.[0]) {
      await supabase.from("salary_payments").delete().eq("staff_id", data[0].staff_id);
      DB.invalidate("salary_payments");
    }
    const result = await del("staff", id);
    DB.invalidate("staff");
    return result;
  },
};

// ── SALARY ────────────────────────────────────────────────
export const SalaryAPI = {
  getAll: () => getAll("salary_payments", "year", false),
  async create(d) { const r = await insert("salary_payments", d); DB.invalidate("salary_payments"); return r; },
  async update(id, d) { const r = await update("salary_payments", id, d); DB.invalidate("salary_payments"); return r; },
  async delete(id) { const r = await del("salary_payments", id); DB.invalidate("salary_payments"); return r; },
};

// ── PROFILES ──────────────────────────────────────────────
export const ProfilesAPI = {
  getAll: () => getAll("profiles", "created_at"),
  create: (d) => insert("profiles", d),
  update: (id, d) => update("profiles", id, d),
  async delete(id) {
    return update("profiles", id, { is_deleted: true });
  },
};

// ── FEE STRUCTURE ─────────────────────────────────────────
export const FeeStructureAPI = {
  getAll: () => getAll("fee_structure", "class"),
  create: (d) => insert("fee_structure", d),
  update: (id, d) => update("fee_structure", id, d),
  delete: (id) => del("fee_structure", id),
  async getByClass(cls) {
    const { data } = await supabase.from("fee_structure").select("*").eq("class", cls);
    return data?.[0] || null;
  },
};

// ── SCHOOL SETTINGS ───────────────────────────────────────
export const SettingsAPI = {
  async getAll() {
    const { data } = await supabase.from("school_settings").select("*");
    const obj = {};
    (data || []).forEach(r => { obj[r.key] = r.value; });
    return obj;
  },
  async set(key, value) {
    const { data: ex } = await supabase.from("school_settings").select("id").eq("key", key);
    if (ex?.length > 0) {
      await supabase.from("school_settings").update({ value }).eq("key", key);
    } else {
      await insert("school_settings", { key, value });
    }
  },
};

// ── AUDIT LOG ─────────────────────────────────────────────
export const AuditAPI = {
  getAll: () => getAll("audit_log", "created_at", false),
  async log(user, action, tableName, recordId, details = "") {
    try {
      await insert("audit_log", {
        user_id: user?.user_id || "unknown",
        user_name: user?.name || "unknown",
        action, table_name: tableName,
        record_id: String(recordId || ""),
        details: String(details || ""),
      });
    } catch (e) { console.warn("Audit log failed:", e.message); }
  },
};

// ── PROMOTION SNAPSHOTS ───────────────────────────────────
export const PromotionAPI = {
  async saveSnapshot(takenBy, snapshot) {
    return insert("promotion_snapshots", { taken_by: takenBy, snapshot });
  },
  async getLatest() {
    const { data } = await supabase.from("promotion_snapshots")
      .select("*").order("created_at", { ascending: false }).limit(1);
    return data?.[0] || null;
  },
  delete: (id) => del("promotion_snapshots", id),
};

// ── BATCH INSERT ──────────────────────────────────────────
export async function batchInsert(table, rows) {
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) throw new Error(error.message);
  return data || [];
}

// ── DASHBOARD STATS ───────────────────────────────────────
export const DashboardAPI = {
  async getStats(month, year) {
    const MONTHS = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const monthIdx = MONTHS.indexOf(month);
    const mm = String(monthIdx + 1).padStart(2, "0");
    const nextMonth = monthIdx === 11 ? 0 : monthIdx + 1;
    const nextYear = monthIdx === 11 ? year + 1 : year;
    const nextMM = String(nextMonth + 1).padStart(2, "0");
    const dateFrom = `${year}-${mm}-01`;
    const dateTo = `${nextYear}-${nextMM}-01`;

    const [
      { data: students },
      { data: fees },
      { data: expenses },
      { data: petty },
      { data: salary },
      { data: staff },
    ] = await Promise.all([
      supabase.from("students").select("id,status"),
      supabase.from("fee_payments").select("paid_amount,total_amount,status").eq("month", month).eq("year", year),
      supabase.from("expenses").select("amount").gte("expense_date", dateFrom).lt("expense_date", dateTo),
      supabase.from("petty_cash").select("type,amount"),
      supabase.from("salary_payments").select("net_salary,status").eq("month", month).eq("year", year),
      supabase.from("staff").select("id,status"),
    ]);

    const totalStudents = (students || []).filter(s => s.status === "Active").length;
    const totalStaff = (staff || []).filter(s => s.status === "Active").length;
    const feesCollected = (fees || []).filter(f => f.status === "Paid").reduce((s, f) => s + (f.paid_amount || 0), 0);
    const feesPending = (fees || []).filter(f => f.status !== "Paid").reduce((s, f) => s + ((f.total_amount || 0) - (f.paid_amount || 0)), 0);
    const defaulters = (fees || []).filter(f => f.status === "Unpaid").length;
    const totalExpenses = (expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    const pettyCashBalance =
      (petty || []).filter(p => p.type === "IN").reduce((s, p) => s + (p.amount || 0), 0) -
      (petty || []).filter(p => p.type === "OUT").reduce((s, p) => s + (p.amount || 0), 0);
    const salaryPaid = (salary || []).filter(s => s.status === "Paid").reduce((s, r) => s + (r.net_salary || 0), 0);

    return {
      totalStudents, totalStaff,
      feesCollected, feesPending, defaulters,
      totalExpenses, pettyCashBalance, salaryPaid,
      netBalance: feesCollected - totalExpenses - salaryPaid,
      feeRecords: (fees || []).length,
      paidCount: (fees || []).filter(f => f.status === "Paid").length,
    };
  },
};

// ── DB CACHE — memory + localStorage for instant refresh ──
const LS_PREFIX = "school_db_";
const TABLE_ORDER = {
  fee_payments: "year",
  students: "num",
  staff: "num",
  salary_payments: "year",
  petty_cash: "cash_date",
  expenses: "expense_date",
};

export const DB = {
  _cache: {},       // in-memory (fast)
  _loadedAt: {},    // in-memory timestamps
  _TTL: 5 * 60 * 1000, // 5 minutes

  // On startup, hydrate memory cache from localStorage immediately (synchronous)
  hydrate() {
    for (const table of Object.keys(TABLE_ORDER)) {
      const cached = lsRead(LS_PREFIX + table);
      if (cached) {
        this._cache[table] = cached;
        this._loadedAt[table] = Date.now(); // treat as fresh
      }
    }
  },

  async _load(table) {
    const now = Date.now();
    const stale = !this._loadedAt[table] || (now - this._loadedAt[table] > this._TTL);
    if (stale) {
      const order = TABLE_ORDER[table] || "created_at";
      this._cache[table] = await getAll(table, order, false);
      this._loadedAt[table] = now;
      lsWrite(LS_PREFIX + table, this._cache[table]); // persist for next refresh
    }
    return this._cache[table];
  },

  invalidate(table) {
    delete this._cache[table];
    delete this._loadedAt[table];
    lsClear(LS_PREFIX + table);
  },

  invalidateAll() {
    this._cache = {};
    this._loadedAt = {};
    for (const table of Object.keys(TABLE_ORDER)) lsClear(LS_PREFIX + table);
  },

  get fees() { return this._cache["fee_payments"] || []; },
  get students() { return this._cache["students"] || []; },
  get staff() { return this._cache["staff"] || []; },
  get salary() { return this._cache["salary_payments"] || []; },
  get petty() { return this._cache["petty_cash"] || []; },
  get expenses() { return this._cache["expenses"] || []; },

  async preload() {
    await Promise.all(Object.keys(TABLE_ORDER).map(t => this._load(t)));
  },
};

// Hydrate from localStorage the moment this module is imported — zero wait
DB.hydrate();