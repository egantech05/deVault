// screens/WarehouseScreen/WarehouseModal/InfoTab.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ActivityIndicator } from "react-native";
import { colors } from "../../../components/Styles";
import { supabase } from "../../../lib/supabase";
import { useDatabase } from "../../../contexts/DatabaseContext";

export default function InfoTab({ item, onSaved }) {
    const { activeDatabaseId } = useDatabase();
    const qtyOnHand = useMemo(() => item?.qty_on_hand ?? 0, [item?.qty_on_hand]);

    const initialValues = useMemo(
        () => ({
            manufacturer: item?.manufacturer ?? "",
            location: item?.location ?? "",
            description: item?.description ?? "",
            minStock: String(item?.min_stock ?? 0),
        }),
        [item?.id, item?.manufacturer, item?.location, item?.description, item?.min_stock]
    );

    const [manufacturer, setManufacturer] = useState(initialValues.manufacturer);
    const [location, setLocation] = useState(initialValues.location);
    const [description, setDescription] = useState(initialValues.description);
    const [minStockInput, setMinStockInput] = useState(initialValues.minStock);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setManufacturer(initialValues.manufacturer);
        setLocation(initialValues.location);
        setDescription(initialValues.description);
        setMinStockInput(initialValues.minStock);
        setEditing(false);
        setSaving(false);
    }, [initialValues]);

    const minStockNumber = useMemo(() => {
        const parsed = parseInt(minStockInput, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }, [minStockInput]);

    const isLow = qtyOnHand < minStockNumber;

    const hasChanges = useMemo(() => {
        return (
            manufacturer !== initialValues.manufacturer ||
            location !== initialValues.location ||
            description !== initialValues.description ||
            minStockInput !== initialValues.minStock
        );
    }, [manufacturer, location, description, minStockInput, initialValues]);

    const handleCancel = () => {
        setManufacturer(initialValues.manufacturer);
        setLocation(initialValues.location);
        setDescription(initialValues.description);
        setMinStockInput(initialValues.minStock);
        setEditing(false);
    };

    const handleSave = async () => {
        if (!item?.id || saving || !hasChanges) return;

        const manufacturerVal = (manufacturer || "").trim() || null;
        const locationVal = (location || "").trim() || null;
        const descriptionVal = (description || "").trim() || null;
        const parsedMin = parseInt(minStockInput, 10);
        const minStockVal = Number.isFinite(parsedMin) ? parsedMin : 0;

        setSaving(true);
        try {
            const query = supabase
                .from("components_catalog")
                .update({
                    manufacturer: manufacturerVal,
                    location: locationVal,
                    description: descriptionVal,
                    min_stock: minStockVal,
                })
                .eq("id", item.id);

            if (activeDatabaseId) {
                query.eq("database_id", activeDatabaseId);
            }

            const { data, error } = await query
                .select("manufacturer, location, description, min_stock")
                .single();

            if (error) throw error;

            const refreshed = data || {
                manufacturer: manufacturerVal,
                location: locationVal,
                description: descriptionVal,
                min_stock: minStockVal,
            };

            setManufacturer(refreshed.manufacturer ?? "");
            setLocation(refreshed.location ?? "");
            setDescription(refreshed.description ?? "");
            setMinStockInput(String(refreshed.min_stock ?? 0));
            setEditing(false);

            onSaved?.({
                manufacturer: refreshed.manufacturer ?? "",
                location: refreshed.location ?? "",
                description: refreshed.description ?? "",
                min_stock: refreshed.min_stock ?? 0,
            });
        } catch (error) {
            console.error("component update failed", error);
            const msg = error?.message || "Failed to save changes";
            const details = error?.details ? `\n\nDetails: ${error.details}` : "";
            const hint = error?.hint ? `\n\nHint: ${error.hint}` : "";
            Alert.alert("Error", `${msg}${details}${hint}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={s.container}>
            {/* Header row: qty chip on the right */}
            <View style={s.headerRow}>
                <View style={s.qtyChip}>
                    <Text style={[s.qtyChipText, isLow && s.qtyChipTextLow]}>
                        {qtyOnHand}
                    </Text>
                </View>
            </View>

            {/* Model */}
            <View style={s.inputGroup}>
                <Text style={s.label}>Model</Text>
                <TextInput
                    style={[s.input, s.readonlyInput]}
                    value={String(item?.model ?? "-")}
                    editable={false}
                />
            </View>

            {/* Manufacturer */}
            <View style={s.inputGroup}>
                <Text style={s.label}>Manufacturer</Text>
                <TextInput
                    style={[s.input, !editing && s.readonlyInput]}
                    value={manufacturer}
                    editable={editing}
                    onChangeText={setManufacturer}
                    placeholder="-"
                />
            </View>

            {/* Location */}
            <View style={s.inputGroup}>
                <Text style={s.label}>Location</Text>
                <TextInput
                    style={[s.input, !editing && s.readonlyInput]}
                    value={location}
                    editable={editing}
                    onChangeText={setLocation}
                    placeholder="-"
                />
            </View>

            {/* Description */}
            <View style={s.inputGroup}>
                <Text style={s.label}>Description</Text>
                <TextInput
                    style={[s.input, !editing && s.readonlyInput, s.descriptionInput]}
                    value={description}
                    multiline
                    editable={editing}
                    onChangeText={setDescription}
                    placeholder="-"
                />
            </View>

            {/* Minimum stock + status */}
            <View style={s.inputGroup}>
                <Text style={s.label}>Minimum Stock</Text>
                <TextInput
                    style={[s.input, !editing && s.readonlyInput]}
                    value={minStockInput}
                    editable={editing}
                    onChangeText={setMinStockInput}
                    keyboardType="numeric"
                    inputMode="numeric"
                    placeholder="0"
                />
            </View>

            {/* Actions */}
            <View style={s.actionsRow}>
                {!editing ? (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => setEditing(true)}
                        style={({ pressed }) => [
                            s.editButton,
                            pressed && { opacity: 0.85 },
                        ]}
                    >
                        <Text style={s.editButtonText}>Edit</Text>
                    </Pressable>
                ) : (
                    <>
                        <Pressable
                            accessibilityRole="button"
                            onPress={handleCancel}
                            disabled={saving}
                            style={({ pressed }) => [
                                s.cancelButton,
                                pressed && { opacity: 0.85 },
                                saving && { opacity: 0.6 },
                            ]}
                        >
                            <Text style={s.cancelButtonText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            onPress={handleSave}
                            disabled={saving || !hasChanges}
                            style={({ pressed }) => [
                                s.saveButton,
                                (pressed || saving) && { opacity: 0.85 },
                                (!hasChanges || saving) && { opacity: 0.6 },
                            ]}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={s.saveButtonText}>Save</Text>
                            )}
                        </Pressable>
                    </>
                )}
            </View>
        </View>
    );
}

const RED = "#B00020";

const s = StyleSheet.create({
    container: { paddingBottom: 4 },

    // Header
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginBottom: 12,
    },
    qtyChip: {
        borderWidth: 1,
        borderColor: "#e9ecef",
        backgroundColor: "white",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    qtyChipText: { fontWeight: "800", color: "#111", fontSize: 24 },
    qtyChipTextLow: { color: RED },

    // Form look & feel
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 16, color: colors.primary, marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "white",
    },
    readonlyInput: { backgroundColor: "#f9f9f9", opacity: 0.9 },
    descriptionInput: { minHeight: 84, textAlignVertical: "top" },

    actionsRow: { flexDirection: "row", gap: 12 },
    editButton: {
        flex: 1,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
    },
    editButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
    cancelButton: {
        flex: 1,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.brand,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
    },
    cancelButtonText: { color: colors.brand, fontWeight: "700", fontSize: 16 },
    saveButton: {
        flex: 1,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
    },
    saveButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
});
