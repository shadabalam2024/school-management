// ============================================================
// AUDIT LOG PAGE — Fix #7
// Shows who did what and when
// ============================================================
import { useCallback } from "react";
import { AuditAPI } from "../lib/api.js";
import { useData } from "../lib/useData.js";
import { PageHeader, Table, Td, TrHover, Loading, ErrorMsg, THEME } from "../components/UI.jsx";

const ACTION_COLORS = {
    CREATE: { bg: "#d1fae5", color: "#065f46" },
    UPDATE: { bg: "#dbeafe", color: "#1e40af" },
    DELETE: { bg: "#fee2e2", color: "#991b1b" },
};

export default function AuditLog() {
    const fetchLogs = useCallback(() => AuditAPI.getAll(), []);
    const { data: logs, loading, error } = useData(fetchLogs);

    if (loading) return <Loading />;
    if (error) return <ErrorMsg msg={error} />;

    return (
        <div>
            <PageHeader
                title="📋 Audit Log"
                sub={`${logs.length} total actions recorded`} />

            <Table headers={["Time", "User", "Action", "Table", "Details"]}>
                {logs.map(log => {
                    const ac = ACTION_COLORS[log.action] || { bg: "#f3f4f6", color: "#374151" };
                    return (
                        <TrHover key={log.id}>
                            <Td small>{new Date(log.created_at).toLocaleString("en-IN")}</Td>
                            <Td bold>{log.user_name} <span style={{ fontSize: 11, color: THEME.textLight }}>({log.user_id})</span></Td>
                            <Td center>
                                <span style={{
                                    background: ac.bg, color: ac.color,
                                    padding: "2px 8px", borderRadius: 10,
                                    fontSize: 11, fontWeight: 600
                                }}>
                                    {log.action}
                                </span>
                            </Td>
                            <Td center small>{log.table_name}</Td>
                            <Td small color={THEME.textLight}>{log.details}</Td>
                        </TrHover>
                    );
                })}
            </Table>
        </div>
    );
}