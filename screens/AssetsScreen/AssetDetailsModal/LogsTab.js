import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../styles";
import { fetchLogs, updateLog, deleteLogById } from "../../../services/logsApi";
import { useDatabase } from "../../../contexts/DatabaseContext";
import AddLogModal from "./AddLogModal";
import ViewLogModal from "./ViewLogModal";

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
  const { activeDatabaseId, openCreateModal, canDelete } = useDatabase();

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [page, setPage] = useState({ from: 0, size: 20, hasMore: true });

  const [logDetailVisible, setLogDetailVisible] = useState(false);
  const [logForModal, setLogForModal] = useState(null);
  const [logEditing, setLogEditing] = useState(false);
  const [logEditFields, setLogEditFields] = useState([]);
  const [savingLog, setSavingLog] = useState(false);
  const [addLogModalVisible, setAddLogModalVisible] = useState(false);

  const closeLogDetailModal = useCallback(() => {
    setLogDetailVisible(false);
    setLogForModal(null);
    setLogEditing(false);
    setLogEditFields([]);
  }, []);

  const detailFields = useMemo(() => getOrderedFieldsForModal(logForModal), [logForModal]);

  const ensureDatabaseSelected = useCallback(() => {
    if (!activeDatabaseId) {
      openCreateModal();
      return false;
    }
    return true;
  }, [activeDatabaseId, openCreateModal]);

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
      return;
    }
    loadAssetLogs(asset.id, 0, page.size);
  }, [asset?.id, loadAssetLogs, page.size]);

  const startNewLog = useCallback(() => {
    if (!ensureDatabaseSelected()) return;
    setAddLogModalVisible(true);
  }, [ensureDatabaseSelected]);

  const handleLogCreated = useCallback((newLog) => {
    setLogs((prev) => [newLog, ...prev]);
  }, []);

  const handleDeleteLog = async (logId) => {
    if (!canDelete) {
      Alert.alert("Permission", "Only admins can delete logs.");
      return;
    }
    if (!ensureDatabaseSelected()) return;
    try {
      const { error } = await deleteLogById(activeDatabaseId, logId);
      if (error) throw error;
      setLogs((prev) => prev.filter((l) => l.id !== logId));
      if (logForModal?.id === logId) {
        closeLogDetailModal();
      }
      Alert.alert("Deleted", "Log removed.");
    } catch (e) {
      console.error("delete log error:", e);
      Alert.alert("Error", e.message || "Failed to delete log.");
    }
  };

  const beginEditFromModal = () => {
    if (!logForModal) return;
    setLogEditFields(detailFields.map((f) => ({ ...f })));
    setLogEditing(true);
  };

  const cancelEditFromModal = useCallback(() => {
    setLogEditing(false);
    setLogEditFields([]);
  }, []);

  const handleLogFieldChange = useCallback((_, idx, value) => {
    setLogEditFields((prev) =>
      prev.map((item, itemIdx) => (itemIdx === idx ? { ...item, value } : item))
    );
  }, []);

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

      cancelEditFromModal();
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
            <View key={item.id} style={styles.logRow}>
              <Pressable
                style={styles.logRowContent}
                onPress={() => {
                  setLogForModal(item);
                  setLogEditing(false);
                  setLogEditFields([]);
                  setLogDetailVisible(true);
                }}
              >
                <Text style={styles.logRowTitle}>{item.typeName}</Text>

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
              </Pressable>

              <View style={styles.logRowActionColumn}>
                <Text style={styles.logRowTime}>{new Date(item.created_at).toLocaleString()}</Text>
                {canDelete ? (
                  <Pressable
                    style={styles.deleteLogButton}
                    hitSlop={8}
                    onPress={() =>
                      Alert.alert("Delete Log", "Remove this log entry?", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => handleDeleteLog(item.id) },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff5555" />
                  </Pressable>
                ) : null}
              </View>
            </View>
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

      <ViewLogModal
        visible={logDetailVisible}
        log={logForModal}
        detailFields={detailFields}
        logEditing={logEditing}
        logEditFields={logEditFields}
        savingLog={savingLog}
        onClose={closeLogDetailModal}
        onStartEdit={beginEditFromModal}
        onCancelEdit={cancelEditFromModal}
        onChangeField={handleLogFieldChange}
        onSave={saveLogFromDetail}
      />
      <AddLogModal
        visible={addLogModalVisible}
        onClose={() => setAddLogModalVisible(false)}
        assetId={asset?.id}
        onLogCreated={handleLogCreated}
      />
    </View>
  );
}
