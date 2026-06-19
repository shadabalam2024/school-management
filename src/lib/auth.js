// ============================================================
// AUTH — Simple direct auth against users table
// No edge functions needed — works exactly like your old system
// Password: SHA-256 hash checked in browser
// Session: localStorage (8 hour expiry)
// ============================================================
import { supabase } from "./supabase.js";

const LS_KEY = "school_session";
const LS_TTL = 8 * 60 * 60 * 1000; // 8 hours

// SHA-256 hash (matches your DB passwords)
async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Cache helpers ──────────────────────────────────────────
export function loadProfileCache() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        const { profile, savedAt } = JSON.parse(raw);
        if (Date.now() - savedAt > LS_TTL) { localStorage.removeItem(LS_KEY); return null; }
        return profile;
    } catch { return null; }
}

function saveProfileCache(profile) {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ profile, savedAt: Date.now() })); } catch { }
}

export function clearProfileCache() {
    try { localStorage.removeItem(LS_KEY); } catch { }
}

// ── Sign in ────────────────────────────────────────────────
export async function signIn(user_id, password) {
    // Hash the password before comparing
    const hashed = await sha256(password);

    const { data: user, error } = await supabase
        .from("users")
        .select("id, user_id, name, role, access, password, is_deleted")
        .eq("user_id", user_id.trim())
        .single();

    if (error || !user) throw new Error("Invalid User ID or password");
    if (user.is_deleted) throw new Error("Account is disabled");
    if (hashed !== user.password) throw new Error("Invalid User ID or password");

    const profile = {
        id: user.id,
        user_id: user.user_id,
        name: user.name,
        role: user.role,
        access: user.access || ["dashboard"],
    };

    saveProfileCache(profile);
    return profile;
}

// ── Sign out ───────────────────────────────────────────────
export async function signOut() {
    clearProfileCache();
}

// ── Verify session — just checks localStorage ──────────────
// No network call needed — session is local
export async function verifySession() {
    return loadProfileCache(); // returns profile or null
}

// ── Rate limiting ──────────────────────────────────────────
const LOCKOUT_KEY = "school_login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;

export function checkRateLimit(id) {
    try {
        const data = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || "{}");
        const k = id.toLowerCase();
        if (!data[k] || Date.now() - data[k].firstAt > LOCKOUT_MS) return { locked: false };
        if (data[k].count >= MAX_ATTEMPTS) {
            const remaining = Math.ceil((LOCKOUT_MS - (Date.now() - data[k].firstAt)) / 60000);
            return { locked: true, remaining };
        }
        return { locked: false, left: MAX_ATTEMPTS - data[k].count };
    } catch { return { locked: false }; }
}

export function recordFailedAttempt(id) {
    try {
        const data = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || "{}");
        const k = id.toLowerCase();
        if (!data[k] || Date.now() - data[k].firstAt > LOCKOUT_MS) data[k] = { count: 0, firstAt: Date.now() };
        data[k].count++;
        localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
        return data[k].count;
    } catch { return 1; }
}

export function clearFailedAttempts(id) {
    try {
        const data = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || "{}");
        delete data[id.toLowerCase()];
        localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
    } catch { }
}