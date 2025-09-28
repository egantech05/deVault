import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { View, Text, Alert, Platform } from "react-native";
import { supabase } from "../../../lib/supabase";
import PropertyField from "../components/PropertyField";
import styles from "../styles";
import { colors } from "../../../components/Styles";

export default forwardRef(function InfoTab({ asset, styles, colors, onSaved, onDeleted }, ref) {
    const [fields, setFields] = useState([]); // [{property_id, name, type, value, display_order}]
    const [saving, setSaving] = useState(false);

    // Expose actions to the parent modal
    useImperativeHandle(ref, () => ({
        save: () => save(),
        remove: () => remove(),
        isSaving: () => saving,
    }));

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // a) template field defs
                const { data: defs, error: dErr } = await supabase
                    .from("template_properties")
                    .select("id, property_name, property_type, display_order")
                    .eq("template_id", asset.templateId)
                    .eq("is_active", true)
                    .order("display_order", { ascending: true });
                if (dErr) throw dErr;

                // b) current values
                const { data: vals, error: vErr } = await supabase
                    .from("asset_property_values")
                    .select("property_id, value")
                    .eq("asset_id", asset.id);
                if (vErr) throw vErr;

                const valueMap = Object.fromEntries((vals || []).map((v) => [v.property_id, v.value]));

                const merged = (defs || []).map((d) => ({
                    property_id: d.id,
                    name: d.property_name || "",
                    type: d.property_type || "text",
                    display_order: d.display_order ?? 0,
                    value: valueMap[d.id] ?? "",
                }));

                if (mounted) setFields(merged);
            } catch (e) {
                console.error("InfoTab load error:", e);
                Alert.alert("Error", "Failed to load asset properties.");
            }
        })();
        return () => (mounted = false);
    }, [asset?.id, asset?.templateId]);

    const updateValue = (property_id, value) => {
        setFields((prev) => prev.map((f) => (f.property_id === property_id ? { ...f, value } : f)));
    };

    const save = async () => {
        setSaving(true);
        try {
            const rows = fields.map((p) => ({
                asset_id: asset.id,
                property_id: p.property_id,
                value: p.value === "" ? null : p.value,
            }));

            const { error } = await supabase
                .from("asset_property_values")
                .upsert(rows, { onConflict: "asset_id,property_id" });
            if (error) throw error;

            Alert.alert("Saved", "Asset properties updated.");
            onSaved?.();
        } catch (e) {
            console.error("InfoTab save error:", e);
            Alert.alert("Error", "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        const runDelete = async () => {
            try {
                const { error } = await supabase.from("assets").delete().eq("id", asset.id);
                if (error) throw error;
                Alert.alert("Deleted", "Asset removed.");
                onDeleted?.();
            } catch (e) {
                console.error("InfoTab delete error:", e);
                Alert.alert("Error", e.message || "Failed to delete asset.");
            }
        };

        if (Platform.OS === "web") {
            if (window.confirm("This will remove the asset and its values. Continue?")) {
                await runDelete();
            }
        } else {
            Alert.alert("Delete Asset", "This will remove the asset and its values. Continue?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: runDelete },
            ]);
        }
    };

    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Properties</Text>
            {fields.length === 0 && (
                <Text style={{ color: "#888" }}>No properties available for this template.</Text>
            )}

            {fields.map((p) => (
                <View key={p.property_id} style={styles.propertyContainer}>
                    <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>
                        {p.name} {p.type === "number" ? "(Number)" : p.type === "date" ? "(Date)" : ""}
                    </Text>
                    <PropertyField
                        type={p.type}
                        value={p.value}
                        onChange={(v) => updateValue(p.property_id, v)}
                        style={styles.input}
                    />
                </View>
            ))}

        </View>
    );
});
