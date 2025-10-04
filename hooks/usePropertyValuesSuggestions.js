import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function usePropertyValuesSuggestions({ template_id, property_id, query }) {
    const [values, setValues] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        async function run() {
            if (!template_id || !property_id) {
                setValues([]);
                return;
            }
            setLoading(true);

            // Query the VIEW, not asset_property_values directly
            let q = supabase
                .from("v_property_value_suggestions")
                .select("sample_value,freq")
                .eq("template_id", template_id)
                .eq("property_id", property_id)
                .order("freq", { ascending: false })
                .limit(50);

            // Optional client-side filter
            const { data, error } = await q;
            setLoading(false);

            if (error || isCancelled) {
                console.error("value suggestions error:", error);
                setValues([]);
                return;
            }

            const list = (data || []).map((r) => r.sample_value);

            if (query?.trim()) {
                const qLower = query.trim().toLowerCase();
                setValues(list.filter((v) => (v || "").toLowerCase().includes(qLower)));
            } else {
                setValues(list);
            }
        }

        run();
        return () => { isCancelled = true; };
    }, [template_id, property_id, query]);

    return { values, loading };
}
