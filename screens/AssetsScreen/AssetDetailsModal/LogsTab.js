import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Alert, Modal, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import styles from "../styles";
import { colors } from "../../../components/Styles";

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
    const [logTemplates, setLogTemplates] = useState([]);
    const [loadingLogTemplates, setLoadingLogTemplates] = useState(false);

    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [page, setPage] = useState({ from: 0, size: 20, hasMore: true });

    // composer / modal
    const [logModalVisible, setLogModalVisible] = useState(false);
    const [logForModal, setLogForModal] = useState(null);
    const [logEditing, setLogEditing] = useState(false);
    const [logEditFields, setLogEditFields] = useState([]);
    const [showTemplateChooser, setShowTemplateChooser] = useState(false);
    const [selectedLogTemplate, setSelectedLogTemplate] = useState(null);
    const [logFields, setLogFields] = useState([]);
    const [savingLog, setSavingLog] = useState(false);

    useEffect(() => {
        if (!asset?.id) return;
        loadLogTemplates();
        loadAssetLogs(asset.id, 0, 20);
    }, [asset?.id]);

    const loadLogTemplates = async () => {
        setLoadingLogTemplates(true);
        const { data, error } = await supabase.from("log_templates").select("id, name").order("name", { ascending: true });
        if (error) {
            console.error("loadLogTemplates error:", error);
            setLogTemplates([]);
        } else {
            setLogTemplates(data || []);
        }
        setLoadingLogTemplates(false);
    };

    const loadAssetLogs = async (assetId, from = 0, size = 20) => {
        if (!assetId) return;
        setLoadingLogs(true);
        const { data, error } = await supabase
            .from("log_entries")
            .select("id,template_id, value_map,fields_snapshot, created_at, log_templates(name)")
            .eq("asset_id", assetId)
            .order("created_at", { ascending: false })
            .range(from, from + size - 1);

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
    };

    const startNewLog = async () => {
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

        const { data, error } = await supabase
            .from("log_template_fields")
            .select("id, property_name, property_type, default_value, display_order")
            .eq("template_id", tpl.id)
            .order("display_order", { ascending: true });

        if (error) {
            console.error("load template fields error:", error);
            setLogFields([]);
            return;
        }
        const fields = (data || []).map((f) => ({
            id: f.id,
            name: f.property_name || "",
            property_type: f.property_type || "text",
            default_value: f.default_value ?? "",
            display_order: f.display_order ?? 0,
            value: f.default_value ?? "",
        }));
        setLogFields(fields);
    };

    const saveNewLog = async () => {
        if (!asset?.id || !selectedLogTemplate) {
            Alert.alert("Validation", "Pick a log template first.");
            return;
        }
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

            const { data, error } = await supabase
                .from("log_entries")
                .insert([
                    {
                        asset_id: asset.id,
                        template_id: selectedLogTemplate.id,
                        value_map,
                        extras: {},
                        fields_snapshot,
                    },
                ])
                .select("id, template_id, value_map,fields_snapshot, created_at, log_templates(name)")
                .single();

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
        try {
            const { error } = await supabase.from("log_entries").delete().eq("id", logId);
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
        if (!logForModal?.id) return;
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

            const { data, error } = await supabase
                .from("log_entries")
                .update({ value_map, fields_snapshot, extras: {} })
                .eq("id", logForModal.id)
                .select("id, template_id, value_map,fields_snapshot, created_at, log_templates(name)")
                .single();

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

    return (
        <View>
            {/* Header row */}
            <View style={styles.logsHeaderRow}>
                <Text style={[styles.label, { marginBottom: 0 }]}>Logs</Text>
                <Pressable style={styles.primaryChip} onPress={startNewLog}>
                    <Ionicons name="add" size={16} color="white" />
                    <Text style={styles.primaryChipText}>New Log</Text>
                </Pressable>
            </View>

            {/* List */}
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

            {/* Log Modal */}
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
                                {/* New */}
                                {!logForModal && (
                                    <>
                                        {!selectedLogTemplate && showTemplateChooser && (
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
                                                <Text style={[styles.label, { marginBottom: 8 }]}>{selectedLogTemplate?.name}</Text>
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
                                                            placeholder="Enter value"
                                                        />
                                                    </View>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}

                                {/* Existing */}
                                {logForModal && (
                                    !logEditing ? (
                                        getOrderedFieldsForModal(logForModal).map((f) => (
                                            <View key={f.name} style={styles.propertyContainer}>
                                                <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>
                                                    {f.name}
                                                </Text>
                                                <TextInput
                                                    style={[styles.input, styles.readonlyInput]}
                                                    value={String(f.value ?? "")}
                                                    editable={false}
                                                />
                                            </View>
                                        ))
                                    ) : (
                                        logEditFields.map((f) => (
                                            <View key={f.id} style={styles.propertyContainer}>
                                                <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>
                                                    {f.name}
                                                </Text>
                                                <TextInput
                                                    style={styles.input}
                                                    value={String(f.value ?? "")}
                                                    onChangeText={(v) =>
                                                        setLogEditFields((prev) => prev.map((x) => (x.id === f.id ? { ...x, value: v } : x)))
                                                    }
                                                />
                                            </View>
                                        ))
                                    )
                                )}
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <View style={styles.buttonContainer}>
                                {!logForModal && (
                                    <>
                                        <Pressable
                                            style={[styles.cancelButton, { marginRight: 8 }]}
                                            onPress={() => setLogModalVisible(false)}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.saveButton, { opacity: savingLog ? 0.6 : 1 }]}
                                            disabled={savingLog}
                                            onPress={saveNewLog}
                                        >
                                            <Text style={styles.saveButtonText}>{savingLog ? "Saving…" : "Save"}</Text>
                                        </Pressable>
                                    </>
                                )}

                                {logForModal && !logEditing && (
                                    <>
                                        <Pressable
                                            style={[styles.cancelButton, { borderColor: "#ff4444" }]}
                                            onPress={() => {
                                                handleDeleteLog(logForModal.id);
                                                setLogModalVisible(false);
                                            }}
                                        >
                                            <Text style={[styles.cancelButtonText, { color: "#ff4444" }]}>Remove</Text>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.cancelButton, { marginRight: 8 }]}
                                            onPress={beginEditFromModal}
                                        >
                                            <Text style={styles.cancelButtonText}>Edit</Text>
                                        </Pressable>
                                    </>
                                )}

                                {logForModal && logEditing && (
                                    <>
                                        <Pressable
                                            style={[styles.cancelButton, { marginRight: 8 }]}
                                            onPress={() => {
                                                setLogEditing(false);
                                                setLogEditFields([]);
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.saveButton, { opacity: savingLog ? 0.6 : 1 }]}
                                            disabled={savingLog}
                                            onPress={saveLogFromDetail}
                                        >
                                            <Text style={styles.saveButtonText}>{savingLog ? "Saving…" : "Save"}</Text>
                                        </Pressable>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
