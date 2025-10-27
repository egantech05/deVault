// ./AssetsScreen/AddAssetModal.jsx
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "../../lib/supabase";
import { colors } from "../../components/Styles";
import ModalLarge from "../../components/ModalLarge";
import styles from "./styles";
import PropertyField from "./components/PropertyField";
import { useDatabase } from "../../contexts/DatabaseContext";

const webSelectStyle = {
  width: "100%",
  height: 40,
  paddingLeft: 12,
  paddingRight: 36,
  fontSize: 16,
  border: "none",
  outline: "none",
  backgroundColor: "transparent",
  color: colors.primary,
  boxShadow: "none",
  cursor: "pointer",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

export default function AddAssetModal({ visible, onClose, onCreate }) {
  const { activeDatabaseId, openCreateModal } = useDatabase();

  const [assetTemplates, setAssetTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [propInputs, setPropInputs] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetState = useCallback(() => {
    setSelectedTemplateId("");
    setPropInputs([]);
    setLoadingTemplates(false);
    setLoadingFields(false);
    setIsSaving(false);
  }, []);

  const loadTemplates = useCallback(async () => {
    if (!activeDatabaseId) {
      setAssetTemplates([]);
      setLoadingTemplates(false);
      return;
    }

    setLoadingTemplates(true);
    const { data, error } = await supabase
      .from("asset_templates")
      .select("id, name")
      .eq("database_id", activeDatabaseId)
      .order("name", { ascending: true });

    if (error) {
      console.error("loadTemplates error:", error);
      Alert.alert("Error", "Failed to load templates.");
      setAssetTemplates([]);
    } else {
      setAssetTemplates(data || []);
    }
    setLoadingTemplates(false);
  }, [activeDatabaseId]);

  useEffect(() => {
    if (!visible) return;
    if (!activeDatabaseId) {
      openCreateModal();
      onClose?.();
      return;
    }
    resetState();
    loadTemplates();
  }, [visible, activeDatabaseId, loadTemplates, resetState, openCreateModal, onClose]);

  const onTemplateChange = async (templateId) => {
    setSelectedTemplateId(templateId);
    setPropInputs([]);
    if (!templateId || !activeDatabaseId) return;

    setLoadingFields(true);
    const { data, error } = await supabase
      .from("template_properties")
      .select("id, property_name, property_type, default_value, display_order")
      .eq("template_id", templateId)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("fetch template props error:", error);
      Alert.alert("Error", "Failed to load template properties.");
      setLoadingFields(false);
      return;
    }

    const inputs = (data || []).map((p) => ({
      property_id: p.id,
      name: p.property_name,
      type: p.property_type || "text",
      value: p.default_value ?? "",
    }));
    setPropInputs(inputs);
    setLoadingFields(false);
  };

  const updatePropInput = (property_id, value) => {
    setPropInputs((prev) =>
      prev.map((p) => (p.property_id === property_id ? { ...p, value } : p))
    );
  };

  const handleClose = () => {
    resetState();
    onClose?.();
  };

  const handleSave = async () => {
    if (!selectedTemplateId) {
      Alert.alert("Validation", "Please select a template.");
      return;
    }
    if (!activeDatabaseId) {
      openCreateModal();
      return;
    }

    setIsSaving(true);
    try {
      await onCreate(selectedTemplateId, propInputs);
      handleClose();
    } catch (e) {
      console.error("AddAssetModal.save error:", e);
      Alert.alert("Error", e?.message || "Could not create asset.");
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = !!selectedTemplateId && !isSaving;

  if (!visible) return null;

  return (
    <ModalLarge
      visible={visible}
      onRequestClose={handleClose}
      title="New Asset"
      titleStyle={styles.modalTitle}
    >
      <ModalLarge.Body
        scroll
        style={styles.modalScrollView}
        contentContainerStyle={styles.modalContent}
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Template</Text>

          {Platform.OS === "web" ? (
            <View style={styles.pickerWrapper}>
              <React.Fragment>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => onTemplateChange(e.target.value)}
                  style={webSelectStyle}
                  aria-label="Template"
                  disabled={loadingTemplates}
                >
                  <option value="">
                    {loadingTemplates ? "Loading templates…" : "Select a template"}
                  </option>
                  {assetTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <View pointerEvents="none" style={styles.webPickerIcon}>
                  <Ionicons name="chevron-down" size={16} color="#555" />
                </View>
              </React.Fragment>
            </View>
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedTemplateId}
                onValueChange={onTemplateChange}
                mode="dropdown"
                style={styles.picker}
                enabled={!loadingTemplates}
              >
                <Picker.Item
                  label={loadingTemplates ? "Loading templates…" : "Select a template"}
                  value=""
                />
                {assetTemplates.map((t) => (
                  <Picker.Item key={t.id} label={t.name} value={t.id} />
                ))}
              </Picker>
            </View>
          )}

          {!loadingTemplates && assetTemplates.length === 0 && (
            <Text style={styles.helperText}>No templates yet. Create a template first.</Text>
          )}
        </View>

        {!!selectedTemplateId && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Properties</Text>

            {loadingFields && <Text style={styles.helperText}>Loading fields…</Text>}

            {!loadingFields && propInputs.length === 0 && (
              <Text style={styles.helperText}>This template has no fields.</Text>
            )}

            {!loadingFields &&
              propInputs.map((p) => (
                <View key={p.property_id} style={styles.propertyContainer}>
                  <Text
                    style={{
                      marginBottom: 6,
                      color: colors.primary,
                      fontWeight: "600",
                    }}
                  >
                    {p.name}
                    {p.type === "number"
                      ? " (Number)"
                      : p.type === "date"
                      ? " (Date)"
                      : ""}
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
      </ModalLarge.Body>

      <ModalLarge.Footer style={styles.modalFooter}>
        <View style={styles.buttonContainer}>
          <Pressable style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.saveButton, { opacity: canSave ? 1 : 0.6 }]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>
      </ModalLarge.Footer>
    </ModalLarge>
  );
}
