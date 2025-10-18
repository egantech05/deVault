import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Alert, Modal, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../styles";
import { colors } from "../../../components/Styles";
import {
  fetchLogTemplates,
  fetchLogs,
  insertLog,
  updateLog,
  deleteLogById,
  fetchTemplateFields,
} from "../../../services/logsApi";
import { useDatabase } from "../../../contexts/DatabaseContext";

function getOrderedFieldsForModal(log) {
  if (!log) return [];
  const snap = Array.isArray(log.fields_snapshot) ? log.fields_snapshot : [];
  if (snap.length) {
    return snap
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((f) => ({
        id: f.id,
        name: f.name,
        property_type: f.property_type || "text",
        display_order: f.display_order ?? 0,
        value: (log.value_map || log.data || {})[f.name] ?? "",
      }));
  }
  return Object.entries(log.data || {}).map(([k, v], idx) => ({
    id: idx,
    name: k,
    property_type: typeof v === "number" ? "number" : "text",
    display_order: idx,
    value: v,
  }));
}

export default function LogsTab({ asset }) {
  const { activeDatabaseId, openCreateModal } = useDatabase();

  const [logTemplates, setLogTemplates] = useState([]);
  const [loadingLogTemplates, setLoadingLogTemplates] = useState(false);

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [page, setPage] = useState({ from: 0, size: 20, hasMore: true });

  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logForModal, setLogForModal] = useState(null);
  const [logEditing, setLogEditing] = useState(false);
  const [logEditFields, setLogEditFields] = useState([]);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [selectedLogTemplate, setSelectedLogTemplate] = useState(null);
  const [logFields, setLogFields] = useState([]);
  const [savingLog, setSavingLog] = useState(false);

  const ensureDatabaseSelected = useCallback(() => {
    if (!activeDatabaseId) {
      openCreateModal();
      return false;
    }
    return true;
  }, [activeDatabaseId, openCreateModal]);

  const loadLogTemplates = useCallback(async () => {
    if (!activeDatabaseId) {
      setLogTemplates([]);
      return;
    }
    setLoadingLogTemplates(true);
    try {
      const data = await fetchLogTemplates(activeDatabaseId);
      setLogTemplates(data);
    } catch (error) {
      console.error("loadLogTemplates error:", error);
      setLogTemplates([]);
    } finally {
      setLoadingLogTemplates(false);
    }
  }, [activeDatabaseId]);

  const loadAssetLogs = useCallback(
    async (assetId, from = 0, size = 20) => {
      if (!assetId || !activeDatabaseId) {
        setLogs([]);
        setPage({ from: 0, size, hasMore: false });
        return;
      }
      setLoadingLogs(true);
      const { data, error } = await fetchLogs(activeDatabaseId, assetId, from, size);
      if (error) {
        console.error("loadAssetLogs error:", error);
        if (from === 0) setLogs([]);
        setPage((prev) => ({ ...prev, hasMore: false }));
      } else {
        const rows = (data || []).map((r) => ({
          id: r.id,
          template_id: r.template_id,
          typeName: r.log_templates?.name || "Log",
          data: r.value_map || {},
          fields_snapshot: r.fields_snapshot || [],
          created_at: r.created_at,
        }));
        if (from === 0) setLogs(rows);
        else setLogs((prev) => [...prev, ...rows]);
        setPage({ from, size, hasMore: (data || []).length === size });
      }
      setLoadingLogs(false);
    },
    [activeDatabaseId]
  );

  useEffect(() => {
    if (!asset?.id) {
      setLogs([]);
      setLogTemplates([]);
      return;
    }
    loadLogTemplates();
    loadAssetLogs(asset.id, 0, page.size);
  }, [asset?.id, loadLogTemplates, loadAssetLogs, page.size]);

  const startNewLog = async () => {
    if (!ensureDatabaseSelected()) return;
    if (!logTemplates.length) await loadLogTemplates();
    setSelectedLogTemplate(null);
    setLogFields([]);
    setLogEditing(false);
    setLogEditFields([]);
    setLogForModal(null);
    setShowTemplateChooser(true);
    setLogModalVisible(true);
  };

  const chooseLogTemplate = async (tpl) => {
    setSelectedLogTemplate(tpl);
    setShowTemplateChooser(false);
  
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
      console.error("load template fields error:", err);
      setLogFields([]);
    }
  };
  const saveNewLog = async () => {
    if (!asset?.id || !selectedLogTemplate) {
      Alert.alert("Validation", "Pick a log template first.");
      return;
    }
    if (!ensureDatabaseSelected()) return;

    setSavingLog(true);
    try {
      const value_map = {};
      for (const f of logFields) {
        const key = (f.name || "").trim();
        if (key) value_map[key] = f.value ?? null;
      }
      const fields_snapshot = logFields.map(({ id, name, property_type, default_value, display_order }) => ({
        id,
        name,
        property_type,
        default_value,
        display_order,
      }));

      const { data, error } = await insertLog(activeDatabaseId, {
        asset_id: asset.id,
        template_id: selectedLogTemplate.id,
        value_map,
        extras: {},
        fields_snapshot,
      });

      if (error) throw error;

      setLogs((prev) => [
        {
          id: data.id,
          template_id: data.template_id,
          typeName: data.log_templates?.name || selectedLogTemplate.name,
          data: data.value_map || {},
          fields_snapshot: data.fields_snapshot || fields_snapshot || [],
          created_at: data.created_at,
        },
        ...prev,
      ]);

      setLogModalVisible(false);
      setShowTemplateChooser(false);
      setSelectedLogTemplate(null);
      setLogFields([]);
      Alert.alert("Success", "Log saved.");
    } catch (e) {
      console.error("saveNewLog error:", e);
      Alert.alert("Error", e.message || "Failed to save log.");
    } finally {
      setSavingLog(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!ensureDatabaseSelected()) return;
    try {
      const { error } = await deleteLogById(activeDatabaseId, logId);
      if (error) throw error;
      setLogs((prev) => prev.filter((l) => l.id !== logId));
      Alert.alert("Deleted", "Log removed.");
    } catch (e) {
      console.error("delete log error:", e);
      Alert.alert("Error", e.message || "Failed to delete log.");
    }
  };

  const beginEditFromModal = () => {
    if (!logForModal) return;
    const fields = getOrderedFieldsForModal(logForModal);
    setLogEditFields(fields);
    setLogEditing(true);
  };

  const saveLogFromDetail = async () => {
    if (!logForModal?.id || !ensureDatabaseSelected()) return;
    setSavingLog(true);
    try {
      const value_map = {};
      for (const f of logEditFields) {
        const key = (f.name || "").trim();
        if (key) value_map[key] = f.value ?? null;
      }
      const fields_snapshot = logEditFields.map(({ id, name, property_type, display_order }) => ({
        id,
        name,
        property_type,
        display_order,
      }));

      const { data, error } = await updateLog(activeDatabaseId, logForModal.id, {
        value_map,
        fields_snapshot,
        extras: {},
      });
      if (error) throw error;

      setLogs((prev) =>
        prev.map((l) =>
          l.id === data.id
            ? {
                id: data.id,
                template_id: data.template_id,
                typeName: data.log_templates?.name || l.typeName,
                data: data.value_map || {},
                created_at: data.created_at,
              }
            : l
        )
      );

      setLogForModal((prev) =>
        prev
          ? {
              ...prev,
              data: data.value_map,
              fields_snapshot: data.fields_snapshot || prev.fields_snapshot || [],
              created_at: data.created_at,
              template_id: data.template_id,
            }
          : prev
      );

      setLogEditing(false);
      Alert.alert("Success", "Log updated.");
    } catch (e) {
      console.error("saveLogFromDetail error:", e);
      Alert.alert("Error", e.message || "Failed to update log.");
    } finally {
      setSavingLog(false);
    }
  };

  const headerActions = useMemo(
    () => (
      <Pressable style={styles.primaryChip} onPress={startNewLog}>
        <Ionicons name="add" size={16} color="white" />
        <Text style={styles.primaryChipText}>New Log</Text>
      </Pressable>
    ),
    [startNewLog]
  );

  return (
    <View>
      <View style={styles.logsHeaderRow}>
        <Text style={[styles.label, { marginBottom: 0 }]}>Logs</Text>
        {headerActions}
      </View>

      <View style={{ marginTop: 12 }}>
        {logs.map((item) => {
          const ordered = getOrderedFieldsForModal(item);
          const entries = ordered.map((f) => [f.name, f.value]);
          const visible = entries.slice(0, 999);
          const more = entries.length - visible.length;

          return (
            <Pressable
              key={item.id}
              style={styles.logRow}
              onPress={() => {
                setLogForModal(item);
                setLogEditing(false);
                setLogEditFields([]);
                setLogModalVisible(true);
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.logRowTitle}>{item.typeName}</Text>
                <Text style={styles.logRowTime}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>

              <View style={styles.logValuePills}>
                {visible.map(([k, v]) => (
                  <View key={k} style={styles.valuePill}>
                    <Text style={styles.valuePillText}>
                      {k}: {String(v ?? "")}
                    </Text>
                  </View>
                ))}
                {more > 0 && (
                  <View style={[styles.valuePill, { opacity: 0.7 }]}>
                    <Text style={styles.valuePillText}>+{more} more</Text>
                  </View>
                )}
              </View>

              <Pressable
                style={styles.deleteLogButton}
                onPress={() =>
                  Alert.alert("Delete Log", "Remove this log entry?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => handleDeleteLog(item.id) },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={18} color="#ff5555" />
              </Pressable>
            </Pressable>
          );
        })}

        {loadingLogs && <Text style={{ color: "#666", marginTop: 8 }}>Loading…</Text>}
        {!loadingLogs && logs.length === 0 && (
          <Text style={{ color: "#888", marginTop: 8 }}>No logs yet.</Text>
        )}
        {page.hasMore && !loadingLogs && (
          <Pressable
            style={[styles.cancelButton, { marginTop: 12 }]}
            onPress={() => loadAssetLogs(asset.id, page.from + page.size, page.size)}
          >
            <Text style={styles.cancelButtonText}>Load more</Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={logModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { height: "60%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {logForModal ? logForModal.typeName : "New Log"}
              </Text>
              <Pressable onPress={() => setLogModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.brand} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                {!logForModal && showTemplateChooser && (
                  <View>
                    <Text style={[styles.label, { marginBottom: 8 }]}>Choose a template</Text>
                    {loadingLogTemplates ? (
                      <Text style={{ color: "#666" }}>Loading templates…</Text>
                    ) : logTemplates.length ? (
                      logTemplates.map((tpl) => (
                        <Pressable
                          key={tpl.id}
                          style={styles.templateCard}
                          onPress={() => chooseLogTemplate(tpl)}
                        >
                          <Text style={styles.templateCardTitle}>{tpl.name}</Text>
                        </Pressable>
                      ))
                    ) : (
                      <Text style={{ color: "#888" }}>No log templates yet.</Text>
                    )}
                  </View>
                )}

                {!!selectedLogTemplate && (
                  <>
                    <Text style={[styles.label, { marginBottom: 8 }]}>
                      {selectedLogTemplate?.name}
                    </Text>
                    {logFields.map((f) => (
                      <View key={f.id} style={styles.propertyContainer}>
                        <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>
                          {f.name}
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={String(f.value ?? "")}
                          onChangeText={(v) =>
                            setLogFields((prev) =>
                              prev.map((x) => (x.id === f.id ? { ...x, value: v } : x))
                            )
                          }
                        />
                      </View>
                    ))}
                  </>
                )}

                {logForModal && (
                  <>
                    {!logEditing ? (
                      <Pressable style={styles.primaryChip} onPress={beginEditFromModal}>
                        <Ionicons name="create-outline" size={16} color="white" />
                        <Text style={styles.primaryChipText}>Edit Log</Text>
                      </Pressable>
                    ) : (
                      <>
                        {logEditFields.map((f, idx) => (
                          <View key={`${f.id}-${idx}`} style={styles.propertyContainer}>
                            <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>
                              {f.name}
                            </Text>
                            <TextInput
                              style={styles.input}
                              value={String(f.value ?? "")}
                              onChangeText={(val) =>
                                setLogEditFields((prev) =>
                                  prev.map((x) => (x.id === f.id ? { ...x, value: val } : x))
                                )
                              }
                            />
                          </View>
                        ))}

                        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12, gap: 10 }}>
                          <Pressable
                            onPress={() => {
                              setLogEditing(false);
                              setLogEditFields([]);
                            }}
                          >
                            <Text style={{ color: "#6b7280", fontWeight: "600" }}>Cancel</Text>
                          </Pressable>
                          <Pressable
                            onPress={saveLogFromDetail}
                            disabled={savingLog}
                            style={{
                              backgroundColor: colors.primary,
                              borderRadius: 10,
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              opacity: savingLog ? 0.6 : 1,
                            }}
                          >
                            <Text style={{ color: "white", fontWeight: "600" }}>
                              {savingLog ? "Saving…" : "Save"}
                            </Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            </ScrollView>

            {!logForModal && (
              <View style={styles.modalFooter}>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, opacity: savingLog ? 0.6 : 1 }]}
                  onPress={saveNewLog}
                  disabled={savingLog || !selectedLogTemplate}
                >
                  <Text style={styles.primaryButtonText}>
                    {savingLog ? "Saving…" : "Create Log"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
