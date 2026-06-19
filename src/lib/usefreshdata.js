// ============================================================
// useFreshData — Always fetches directly from Supabase
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";

export function useFreshData(tables) {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const timerRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const results = await Promise.all(
                tables.map(async t => {
                    let q = supabase.from(t.name).select("*");
                    if (t.order) {
                        // Support both "col.asc" / "col.desc" string format and plain column name
                        const parts = t.order.split(".");
                        const col = parts[0];
                        const dir = parts[1]; // "asc" or "desc"
                        const ascending = dir === "asc";
                        q = q.order(col, { ascending });
                    }
                    const { data, error } = await q;
                    if (error) throw new Error(error.message);
                    return [t.name, data || []];
                })
            );
            const obj = {};
            results.forEach(([name, rows]) => { obj[name] = rows; });
            setData(obj);
            setError(null);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        timerRef.current = setInterval(load, 60000);
        return () => clearInterval(timerRef.current);
    }, [load]);

    return { data, loading, error, refresh: load };
}