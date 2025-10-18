import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useDatabase } from "../contexts/DatabaseContext";

export function usePropertyValuesSuggestions({ template_id, property_id, query }) {
  const { activeDatabaseId } = useDatabase();
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function run() {
      if (!activeDatabaseId || !template_id || !property_id) {
        setValues([]);
        return;
      }
      setLoading(true);

      const { data, error } = await supabase
        .from("v_property_value_suggestions")
        .select("value_norm, freq")
        .eq("database_id", activeDatabaseId)
        .eq("template_id", template_id)
        .eq("property_id", property_id)
        .order("freq", { ascending: false })
        .limit(50);

      setLoading(false);

      if (error || isCancelled) {
        console.error("value suggestions error:", error);
        setValues([]);
        return;
      }

      const list = (data ?? []).map((r) => r.value_norm);

      if (query?.trim()) {
        const qLower = query.trim().toLowerCase();
        setValues(list.filter((v) => (v || "").toLowerCase().includes(qLower)));
      } else {
        setValues(list);
      }
    }

    run();
    return () => {
      isCancelled = true;
    };
  }, [activeDatabaseId, template_id, property_id, query]);

  return { values, loading };
}
