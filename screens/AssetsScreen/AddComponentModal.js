
import React, { useEffect, useMemo, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, Alert, ScrollView, ActivityIndicator } from "react-native";


export default function AddComponentModal({ visible, onClose, onCreate, searchCatalog, styles, colors }) {
    const [model, setModel] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [description, setDescription] = useState("");

    const [suggestions, setSuggestions] = useState([]);
    const [picked, setPicked] = useState(null);      // full row of the picked suggestion
    const [loadingSugg, setLoadingSugg] = useState(false);
    const [saving, setSaving] = useState(false);

    // reset on open/close
    useEffect(() => {
        if (!visible) {
            setModel(""); setManufacturer(""); setDescription("");
            setSuggestions([]); setPicked(null); setLoadingSugg(false); setSaving(false);
        }
    }, [visible]);

    // Debounced suggestions using the hook-provided searchCatalog
    useEffect(() => {
        if (!visible) return;
        const term = `${(model || "").trim()} ${(manufacturer || "").trim()}`.trim();
        if (!term) { setSuggestions([]); setPicked(null); return; }

        const t = setTimeout(async () => {
            try {
                setLoadingSugg(true);
                const rows = await searchCatalog(term);
                setSuggestions(rows || []);

                // auto-pick exact (case-insensitive) match on model + manufacturer
                const lower = (s) => (s || "").trim().toLowerCase();
                const exact = (rows || []).find(
                    r => lower(r.model) === lower(model) &&
                        (lower(r.manufacturer) === lower(manufacturer) ||
                            (!manufacturer && (r.manufacturer === null || r.manufacturer === "")))
                );
                setPicked(exact || null);
            } catch (e) {
                console.warn("searchCatalog error:", e?.message || e);
            } finally {
                setLoadingSugg(false);
            }
        }, 250);

        return () => clearTimeout(t);
    }, [visible, model, manufacturer, searchCatalog]);

    const canSave = useMemo(() => !!model.trim() && !saving, [model, saving]);

    async function handleSave() {
        if (!model.trim()) return Alert.alert("Model is required");

        setSaving(true);
        try {
            if (picked?.id) {
                // link existing catalog component to this asset
                await onCreate({ catalog_id: picked.id });
            } else {
                // create a new catalog row and link it inside the hook
                await onCreate({
                    model: model.trim(),
                    manufacturer: manufacturer?.trim() || null,
                    description: description?.trim() || null,
                });
            }


            onClose?.();
        } catch (e) {
            console.error("Add component failed:", e);
            Alert.alert("Error", e?.message || "Failed to add component");
        } finally {
            setSaving(false);
        }
    }

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modal}>
                    {/* Header (matches your other modals) */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Component</Text>
                        <Pressable onPress={onClose}><Text style={{ color: "white", fontWeight: "700" }}>✕</Text></Pressable>
                    </View>

                    {/* Body */}
                    <ScrollView
                        style={styles.modalScrollView}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollPadBottom}
                    >
                        <View style={styles.modalContent}>
                            {/* Model with suggestions */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Model *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={model}
                                    onChangeText={(t) => { setModel(t); setPicked(null); }}
                                    placeholder="e.g., FRP20129"
                                    placeholderTextColor="#888"
                                />
                                {(suggestions.length > 0 || loadingSugg) && (
                                    <View style={suggestBoxLight}>
                                        {loadingSugg ? (
                                            <View style={suggestItemLight}><ActivityIndicator /></View>
                                        ) : (
                                            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 240 }}>
                                                {suggestions.map(s => (
                                                    <Pressable
                                                        key={s.id}
                                                        onPress={() => {
                                                            setModel(s.model || "");
                                                            setManufacturer(s.manufacturer || "");
                                                            setDescription(s.description || "");
                                                            setPicked(s);
                                                        }}
                                                        style={({ pressed }) => [suggestItemLight, pressed && { opacity: 0.85 }]}
                                                    >
                                                        <Text style={suggestTextMainLight} numberOfLines={1}>
                                                            {s.model} {s.manufacturer ? `· ${s.manufacturer}` : ""}
                                                        </Text>
                                                        {!!s.description && (
                                                            <Text style={suggestTextDimLight} numberOfLines={1}>{s.description}</Text>
                                                        )}
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Manufacturer */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Manufacturer</Text>
                                <TextInput
                                    style={styles.input}
                                    value={manufacturer}
                                    onChangeText={(t) => { setManufacturer(t); setPicked(null); }}
                                    placeholder="e.g., Emerson"
                                    placeholderTextColor="#888"
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
                                    placeholder="e.g., Electronic Board"
                                    placeholderTextColor="#888"
                                />
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer (pinned) */}
                    <View style={styles.modalFooter}>
                        <View style={styles.buttonContainer}>
                            <Pressable
                                style={[styles.cancelButton, { flex: 1, marginRight: 8 }]}
                                onPress={onClose}
                                disabled={saving}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.saveButton, { flex: 1, marginLeft: 8, opacity: canSave ? 1 : 0.6 }]}
                                onPress={canSave ? handleSave : undefined}
                                disabled={!canSave}
                            >
                                <Text style={styles.saveButtonText}>
                                    {picked?.id ? "Add existing" : "Save"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const suggestBoxLight = {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    overflow: "hidden",
};
const suggestItemLight = {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
};
const suggestTextMainLight = { color: "#111", fontWeight: "700" };
const suggestTextDimLight = { color: "#666", fontSize: 12 };
