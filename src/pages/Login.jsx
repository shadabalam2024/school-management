// ============================================================
// LOGIN PAGE — Custom JWT auth (no Supabase Auth)
// Uses user_id instead of email
// ============================================================
import { useState } from "react";
import { signIn, checkRateLimit, recordFailedAttempt, clearFailedAttempts } from "../lib/auth.js";
import { APP_CONFIG } from "../config/supabase.js";
import { THEME } from "../components/UI.jsx";

export default function Login({ onLogin }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!userId || !password) { setError("Please enter User ID and password."); return; }

    const lockout = checkRateLimit(userId);
    if (lockout.locked) {
      setError(`Too many failed attempts. Try again in ${lockout.remaining} minute(s).`);
      return;
    }

    setLoading(true); setError("");
    try {
      const profile = await signIn(userId.trim(), password);
      clearFailedAttempts(userId);
      onLogin(profile); // instantly updates App.jsx state
    } catch (e) {
      const count = recordFailedAttempt(userId);
      const left = Math.max(0, 5 - count);
      if (left === 0) setError("Account locked for 10 minutes due to too many failed attempts.");
      else setError(`Invalid User ID or password. ${left} attempt(s) remaining.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        <div style={S.logoRow}>
          <span style={{ fontSize: 36 }}>🏫</span>
          <div>
            <h2 style={S.title}>{APP_CONFIG.schoolName}</h2>
            <p style={S.sub}>Management System — Sign In</p>
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}>User ID</label>
          <input style={S.input} value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="Enter your user ID"
            autoComplete="username" />
        </div>
        <div style={S.field}>
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter password"
            autoComplete="current-password" />
        </div>

        {error && <p style={S.error}>{error}</p>}

        <button style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
          onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>

        <p style={{ fontSize: 11, color: THEME.textLight, marginTop: 16, textAlign: "center" }}>
          🔒 Secured · SHA-256 passwords · JWT cookie sessions
        </p>
      </div>
    </div>
  );
}

const S = {
  wrap: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: `linear-gradient(135deg, ${THEME.primary} 0%, #0f3460 100%)`, padding: 16,
  },
  box: {
    background: "#fff", borderRadius: 14, padding: 32, width: "100%", maxWidth: 380,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  logoRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 28 },
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: THEME.primary },
  sub: { margin: "3px 0 0", fontSize: 12, color: THEME.textLight },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: "#1a1a2e" },
  input: {
    width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8,
    fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  },
  btn: {
    width: "100%", padding: "11px", background: THEME.primary, color: "#fff",
    border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4,
  },
  error: { color: THEME.danger, fontSize: 12, marginBottom: 10, textAlign: "center" },
};