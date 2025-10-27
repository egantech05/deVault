// screens/WarehouseScreen/WarehouseModal/index.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InfoTab from "./InfoTab";
import HistoricalTab from "./HistoricalTab";
import styles from "../styles";
import { colors } from "../../../components/Styles";
import ModalLarge from "../../../components/ModalLarge";
import { supabase } from "../../../lib/supabase";
import { useDatabase } from "../../../contexts/DatabaseContext";

const TABS = { INFO: "Info", HIST: "Historical" };

const modalCardShadowStyle = Platform.select({
  web: {
    boxShadow: "0px 8px 20px rgba(0,0,0,0.1)",
  },
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});

export default function WarehouseModal({ visible, onClose, item, onAnySave }) {
  const [tab, setTab] = useState(TABS.INFO);
  const [qty, setQty] = useState("0");
  const [notesVisible, setNotesVisible] = useState(false);
  const [notes, setNotes] = useState("");

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentItem, setCurrentItem] = useState(item);

  const { activeDatabaseId, openCreateModal, canDelete } = useDatabase();

  useEffect(() => {
    setCurrentItem(item);
    setDeleteVisible(false);
    setDeleting(false);
  }, [item]);

  const title = useMemo(() => currentItem?.model || "Component", [currentItem?.model]);
  if (!visible || !currentItem || !activeDatabaseId) return null;

  const qtyNum = Number.parseInt(qty || "0", 10) || 0;

  const ensureDatabaseSelected = () => {
    if (!activeDatabaseId) {
      openCreateModal();
      return false;
    }
    return true;
  };

  function startConfirm() {
    const n = parseInt(qty || "0", 10);
    if (!n || n === 0) {
      Alert.alert("Enter a non-zero amount.");
      return;
    }
    setNotes("");
    setNotesVisible(true);
  }

  async function saveWithNotes() {
    if (!ensureDatabaseSelected()) return;
    const delta = qtyNum;

    try {
      const { error } = await supabase
        .from("inventory_movements")
        .insert([
          {
            database_id: activeDatabaseId,
            component_id: currentItem.id,
            qty_delta: delta,
            notes: notes?.trim() || null,
          },
        ]);
      if (error) throw error;
    } catch (e) {
      return Alert.alert("Error", e.message || "Failed to save movement");
    }

    setNotesVisible(false);
    setQty("0");
    onAnySave?.();
  }

  const bump = (delta) => {
    const next = (Number.isFinite(qtyNum) ? qtyNum : 0) + delta;
    setQty(String(next));
  };

  const handleInfoSaved = (updates) => {
    setCurrentItem((prev) => (prev ? { ...prev, ...updates } : prev));
    onAnySave?.();
  };

  function openDeleteConfirm() {
    if (!canDelete) return;
    setDeleteVisible(true);
  }

  async function performDelete() {
    if (!canDelete) return;
    if (deleting || !ensureDatabaseSelected()) return;
    setDeleting(true);
    try {
      const { error: movesErr } = await supabase
        .from("inventory_movements")
        .delete()
        .eq("component_id", currentItem.id)
        .eq("database_id", activeDatabaseId);
      if (movesErr) throw movesErr;

      const { error: compErr } = await supabase
        .from("components_catalog")
        .delete()
        .eq("id", currentItem.id)
        .eq("database_id", activeDatabaseId);
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
    <ModalLarge visible={visible} onRequestClose={onClose} title={title}>
      <ModalLarge.Body style={{ paddingHorizontal: 0, paddingVertical: 0, flex: 1 }}>
        <View style={styles.tabsRow}>
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
          <Pressable
            onPress={openDeleteConfirm}
            disabled={deleting || !canDelete}
            accessibilityLabel={deleting ? "Deleting component" : "Delete component"}
            style={({ pressed }) => [
              styles.deleteInlineBtn,
              pressed && !deleting && canDelete && { opacity: 0.85 },
              (deleting || !canDelete) && { opacity: 0.6 },
            ]}
          >
            {deleting ? (
              <Text style={styles.deleteInlineText}>Deleting…</Text>
            ) : canDelete ? (
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
            ) : (
              <Ionicons name="lock-closed" size={18} color="#9ca3af" />
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.modalScrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollPadBottom}
        >
          <View style={styles.modalContent}>
            {tab === TABS.INFO ? (
              <InfoTab item={currentItem} onSaved={handleInfoSaved} />
            ) : (
              <HistoricalTab item={currentItem} />
            )}
          </View>
        </ScrollView>
      </ModalLarge.Body>

      <ModalLarge.Footer style={{ paddingHorizontal: 16, paddingVertical: 16, flexShrink: 0 }}>
        {tab === TABS.INFO ? (
          <View>
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
      </ModalLarge.Footer>

      <Modal
        visible={notesVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotesVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <View
            style={[
              {
                width: 420,
                maxWidth: "92%",
                borderRadius: 16,
                backgroundColor: "#fff",
                padding: 16,
              },
              modalCardShadowStyle,
            ]}
          >
            <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 12 }}>
              Notes (optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add context for this movement"
              placeholderTextColor="#999"
              multiline
              style={{
                minHeight: 80,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#ddd",
                padding: 12,
                textAlignVertical: "top",
              }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                alignItems: "center",
                marginTop: 12,
                gap: 10,
              }}
            >
              <Pressable
                onPress={() => setNotesVisible(false)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "#6b7280", fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveWithNotes}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <View
            style={[
              {
                width: 360,
                maxWidth: "92%",
                borderRadius: 16,
                backgroundColor: "#fff",
                padding: 20,
              },
              modalCardShadowStyle,
            ]}
          >
            <Text style={{ fontWeight: "700", fontSize: 18, marginBottom: 10 }}>
              Delete Component?
            </Text>
            <Text style={{ color: "#4b5563", marginBottom: 16 }}>
              This will remove the component and its movement history.
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
              <Pressable onPress={() => setDeleteVisible(false)}>
                <Text style={{ color: "#6b7280", fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={performDelete}
                disabled={deleting}
                style={{
                  backgroundColor: "#dc2626",
                  borderRadius: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>
                  {deleting ? "Deleting…" : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ModalLarge>
  );
}
