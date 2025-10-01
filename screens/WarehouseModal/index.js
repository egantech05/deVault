// screens/WarehouseModal/index.js
import React, { useMemo, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView, Alert, TextInput, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InfoTab from "./InfoTab";
import HistoricalTab from "./HistoricalTab";
import styles from "../WarehouseScreen/styles";
import { colors } from "../../components/Styles";
import { supabase } from "../../lib/supabase";

const TABS = { INFO: "Info", HIST: "Historical" };

export default function WarehouseModal({ visible, onClose, item, onAnySave }) {
    const [tab, setTab] = useState(TABS.INFO);
    const [qty, setQty] = useState("0");
    const [notesVisible, setNotesVisible] = useState(false);
    const [notes, setNotes] = useState("");

    const [deleteVisible, setDeleteVisible] = useState(false);
    const [deleting, setDeleting] = useState(false);



    const title = useMemo(() => item?.model || "Component", [item?.model]);
    if (!visible || !item) return null;


    function startConfirm() {
        const n = parseInt(qty || "0", 10);
        if (!n || n === 0) {
            Alert.alert("Enter a non-zero amount.");
            return;
        }
        setNotes("");
        setNotesVisible(true); // open compact notes modal directly
    }

    async function saveWithNotes() {
        const delta = qtyNum; // positive add, negative remove
        try {
            const { error } = await supabase
                .from("inventory_movements")
                .insert([{ component_id: item.id, qty_delta: delta, notes: notes?.trim() || null }]);
            if (error) throw error;
        } catch (e) {
            return Alert.alert("Error", e.message || "Failed to save movement");
        }
        setNotesVisible(false);
        setQty("0");
        onAnySave?.();
    }

    // Helper inside the component (top-level of WarehouseModal)
    const qtyNum = Number.parseInt(qty || "0", 10) || 0;



    const bump = (delta) => {
        // allow up/down including negatives
        const next = (Number.isFinite(qtyNum) ? qtyNum : 0) + delta;
        setQty(String(next));
    };



    function openDeleteConfirm() {
        setDeleteVisible(true);

    }

    async function performDelete() {
        if (deleting) return;
        setDeleting(true);

        try {
            // Try to remove asset links using common column names; ignore “column does not exist”.
            const LINK_TABLE = "asset_components";
            const candidates = ["component_id", "component_catalog_id", "componentId"];

            for (const col of candidates) {
                const { error } = await supabase.from(LINK_TABLE).delete().eq(col, item.id);
                if (!error) break; // deleted or no rows matched — good enough
                const msg = (error.message || "").toLowerCase();
                if (msg.includes("column") && msg.includes("does not exist")) {
                    // wrong column for this schema; try next
                    continue;
                }
                if (msg.includes("view") && msg.includes("delete")) {
                    // underlying object is a view; skip and rely on FK cascade or continue with next table
                    break;
                }
                // Any other error — surface it
                throw error;
            }

            // Remove inventory history (we know this table/column exists in your app)
            const { error: movesErr } = await supabase
                .from("inventory_movements")
                .delete()
                .eq("component_id", item.id);
            if (movesErr) throw movesErr;

            // Finally delete the component itself
            const { error: compErr } = await supabase
                .from("components_catalog")
                .delete()
                .eq("id", item.id);
            if (compErr) throw compErr;

            setDeleteVisible(false);
            onAnySave?.();
            onClose?.();
        } catch (e) {
            Alert.alert("Error", e?.message || "Failed to delete component");
        } finally {
            setDeleting(false);
        }
    }




    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modal, { height: "80%" }]}>
                    {/* Header (matches Asset modal) */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.brand} />
                        </Pressable>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsBar}>
                        {[TABS.INFO, TABS.HIST].map((t) => (
                            <Pressable
                                key={t}
                                onPress={() => setTab(t)}
                                style={[styles.tabItem, tab === t && styles.tabItemActive]}
                            >
                                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Body */}
                    <ScrollView
                        style={styles.modalScrollView}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollPadBottom}
                    >
                        <View style={styles.modalContent}>
                            {tab === TABS.INFO ? <InfoTab item={item} onDelete={openDeleteConfirm} /> : <HistoricalTab item={item} />}
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        {tab === TABS.INFO ? (
                            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                                {/* Row 1: -, qty, + (equal widths) */}
                                <View style={{ flexDirection: "row", gap: 10 }}>
                                    <Pressable
                                        onPress={() => bump(-1)}
                                        style={{
                                            flex: 1,
                                            height: 44,
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: "#ddd",
                                            backgroundColor: "white",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Text style={{ fontSize: 20, fontWeight: "700" }}>−</Text>
                                    </Pressable>

                                    <TextInput
                                        value={String(qty)}
                                        onChangeText={setQty}
                                        keyboardType="numeric"
                                        inputMode="numeric"
                                        placeholder="0"
                                        placeholderTextColor="#888"
                                        style={{
                                            flex: 1,
                                            height: 44,
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: "#ddd",
                                            backgroundColor: "#f9f9f9",
                                            textAlign: "center",
                                            fontSize: 16,
                                            paddingHorizontal: 12,
                                        }}
                                    />

                                    <Pressable
                                        onPress={() => bump(1)}
                                        style={{
                                            flex: 1,
                                            height: 44,
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: "#ddd",
                                            backgroundColor: "white",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Text style={{ fontSize: 20, fontWeight: "700" }}>＋</Text>
                                    </Pressable>
                                </View>

                                {/* Row 2: Confirm (only when qty !== 0) */}
                                {qtyNum !== 0 ? (
                                    <Pressable
                                        onPress={() => startConfirm(qtyNum > 0 ? 1 : -1)}
                                        style={{
                                            marginTop: 10,
                                            height: 46,
                                            borderRadius: 12,
                                            backgroundColor: colors.primary,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Confirm</Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        ) : (
                            <View style={[styles.buttonContainer, { minHeight: 40 }]} />
                        )}
                    </View>

                    {/* Notes mini-modal (appears after Confirm) */}
                    <Modal
                        visible={notesVisible}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setNotesVisible(false)}
                    >
                        <View style={[styles.modalOverlay, { justifyContent: "center", alignItems: "center" }]}>
                            <View
                                style={{
                                    // compact card — no flex, no large height
                                    width: 420,
                                    maxWidth: "92%",
                                    borderRadius: 16,
                                    backgroundColor: "#fff",
                                    padding: 16,
                                    // slight shadow (web + native)
                                    shadowColor: "#000",
                                    shadowOpacity: 0.15,
                                    shadowRadius: 12,
                                    shadowOffset: { width: 0, height: 4 },
                                    elevation: 6,
                                }}
                            >
                                {/* Header */}
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#111" }}>Add notes</Text>
                                    <Pressable onPress={() => setNotesVisible(false)}>
                                        <Ionicons name="close" size={22} color={colors.brand} />
                                    </Pressable>
                                </View>

                                {/* Body */}
                                <View>
                                    <Text style={{ marginBottom: 8, color: "#333", fontWeight: "600" }}>Notes (optional)</Text>
                                    <TextInput
                                        value={notes}
                                        onChangeText={setNotes}
                                        placeholder="e.g., Manual count adjustment, damaged box, etc."
                                        placeholderTextColor="#888"
                                        multiline
                                        style={{
                                            minHeight: 90,
                                            borderWidth: 1,
                                            borderColor: "#ddd",
                                            borderRadius: 10,
                                            backgroundColor: "#f9f9f9",
                                            padding: 12,
                                            textAlignVertical: "top",
                                        }}
                                    />
                                </View>

                                {/* Footer */}
                                <View style={{ flexDirection: "row", marginTop: 12 }}>
                                    <Pressable
                                        style={[styles.cancelButton, { flex: 1, marginRight: 8 }]}
                                        onPress={() => setNotesVisible(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.saveButton, { flex: 1, marginLeft: 8 }]}
                                        onPress={saveWithNotes}
                                    >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* Delete confirm mini-modal */}
                    <Modal
                        visible={deleteVisible}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setDeleteVisible(false)}
                    >
                        <View style={[styles.modalOverlay, { justifyContent: "center", alignItems: "center" }]}>
                            <View
                                style={{
                                    width: 420,
                                    maxWidth: "92%",
                                    borderRadius: 16,
                                    backgroundColor: "#fff",
                                    padding: 16,
                                    shadowColor: "#000",
                                    shadowOpacity: 0.15,
                                    shadowRadius: 12,
                                    shadowOffset: { width: 0, height: 4 },
                                    elevation: 6,
                                }}
                            >
                                {/* Header */}
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#111" }}>Delete component?</Text>
                                    <Pressable onPress={() => setDeleteVisible(false)}>
                                        <Ionicons name="close" size={22} color={colors.brand} />
                                    </Pressable>
                                </View>

                                {/* Body */}
                                <View>
                                    <Text style={{ color: "#333" }}>
                                        This will permanently remove <Text style={{ fontWeight: "700" }}>{item.model}</Text> and all links/history. This action cannot be undone.
                                    </Text>
                                </View>

                                {/* Footer */}
                                <View style={{ flexDirection: "row", marginTop: 12 }}>
                                    <Pressable
                                        style={[styles.cancelButton, { flex: 1, marginRight: 8 }]}
                                        onPress={() => setDeleteVisible(false)}
                                        disabled={deleting}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={performDelete}
                                        disabled={deleting}
                                        style={[styles.saveButton, { flex: 1, marginLeft: 8, backgroundColor: "#B00020" }]}
                                    >
                                        <Text style={styles.saveButtonText}>{deleting ? "Deleting…" : "Delete"}</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </Modal>


                </View>
            </View>
        </Modal>
    );
}
