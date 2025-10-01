// screens/WarehouseScreen/AddComponentModal.js
import React, { useMemo, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles";
import { colors } from "../../components/Styles";
import { supabase } from "../../lib/supabase";

export default function AddComponentModal({ visible, onClose, onCreated }) {
    const [model, setModel] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [description, setDescription] = useState("");
    const [minStock, setMinStock] = useState("0");
    const [initialQty, setInitialQty] = useState("0");
    const [saving, setSaving] = useState(false);

    const TABLE_COMPONENTS = "components_catalog";

    const canSave = useMemo(() => model.trim().length > 0 && !saving, [model, saving]);

    async function handleSave() {
        if (!canSave || saving) return;

        const TABLE_COMPONENTS = "components_catalog"; // FK target for inventory_movements.component_id

        const modelKey = (model || "").trim();
        const mfgKey = (manufacturer || "").trim() || null;
        const descVal = (description || "").trim() || null;

        // normalize numbers
        const min_stock = Number.isFinite(parseInt(minStock, 10)) ? parseInt(minStock, 10) : 0;
        const init_qty = Number.isFinite(parseInt(initialQty, 10)) ? parseInt(initialQty, 10) : 0;

        if (!modelKey) {
            Alert.alert("Missing model", "Please enter a model.");
            return;
        }

        setSaving(true);
        try {
            // 1) Find existing by (model, manufacturer) — handle NULL manufacturer with .is()
            let sel = supabase.from(TABLE_COMPONENTS).select("id").eq("model", modelKey).limit(1);
            sel = mfgKey === null ? sel.is("manufacturer", null) : sel.eq("manufacturer", mfgKey);

            const { data: existingRows, error: selErr } = await sel;
            if (selErr) throw selErr;

            let compId = existingRows?.[0]?.id ?? null;

            // 2) Update or insert into components_catalog
            if (compId) {
                const { error: updErr } = await supabase
                    .from(TABLE_COMPONENTS)
                    .update({ manufacturer: mfgKey, description: descVal, min_stock })
                    .eq("id", compId);
                if (updErr) throw updErr;
            } else {
                const { data: comp, error: insErr } = await supabase
                    .from(TABLE_COMPONENTS)
                    .insert([{ model: modelKey, manufacturer: mfgKey, description: descVal, min_stock }])
                    .select("id")
                    .single();
                if (insErr) throw insErr;
                compId = comp.id;
            }

            // 3) Optional initial movement (uses FK to components_catalog.id)
            if (init_qty !== 0) {
                const { error: mvErr } = await supabase
                    .from("inventory_movements")
                    .insert([{ component_id: compId, qty_delta: init_qty, notes: "Initial stock" }]);
                if (mvErr) throw mvErr;
            }

            // 4) Reset form & notify parent
            setModel("");
            setManufacturer("");
            setDescription("");
            setMinStock("0");
            setInitialQty("0");
            onCreated?.();
        } catch (e) {
            console.error("add component error:", e);
            const msg = e?.message || "Failed to create/update component";
            const details = e?.details ? `\n\nDetails: ${e.details}` : "";
            const hint = e?.hint ? `\n\nHint: ${e.hint}` : "";
            Alert.alert("Error", `${msg}${details}${hint}`);
        } finally {
            setSaving(false);
        }
    }




    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Component</Text>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={22} color={colors.brand} />
                        </Pressable>
                    </View>

                    {/* Body (scrollable) */}
                    <ScrollView
                        style={styles.modalScrollView}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollPadBottom}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Model</Text>
                                <TextInput
                                    style={styles.input}
                                    value={model}
                                    onChangeText={setModel}
                                    placeholder=" "
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Manufacturer</Text>
                                <TextInput
                                    style={styles.input}
                                    value={manufacturer}
                                    onChangeText={setManufacturer}
                                    placeholder=" "
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput
                                    style={[styles.input, { minHeight: 90 }]}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    placeholder=" "
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Minimum Stock</Text>
                                <TextInput
                                    style={styles.input}
                                    value={minStock}
                                    onChangeText={setMinStock}
                                    keyboardType="numeric"
                                    inputMode="numeric"
                                    placeholder="0"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Initial Quantity</Text>
                                <TextInput
                                    style={styles.input}
                                    value={initialQty}
                                    onChangeText={setInitialQty}
                                    keyboardType="numeric"
                                    inputMode="numeric"
                                    placeholder="0"
                                />
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer (pinned) */}
                    <View style={styles.modalFooter}>
                        <View className="buttonContainer" style={styles.buttonContainer}>
                            <Pressable
                                style={[styles.cancelButton, { flex: 1, marginRight: 8 }]}
                                onPress={onClose}
                                disabled={saving}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.saveButton, { flex: 1, marginLeft: 8, opacity: canSave ? 1 : 0.6 }]}
                                onPress={handleSave}
                                disabled={!canSave}
                            >
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
