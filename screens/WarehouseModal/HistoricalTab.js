import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { supabase } from "../../lib/supabase";

export default function HistoricalTab({ item }) {
    const [rows, setRows] = useState([]);

    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from("inventory_movements")
                .select("id, qty_delta, notes, created_at")
                .eq("component_id", item.id)
                .order("created_at", { ascending: false });
            setRows(data || []);
        })();
    }, [item?.id]);

    return (
        <ScrollView style={{ maxHeight: 420 }}>
            {rows.length === 0 ? <Text style={{ opacity: 0.6 }}>No history yet.</Text> : null}
            {rows.map(r => (
                <View key={r.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#222", flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "600" }}>{new Date(r.created_at).toLocaleString()}</Text>
                        <Text style={{ opacity: 0.8, fontSize: 12 }}>{r.notes || "-"}</Text>
                    </View>
                    <Text style={{ fontWeight: "800" }}>{r.qty_delta > 0 ? `+${r.qty_delta}` : `${r.qty_delta}`}</Text>
                </View>
            ))}
        </ScrollView>
    );
}
