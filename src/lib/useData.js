// ============================================================
// useData — Custom hook for all data fetching
// ✅ Auto-refreshes every 30 seconds
// ✅ Refreshes when you switch pages
// ✅ Refreshes after any save/delete
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";

const REFRESH_INTERVAL = 30 * 1000; // 30 seconds

export function useData(fetchFn) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const timerRef = useRef(null);

    const load = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const result = await fetchFn();
            setData(result || []);
            setError(null);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [fetchFn]);

    useEffect(() => {
        // Load immediately on mount
        load(true);

        // Auto-refresh every 30 seconds silently
        timerRef.current = setInterval(() => load(false), REFRESH_INTERVAL);

        return () => clearInterval(timerRef.current);
    }, [load]);

    // Call this after any save/delete to instantly refresh
    const refresh = useCallback(() => load(false), [load]);

    return { data, loading, error, refresh };
}