import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../styles";
import { colors } from "../../../components/Styles";
import PropertyField from "../components/PropertyField";
import { fetchLogTemplates, insertLog, fetchTemplateFields } from "../../../services/logsApi";
import { useDatabase } from "../../../contexts/DatabaseContext";
import ModalLarge from "../../../components/ModalLarge";

export default function AddLogModal({ visible, onClose, assetId, onLogCreated }) {
  const { activeDatabaseId, openCreateModal } = useDatabase();

  const [logTemplates, setLogTemplates] = useState([]);
  const [loadingLogTemplates, setLoadingLogTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [logFields, setLogFields] = useState([]);
  const [saving, setSaving] = useState(false);

  const resetState = useCallback(() => {
    setSelectedTemplate(null);
    setLogFields([]);
    setSaving(false);
  }, []);

  const loadLogTemplates = useCallback(async () => {
    if (!activeDatabaseId) {
      setLogTemplates([]);
      return;
    }
    setLoadingLogTemplates(true);
    try {
      const data = await fetchLogTemplates(activeDatabaseId);
      setLogTemplates(data || []);
    } catch (error) {
      console.error("AddLogModal.loadLogTemplates error:", error);
      setLogTemplates([]);
    } finally {
      setLoadingLogTemplates(false);
    }
  }, [activeDatabaseId]);

  useEffect(() => {
    if (!visible) {
      resetState();
      setLogTemplates([]);
      return;
    }

    if (!activeDatabaseId) {
      openCreateModal();
      onClose?.();
      return;
    }

    resetState();
    loadLogTemplates();
  }, [visible, activeDatabaseId, loadLogTemplates, resetState, onClose, openCreateModal]);

  const handleSelectTemplate = useCallback(async (tpl) => {
    if (!tpl) return;
    setSelectedTemplate(tpl);
    try {
      const { data, error } = await fetchTemplateFields(tpl.id);
      if (error) throw error;
      const fields = (data || []).map((f) => ({
        id: f.id,
        name: f.property_name || "",
        property_type: f.property_type || "text",
        default_value: f.default_value ?? "",
        display_order: f.display_order ?? 0,
        value: f.default_value ?? "",
      }));
      setLogFields(fields);
    } catch (err) {
      console.error("AddLogModal.fetchTemplateFields error:", err);
      setSelectedTemplate(null);
      setLogFields([]);
      Alert.alert("Error", err.message || "Failed to load template fields.");
    }
  }, []);

  const handleFieldChange = useCallback((fieldId, value) => {
    setLogFields((prev) => prev.map((field) => (field.id === fieldId ? { ...field, value } : field)));
  }, []);

  const handleSave = useCallback(async () => {
    if (!assetId || !selectedTemplate) {
      Alert.alert("Validation", "Pick a log template first.");
      return;
    }
    if (!activeDatabaseId) {
      openCreateModal();
      return;
    }

    setSaving(true);
    try {
      const value_map = {};
      logFields.forEach((field) => {
        const key = (field.name || "").trim();
        if (key) value_map[key] = field.value ?? null;
      });
      const fields_snapshot = logFields.map(
        ({ id, name, property_type, default_value, display_order }) => ({
          id,
          name,
          property_type,
          default_value,
          display_order,
        })
      );

      const { data, error } = await insertLog(activeDatabaseId, {
        asset_id: assetId,
        template_id: selectedTemplate.id,
        value_map,
        extras: {},
        fields_snapshot,
      });
      if (error) throw error;

      const newLog = {
        id: data.id,
        template_id: data.template_id,
        typeName: data.log_templates?.name || selectedTemplate.name || "Log",
        data: data.value_map || value_map,
        fields_snapshot: data.fields_snapshot || fields_snapshot,
        created_at: data.created_at,
      };

      onLogCreated?.(newLog);
      onClose?.();
      Alert.alert("Success", "Log saved.");
    } catch (err) {
      console.error("AddLogModal.save error:", err);
      Alert.alert("Error", err.message || "Failed to save log.");
    } finally {
      setSaving(false);
    }
  }, [assetId, selectedTemplate, logFields, activeDatabaseId, onLogCreated, onClose, openCreateModal]);

  if (!visible) return null;

  return (
    <ModalLarge visible={visible} onRequestClose={onClose}>
      <ModalLarge.Header>
        <ModalLarge.Title>New Log</ModalLarge.Title>
        <Pressable onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.brand} />
        </Pressable>
      </ModalLarge.Header>

      <ModalLarge.Body scroll>
        {!selectedTemplate ? (
          <View>
            <Text style={[styles.label, { marginBottom: 8 }]}>Choose a template</Text>
            {loadingLogTemplates ? (
              <Text style={{ color: "#666" }}>Loading templates…</Text>
            ) : logTemplates.length ? (
              logTemplates.map((tpl) => (
                <Pressable key={tpl.id} style={styles.templateCard} onPress={() => handleSelectTemplate(tpl)}>
                  <Text style={styles.templateCardTitle}>{tpl.name}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={{ color: "#888" }}>No log templates yet.</Text>
            )}
          </View>
        ) : (
          <>
            <Text style={[styles.label, { marginBottom: 8 }]}>{selectedTemplate.name}</Text>
            {logFields.map((field) => (
              <View key={field.id} style={styles.propertyContainer}>
                <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>{field.name}</Text>
                <PropertyField
                  type={field.property_type}
                  value={field.value}
                  onChange={(val) => handleFieldChange(field.id, val)}
                  style={styles.input}
                />
              </View>
            ))}
          </>
        )}
      </ModalLarge.Body>

      <ModalLarge.Footer>
        <View style={[styles.buttonContainer, { alignItems: "stretch" }]}>
          <Pressable style={[styles.cancelButton, { flex: 1, marginRight: 8 }]} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[
              styles.saveButton,
              {
                flex: 1,
                opacity: saving || !selectedTemplate ? 0.6 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={saving || !selectedTemplate}
          >
            <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Create Log"}</Text>
          </Pressable>
        </View>
      </ModalLarge.Footer>
    </ModalLarge>
  );
}
