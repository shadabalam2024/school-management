// ============================================================
// MAIN APP — Simple auth, instant refresh via localStorage
// ============================================================
import { useState, useEffect } from "react";
import { APP_CONFIG } from "./config/supabase.js";
import { loadProfileCache, clearProfileCache, signOut } from "./lib/auth.js";
import { DB } from "./lib/api.js";
import { Store, useStore } from "./lib/store.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Students from "./pages/Students.jsx";
import FeeCollection from "./pages/FeeCollection.jsx";
import Expenses from "./pages/Expenses.jsx";
import PettyCash from "./pages/PettyCash.jsx";
import StaffSalary from "./pages/StaffSalary.jsx";
import Analytics from "./pages/Analytics.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import AuditLog from "./pages/Auditlog.jsx";
import FeeStructure from "./pages/FeeStructure.jsx";
import BulkFee from "./pages/BulkFee.jsx";
import DefaulterReport from "./pages/DefaulterReport.jsx";
import StudentPromotion from "./pages/StudentPromotion.jsx";
import SalarySlip from "./pages/SalarySlip.jsx";
import DataExport from "./pages/DataExport.jsx";
import SchoolSettings from "./pages/SchoolSettings.jsx";

const NAV_SECTIONS = [
  {
    label: "Main", items: [
      { id: "dashboard", label: "Dashboard", icon: "📊" },
      { id: "analytics", label: "Analytics", icon: "📈" },
    ]
  },
  {
    label: "Records", items: [
      { id: "students", label: "Students", icon: "🎓" },
      { id: "fees", label: "Fee Collection", icon: "💰" },
      { id: "expenses", label: "Expenses", icon: "🧾" },
      { id: "petty", label: "Petty Cash", icon: "💵" },
      { id: "staff", label: "Staff & Salary", icon: "👥" },
    ]
  },
  {
    label: "Tools", items: [
      { id: "feestructure", label: "Fee Structure", icon: "📋" },
      { id: "bulkfee", label: "Bulk Fee Generate", icon: "⚡" },
      { id: "defaulter", label: "Defaulter Report", icon: "⚠️" },
      { id: "promotion", label: "Student Promotion", icon: "🎓" },
      { id: "salaryslip", label: "Salary Slip", icon: "🧾" },
      { id: "export", label: "Data Export", icon: "📥" },
    ]
  },
  {
    label: "System", items: [
      { id: "settings", label: "School Settings", icon: "⚙️" },
      { id: "admin", label: "User Management", icon: "🔐" },
      { id: "auditlog", label: "Audit Log", icon: "📋" },
    ]
  },
];

function renderPage(page, user) {
  switch (page) {
    case "dashboard": return <Dashboard />;
    case "students": return <Students currentUser={user} />;
    case "fees": return <FeeCollection currentUser={user} />;
    case "expenses": return <Expenses currentUser={user} />;
    case "petty": return <PettyCash currentUser={user} />;
    case "staff": return <StaffSalary currentUser={user} />;
    case "analytics": return <Analytics />;
    case "feestructure": return <FeeStructure currentUser={user} />;
    case "bulkfee": return <BulkFee currentUser={user} />;
    case "defaulter": return <DefaulterReport />;
    case "promotion": return <StudentPromotion currentUser={user} />;
    case "salaryslip": return <SalarySlip />;
    case "export": return <DataExport />;
    case "settings": return <SchoolSettings currentUser={user} />;
    case "admin": return <UserManagement currentUser={user} />;
    case "auditlog": return <AuditLog />;
    default: return <Dashboard />;
  }
}

const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function App() {
  // Read localStorage instantly — zero network on refresh
  const [user, setUser] = useState(() => loadProfileCache());
  const [activePage, setActivePage] = useState(() => {
    try { return localStorage.getItem("school_active_page") || "dashboard"; }
    catch { return "dashboard"; }
  });
  const [collapsed, setCollapsed] = useState(false);

  const { settings } = useStore();
  const schoolName = settings.school_name || APP_CONFIG.schoolName;
  const academicYear = settings.academic_year || APP_CONFIG.academicYear;

  // Background DB + Store preload — never blocks UI
  useEffect(() => {
    if (!user) return;
    DB.preload().catch(e => console.warn("DB:", e.message));
    Store.loadAll().catch(e => console.warn("Store:", e.message));
  }, [user?.id]);

  const handleLogout = async () => {
    localStorage.removeItem("school_active_page");
    DB.invalidateAll();
    Store.clearCache();
    await signOut();
    setUser(null);
  };

  const canAccess = page => user?.access?.includes(page);
  const goTo = page => {
    if (canAccess(page)) {
      setActivePage(page);
      localStorage.setItem("school_active_page", page);
    }
  };

  if (!user) return <Login onLogin={setUser} />;

  const allItems = NAV_SECTIONS.flatMap(s => s.items);
  const curItem = allItems.find(x => x.id === activePage) || allItems[0];

  return (
    <div style={S.root}>
      <aside style={{ ...S.sidebar, width: collapsed ? 58 : 200 }}>
        <div style={S.logo}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>🏫</span>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <p style={S.logoName}>{schoolName}</p>
              <p style={S.logoYear}>{academicYear}</p>
            </div>
          )}
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {NAV_SECTIONS.map(sec => (
            <div key={sec.label}>
              {!collapsed && <p style={S.secLabel}>{sec.label}</p>}
              {sec.items.filter(x => canAccess(x.id)).map(item => (
                <button key={item.id} onClick={() => goTo(item.id)}
                  title={collapsed ? item.label : ""}
                  style={{
                    ...S.navBtn,
                    background: activePage === item.id ? "rgba(255,255,255,0.13)" : "transparent",
                    borderLeft: `3px solid ${activePage === item.id ? "#e94560" : "transparent"}`,
                    justifyContent: collapsed ? "center" : "flex-start",
                    paddingLeft: collapsed ? 0 : 12,
                  }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span style={S.navLabel}>{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        {!collapsed && (
          <div style={S.userInfo}>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: 10 }}>LOGGED IN AS</p>
            <p style={{ margin: "2px 0 0", color: "#fff", fontSize: 12, fontWeight: 500 }}>{user.name}</p>
            <span style={S.roleChip}>{user.role}</span>
          </div>
        )}
        <button onClick={() => setCollapsed(v => !v)} style={S.toggleBtn}>
          {collapsed ? "▶" : "◀"}
        </button>
      </aside>

      <main style={S.main}>
        <header style={S.topbar}>
          <h1 style={S.topTitle}>{curItem.icon} {curItem.label}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={S.dateChip}>📅 {dateStr}</span>
            <button onClick={handleLogout} style={S.logoutBtn}>Logout</button>
          </div>
        </header>
        <div style={S.content}>
          <ErrorBoundary>
            {canAccess(activePage)
              ? renderPage(activePage, user)
              : <p style={{ padding: 30, color: "#dc2626" }}>⛔ You don't have access to this page.</p>}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

const S = {
  root: { display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Segoe UI',system-ui,sans-serif", background: "var(--color-background-tertiary)" },
  sidebar: { background: "#1a1a2e", display: "flex", flexDirection: "column", transition: "width 0.22s ease", overflow: "hidden", flexShrink: 0, boxShadow: "2px 0 8px rgba(0,0,0,0.18)" },
  logo: { display: "flex", alignItems: "center", gap: 10, padding: "14px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", minHeight: 58 },
  logoName: { color: "#fff", fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: "nowrap" },
  logoYear: { color: "rgba(255,255,255,0.4)", fontSize: 10, margin: "2px 0 0", whiteSpace: "nowrap" },
  secLabel: { padding: "10px 12px 3px", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 0.8, textTransform: "uppercase", margin: 0 },
  navBtn: { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 500, transition: "all 0.15s", textAlign: "left" },
  navLabel: { whiteSpace: "nowrap", overflow: "hidden" },
  userInfo: { padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" },
  roleChip: { display: "inline-block", marginTop: 4, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: 10, padding: "1px 7px", borderRadius: 8, fontWeight: 500 },
  toggleBtn: { background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.5)", padding: "8px", cursor: "pointer", fontSize: 11, width: "100%", borderTop: "1px solid rgba(255,255,255,0.08)" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar: { background: "var(--color-background-primary)", padding: "0 20px", height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  topTitle: { margin: 0, fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" },
  dateChip: { background: "var(--color-background-secondary)", padding: "4px 10px", borderRadius: 20, fontSize: 11, color: "var(--color-text-secondary)" },
  logoutBtn: { padding: "5px 12px", border: "1px solid var(--color-border-secondary)", borderRadius: 7, background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 12 },
  content: { flex: 1, overflow: "auto", padding: 20 },
};