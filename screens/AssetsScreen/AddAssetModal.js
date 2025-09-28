
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "../../lib/supabase";           // note the relative path
import { colors } from "../../components/Styles";
import styles from "./styles";
import PropertyField from "./components/PropertyField";


export default function AddAssetModal({ visible, onClose, onCreate }) {
    const [assetTemplates, setAssetTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [propInputs, setPropInputs] = useState([]); // [{property_id, name, type, value}]
    const [isSaving, setIsSaving] = useState(false);

    // load templates every time modal opens
    useEffect(() => {
        if (!visible) return;
        (async () => {
            const { data, error } = await supabase
                .from("asset_templates")
                .select("id, name")
                .order("name", { ascending: true });
            if (error) {
                console.error("loadTemplates error:", error);
                Alert.alert("Error", "Failed to load templates.");
                setAssetTemplates([]);
                return;
            }
            setAssetTemplates(data || []);
            // reset state when opening
            setSelectedTemplateId("");
            setPropInputs([]);
        })();
    }, [visible]);

    const onTemplateChange = async (templateId) => {
        setSelectedTemplateId(templateId);
        setPropInputs([]);

        const tid = Number(templateId);
        if (!tid) return;

        const { data, error } = await supabase
            .from("template_properties")
            .select("id, property_name, property_type, default_value, display_order")
            .eq("template_id", tid)
            .eq("is_active", true)
            .order("display_order", { ascending: true });

        if (error) {
            console.error("fetch template props error:", error);
            Alert.alert("Error", "Failed to load template properties.");
            return;
        }

        const inputs = (data || []).map((p) => ({
            property_id: p.id,
            name: p.property_name,
            type: p.property_type || "text",
            value: p.default_value ?? "",
        }));
        setPropInputs(inputs);
    };

    const updatePropInput = (property_id, value) => {
        setPropInputs((prev) =>
            prev.map((p) => (p.property_id === property_id ? { ...p, value } : p))
        );
    };

    const canSave = selectedTemplateId !== "" && !isSaving;

    const handleSave = async () => {
        if (!selectedTemplateId) {
            Alert.alert("Validation", "Please select a template.");
            return;
        }
        setIsSaving(true);
        try {
            await onCreate(Number(selectedTemplateId), propInputs);
            // close + reset
            onClose?.();
            setSelectedTemplateId("");
            setPropInputs([]);
        } catch (e) {
            console.error("AddAssetModal.save error:", e);
            Alert.alert("Error", e.message || "Could not create asset.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Asset</Text>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.brand} />
                        </Pressable>
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.modalScrollView}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Template</Text>

                                {Platform.OS === "web" ? (
                                    <View style={styles.pickerWrapper}>
                                        <select
                                            value={selectedTemplateId}
                                            onChange={(e) => onTemplateChange(e.target.value)}
                                            style={{ width: "100%", height: 40, border: "none", background: "transparent" }}
                                            aria-label="Template"
                                        >
                                            <option value="">Select a template</option>
                                            {assetTemplates.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name}
                                                </option>
                                            ))}
                                        </select>
                                    </View>
                                ) : (
                                    <View style={styles.pickerWrapper}>
                                        <Picker
                                            selectedValue={selectedTemplateId}
                                            onValueChange={(v) => onTemplateChange(v)}
                                            mode="dropdown"
                                            style={styles.picker}
                                        >
                                            <Picker.Item label="Select a template" value={""} />
                                            {assetTemplates.map((t) => (
                                                <Picker.Item key={t.id} label={t.name} value={String(t.id)} />
                                            ))}
                                        </Picker>
                                    </View>
                                )}

                                {assetTemplates.length === 0 && (
                                    <Text style={styles.helperText}>
                                        No templates yet. Create a template first.
                                    </Text>
                                )}
                            </View>

                            {/* Template property inputs */}
                            {!!selectedTemplateId && propInputs.length > 0 && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Properties</Text>
                                    {propInputs.map((p) => (
                                        <View key={p.property_id} style={styles.propertyContainer}>
                                            <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>
                                                {p.name} {p.type === "number" ? "(Number)" : p.type === "date" ? "(Date)" : ""}
                                            </Text>
                                            <PropertyField
                                                type={p.type}
                                                value={p.value}
                                                onChange={(v) => updatePropInput(p.property_id, v)}
                                                style={styles.input}
                                            />
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        <View style={styles.buttonContainer}>
                            <Pressable style={styles.cancelButton} onPress={onClose}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.saveButton, { opacity: canSave ? 1 : 0.6 }]}
                                onPress={handleSave}
                                disabled={!canSave}
                            >
                                <Text style={styles.saveButtonText}>
                                    {isSaving ? "Saving..." : "Save"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
