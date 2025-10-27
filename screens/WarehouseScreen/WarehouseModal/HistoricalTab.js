import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useDatabase } from "../../../contexts/DatabaseContext";

export default function HistoricalTab({ item }) {
  const { activeDatabaseId } = useDatabase();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!activeDatabaseId || !item?.id) {
        setRows([]);
        return;
      }

      const { data, error } = await supabase
        .from("inventory_movements")
        .select("id, qty_delta, notes, created_at")
        .eq("database_id", activeDatabaseId)
        .eq("component_id", item.id)
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (error) {
          console.error("load movement history error:", error);
          setRows([]);
        } else {
          setRows(data ?? []);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeDatabaseId, item?.id]);

  return (
    <ScrollView style={{ maxHeight: 420 }}>
      {rows.length === 0 ? <Text style={{ opacity: 0.6 }}>No history yet.</Text> : null}
      {rows.map((r) => (
        <View
          key={r.id}
          style={{
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#222",
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "600" }}>{new Date(r.created_at).toLocaleString()}</Text>
            <Text style={{ opacity: 0.8, fontSize: 12 }}>{r.notes || "-"}</Text>
          </View>
          <Text style={{ fontWeight: "800" }}>
            {r.qty_delta > 0 ? `+${r.qty_delta}` : `${r.qty_delta}`}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
