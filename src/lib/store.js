// ============================================================
// GLOBAL APP STORE — localStorage cache for instant refresh
// ============================================================
import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

const LS_SETTINGS_KEY = "school_store_settings";
const LS_FEE_KEY = "school_store_fee_structure";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ── Read from localStorage instantly (synchronous) ─────────
function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const { value, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > CACHE_TTL) return fallback; // expired
    return value;
  } catch { return fallback; }
}

function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() })); } catch { }
}

function clearLS(key) {
  try { localStorage.removeItem(key); } catch { }
}

// ── Initial state — from localStorage, no network needed ───
let _settings = readLS(LS_SETTINGS_KEY, {
  school_name: "My School", school_address: "", school_phone: "",
  school_email: "", academic_year: "2024-25", currency: "₹",
});
let _feeStructure = readLS(LS_FEE_KEY, []);
let _listeners = [];

function notify() { _listeners.forEach(fn => fn()); }

export const Store = {
  getSettings() { return { ..._settings }; },
  getFeeStructure() { return [..._feeStructure]; },
  fmt(amount) {
    return (_settings.currency || "₹") + Math.round(amount || 0).toLocaleString("en-IN");
  },
  getFeeForClass(cls) {
    return _feeStructure.find(f => f.class === cls) || null;
  },

  async loadSettings() {
    try {
      const { data } = await supabase.from("school_settings").select("*");
      if (data) {
        const obj = {};
        data.forEach(r => { obj[r.key] = r.value; });
        _settings = { ..._settings, ...obj };
        writeLS(LS_SETTINGS_KEY, _settings); // persist for next refresh
      }
      notify();
    } catch (e) { console.warn("Settings load failed:", e.message); }
  },

  async loadFeeStructure() {
    try {
      const { data } = await supabase.from("fee_structure").select("*").order("class");
      _feeStructure = Array.isArray(data) ? data : [];
      writeLS(LS_FEE_KEY, _feeStructure); // persist for next refresh
      notify();
    } catch (e) { console.warn("Fee structure load failed:", e.message); }
  },

  async loadAll() {
    await Promise.allSettled([this.loadSettings(), this.loadFeeStructure()]);
  },

  // Call this on logout so next user doesn't see stale data
  clearCache() {
    clearLS(LS_SETTINGS_KEY);
    clearLS(LS_FEE_KEY);
    _settings = { school_name: "My School", school_address: "", school_phone: "", school_email: "", academic_year: "2024-25", currency: "₹" };
    _feeStructure = [];
  },

  subscribe(fn) { _listeners.push(fn); },
  unsubscribe(fn) { _listeners = _listeners.filter(l => l !== fn); },
};

export function useStore() {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const fn = () => forceUpdate(n => n + 1);
    Store.subscribe(fn);
    return () => Store.unsubscribe(fn);
  }, []);
  return {
    settings: Store.getSettings(),
    feeStructure: Store.getFeeStructure(),
    fmt: Store.fmt.bind(Store),
    getFeeForClass: Store.getFeeForClass.bind(Store),
  };
}