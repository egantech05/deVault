// screens/WarehouseScreen/AddComponentModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles";
import { colors } from "../../components/Styles";
import { supabase } from "../../lib/supabase";
import { useDatabase } from "../../contexts/DatabaseContext";

const TABLE_COMPONENTS = "components_catalog";

export default function AddComponentModal({ visible, onClose, onCreated }) {
    const { activeDatabaseId, openCreateModal } = useDatabase();
    const [model, setModel] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [minStock, setMinStock] = useState("0");
    const [initialQty, setInitialQty] = useState("0");

    const [saving, setSaving] = useState(false);

    // validation state
    const [checkingModel, setCheckingModel] = useState(false);
    const [modelError, setModelError] = useState(null);

    // for debounced validation cancellation
    const debounceTimer = useRef(null);
    const latestCheckId = useRef(0);

    const trimmedModel = (model || "").trim();

    const canSave = useMemo(() => {
        return trimmedModel.length > 0 && !saving && !checkingModel && !modelError;
    }, [trimmedModel, saving, checkingModel, modelError]);

    // reset form/validation when modal opens
    useEffect(() => {
        if (!visible) return;
        setModel("");
        setManufacturer("");
        setDescription("");
        setLocation("");
        setMinStock("0");
        setInitialQty("0");
        setModelError(null);
        setCheckingModel(false);
        // clear any pending timers
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
    }, [visible]);

    // Debounced check: does a component with this model already exist?
    useEffect(() => {
        if (!visible) return;
        if (!activeDatabaseId) {
            setModelError(null);
            setCheckingModel(false);
            return;
        }

        // clear previous debounce
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        // empty -> no error, nothing to check
        if (trimmedModel.length === 0) {
            setModelError(null);
            setCheckingModel(false);
            return;
        }

        // start debounce
        debounceTimer.current = setTimeout(async () => {
            const checkId = ++latestCheckId.current;
            setCheckingModel(true);
            try {
                // Uniqueness by MODEL only (regardless of manufacturer)
                const { count, error } = await supabase
                    .from(TABLE_COMPONENTS)
                    .select("id", { count: "exact", head: true })
                    .eq("database_id", activeDatabaseId)
                    .eq("model", trimmedModel);

                // Ignore outdated checks
                if (checkId !== latestCheckId.current) return;

                if (error) {
                    // If the API errors, don't block save—surface soft message and continue
                    setModelError(null);
                } else if ((count ?? 0) > 0) {
                    setModelError("This model already exists. Choose a different model.");
                } else {
                    setModelError(null);
                }
            } catch {
                // network/unknown: don't hard-block on validation error
                if (checkId === latestCheckId.current) setModelError(null);
            } finally {
                if (checkId === latestCheckId.current) setCheckingModel(false);
            }
        }, 350); // 350ms debounce

        // cleanup on change/unmount
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [trimmedModel, visible, activeDatabaseId]);

    async function handleSave() {
        if (!canSave || saving) return;

        const modelKey = trimmedModel;
        const mfgKey = (manufacturer || "").trim() || null;
        const descVal = (description || "").trim() || null;
        const locationVal = (location || "").trim() || null;

        const min_stock = Number.isFinite(parseInt(minStock, 10)) ? parseInt(minStock, 10) : 0;
        const init_qty = Number.isFinite(parseInt(initialQty, 10)) ? parseInt(initialQty, 10) : 0;

        setSaving(true);
        try {
            if (!activeDatabaseId) {
                openCreateModal();
                throw new Error("Select a database before adding components.");
            }
            // Final guard: re-check uniqueness by model
            {
                const { count, error } = await supabase
                    .from(TABLE_COMPONENTS)
                    .select("id", { count: "exact", head: true })
                    .eq("database_id", activeDatabaseId)
                    .eq("model", modelKey);

                if (error) {
                    throw error;
                }
                if ((count ?? 0) > 0) {
                    setModelError("This model already exists. Choose a different model.");
                    setSaving(false);
                    return;
                }
            }

            // Insert brand new component (no auto-update of existing)
            const { data: comp, error: insErr } = await supabase
                .from(TABLE_COMPONENTS)
                .insert([{ database_id: activeDatabaseId, model: modelKey, manufacturer: mfgKey, description: descVal, location: locationVal, min_stock }])
                .select("id")
                .single();
            if (insErr) throw insErr;

            const compId = comp.id;

            // Optional initial movement
            if (init_qty !== 0) {
                const { error: mvErr } = await supabase
                    .from("inventory_movements")
                    .insert([{ database_id: activeDatabaseId, component_id: compId, qty_delta: init_qty, notes: "Initial stock" }]);
                if (mvErr) throw mvErr;
            }

            // Notify parent + close
            onCreated?.();
            onClose?.();
        } catch (e) {
            console.error("add component error:", e);
            const msg = e?.message || "Failed to create component";
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
                            {/* Model */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Model</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        modelError ? { borderColor: "#d9534f" } : null
                                    ]}
                                    value={model}
                                    onChangeText={setModel}
                                    placeholder=" "
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    onBlur={() => {
                                        // force immediate validation when leaving the field
                                        setModel(model.trim());
                                    }}
                                />
                                <View style={{ minHeight: 18, marginTop: 4, flexDirection: "row", alignItems: "center" }}>
                                    {checkingModel ? (
                                        <ActivityIndicator size="small" />
                                    ) : modelError ? (
                                        <Text style={{ color: "#d9534f", fontSize: 12 }}>{modelError}</Text>
                                    ) : null}
                                </View>
                            </View>

                            {/* Location */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Location</Text>
                                <TextInput
                                    style={styles.input}
                                    value={location}
                                    onChangeText={setLocation}
                                    placeholder=" "
                                />
                            </View>

                            {/* Manufacturer */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Manufacturer</Text>
                                <TextInput
                                    style={styles.input}
                                    value={manufacturer}
                                    onChangeText={setManufacturer}
                                    placeholder=" "
                                />
                            </View>

                            {/* Description */}
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

                            {/* Minimum Stock */}
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

                            {/* Initial Quantity */}
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

                    {/* Footer */}
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
                                style={[
                                    styles.saveButton,
                                    { flex: 1, marginLeft: 8, opacity: canSave ? 1 : 0.6 }
                                ]}
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
