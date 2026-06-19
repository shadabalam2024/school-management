// ============================================================
// DASHBOARD — Monthly overview only
// ============================================================
import { useState, useEffect } from "react";
import { DashboardAPI, DB } from "../lib/api.js";
import { APP_CONFIG, MONTHS } from "../config/supabase.js";
import { useStore } from "../lib/store.js";
import { StatCard, Card, MiniCard, Loading, ErrorMsg, Modal, Table, Td, TrHover, Badge, THEME } from "../components/UI.jsx";

const now = new Date();
const CUR_MONTH = MONTHS[now.getMonth()];
const CUR_YEAR = now.getFullYear();

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingModal, setPendingModal] = useState(null);

  // ✅ Always call hooks before any early returns
  const { settings } = useStore();
  const schoolName = settings.school_name || APP_CONFIG.schoolName;
  const academicYear = settings.academic_year || APP_CONFIG.academicYear;
  const f = (n) => (settings.currency || "₹") + Math.round(n || 0).toLocaleString("en-IN");

  useEffect(() => {
    DashboardAPI.getStats(CUR_MONTH, CUR_YEAR)
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  const net = stats.netBalance;

  // Pending fee students this month
  const pendingFeeStudents = DB.students
    .filter(s => s.status === "Active")
    .map(s => {
      const fee = DB.fees.find(x => x.student_id === s.student_id && x.month === CUR_MONTH && x.year === CUR_YEAR);
      return { ...s, feeStatus: fee ? fee.status : "No Record" };
    })
    .filter(s => s.feeStatus !== "Paid");

  // Pending salary staff this month
  const pendingSalaryStaff = DB.staff
    .filter(s => s.status === "Active")
    .map(s => {
      const sal = DB.salary.find(x => x.staff_id === s.staff_id && x.month === CUR_MONTH && x.year === CUR_YEAR);
      return { ...s, salStatus: sal ? sal.status : "No Record" };
    })
    .filter(s => s.salStatus !== "Paid");

  return (
    <div>
      {/* Banner */}
      <div style={S.banner}>
        <div>
          <h2 style={S.bannerTitle}>🏫 {schoolName}</h2>
          <p style={S.bannerSub}>{CUR_MONTH} {CUR_YEAR} — Monthly Overview · {academicYear}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={S.netLabel}>NET BALANCE</p>
          <p style={{ ...S.netValue, color: net >= 0 ? "#34d399" : "#f87171" }}>{f(net)}</p>
          <p style={S.netSub}>Fees − Expenses − Salary</p>
        </div>
      </div>

      {/* Main stats */}
      <div style={S.grid4}>
        <StatCard label="Fees Collected" value={f(stats.feesCollected)} icon="💰" color={THEME.success} sub={`${CUR_MONTH} only`} />
        <StatCard label="Expenses" value={f(stats.totalExpenses)} icon="📤" color={THEME.danger} sub={`${CUR_MONTH} only`} />
        <StatCard label="Salary Paid" value={f(stats.salaryPaid)} icon="👩‍🏫" color={THEME.info} sub={`${CUR_MONTH} only`} />
        <StatCard label="Petty Cash" value={f(stats.pettyCashBalance)} icon="💵" color={THEME.purple} sub="Available" />
      </div>

      {/* Clickable pending cards */}
      <div style={S.grid2}>
        <div style={{ ...S.pendCard, borderColor: THEME.warning }} onClick={() => setPendingModal("fees")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ ...S.pendLabel }}>⚠️ Fee Pending — {CUR_MONTH}</p>
              <p style={{ ...S.pendValue, color: THEME.warning }}>{pendingFeeStudents.length} students</p>
            </div>
            <span style={S.arrow}>→</span>
          </div>
          <p style={S.pendHint}>Click to view full pending list</p>
        </div>
        <div style={{ ...S.pendCard, borderColor: THEME.info }} onClick={() => setPendingModal("salary")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={S.pendLabel}>👔 Salary Pending — {CUR_MONTH}</p>
              <p style={{ ...S.pendValue, color: THEME.info }}>{pendingSalaryStaff.length} staff</p>
            </div>
            <span style={S.arrow}>→</span>
          </div>
          <p style={S.pendHint}>Click to view full pending list</p>
        </div>
      </div>

      {/* Bottom stats */}
      <div style={S.grid3}>
        <MiniCard label="Active Students" value={stats.totalStudents} />
        <MiniCard label="Active Staff" value={stats.totalStaff} />
        <MiniCard label="Fee Records (Month)" value={stats.feeRecords} />
      </div>

      {/* Summary card */}
      <Card>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>📊 {CUR_MONTH} {CUR_YEAR} — Financial Summary</p>
        {[
          ["Fees Collected", f(stats.feesCollected), THEME.success, false],
          ["Total Expenses", `− ${f(stats.totalExpenses)}`, THEME.danger, false],
          ["Salary Paid", `− ${f(stats.salaryPaid)}`, THEME.danger, false],
          ["Net Balance", f(net), net >= 0 ? THEME.success : THEME.danger, true],
        ].map(([label, value, color, bold]) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between",
            padding: bold ? "8px 0" : "5px 0",
            borderTop: bold ? `1px solid ${THEME.border}` : "none",
            marginTop: bold ? 6 : 0
          }}>
            <span style={{ fontSize: 13, color: THEME.textLight, fontWeight: bold ? 600 : 400 }}>{label}</span>
            <span style={{ fontSize: bold ? 17 : 13, fontWeight: bold ? 700 : 500, color }}>{value}</span>
          </div>
        ))}
      </Card>

      {/* Pending Fees Modal */}
      {pendingModal === "fees" && (
        <Modal title={`⚠️ Fee Pending — ${CUR_MONTH} ${CUR_YEAR} (${pendingFeeStudents.length})`}
          onClose={() => setPendingModal(null)} width="540px">
          <Table headers={["#", "Student", "Class", "Phone", "Status"]}>
            {pendingFeeStudents.map(s => (
              <TrHover key={s.id}>
                <Td>{s.num}</Td>
                <Td bold>{s.name}</Td>
                <Td>{s.class} {s.section}</Td>
                <Td>{s.phone}</Td>
                <Td center><Badge status={s.feeStatus} /></Td>
              </TrHover>
            ))}
          </Table>
        </Modal>
      )}

      {/* Pending Salary Modal */}
      {pendingModal === "salary" && (
        <Modal title={`👔 Salary Pending — ${CUR_MONTH} ${CUR_YEAR} (${pendingSalaryStaff.length})`}
          onClose={() => setPendingModal(null)} width="500px">
          <Table headers={["#", "Name", "Designation", "Status"]}>
            {pendingSalaryStaff.map(s => (
              <TrHover key={s.id}>
                <Td>{s.num}</Td>
                <Td bold>{s.name}</Td>
                <Td>{s.designation}</Td>
                <Td center><Badge status={s.salStatus} /></Td>
              </TrHover>
            ))}
          </Table>
        </Modal>
      )}
    </div>
  );
}

const S = {
  banner: {
    background: `linear-gradient(135deg, ${THEME.primary} 0%, #0f3460 100%)`,
    borderRadius: 12, padding: "18px 22px", marginBottom: 18,
    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
  },
  bannerTitle: { color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 },
  bannerSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, margin: "3px 0 0" },
  netLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: 1, margin: 0 },
  netValue: { fontSize: 26, fontWeight: 700, margin: "3px 0 0" },
  netSub: { color: "rgba(255,255,255,0.5)", fontSize: 10, margin: 0 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 },
  pendCard: {
    background: THEME.bg, borderRadius: 10, padding: "13px 15px",
    border: `1.5px solid`, cursor: "pointer"
  },
  pendLabel: { fontSize: 12, color: THEME.textLight, margin: "0 0 3px" },
  pendValue: { fontSize: 22, fontWeight: 700, margin: 0 },
  pendHint: { fontSize: 11, color: THEME.info, margin: "6px 0 0" },
  arrow: { fontSize: 18, color: THEME.textLight },
};