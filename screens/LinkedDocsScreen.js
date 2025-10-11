// screens/LinkedDocumentsScreen.js
import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    TextInput,
    ActivityIndicator,
    Alert,
    Pressable,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles } from "../components/Styles";
import warehouseStyles from "./WarehouseScreen/styles";
import DashedRowButton from "../components/DashedRowButton";
import { useLinkedDocsList } from "../hooks/useLinkedDocuments";
import AddLinkedDocModal from "./LinkedDocumentsScreen/AddLinkedDocModal";
import { supabase } from "../lib/supabase";

// Helper to split "linkedDocs/12345-file.pdf" into { bucket, path }
function parseStoragePath(storage_path = "") {
    const [bucket, ...rest] = String(storage_path).split("/");
    return { bucket, path: rest.join("/") };
}

export default function LinkedDocumentsScreen() {
    const [modalVisible, setModalVisible] = useState(false);
    const { search, setSearch, rows, loading, reload } = useLinkedDocsList();

    const title = useMemo(() => "Linked Documents", []);

    // Delete document (and cascade all linked rules)
    const deleteDocumentAndRules = async (doc) => {
        const go = async () => {
            try {
                // 1️⃣ Delete from storage
                if (doc?.storage_path) {
                    const { bucket, path } = parseStoragePath(doc.storage_path);
                    if (bucket && path) {
                        const { error: sErr } = await supabase.storage.from(bucket).remove([path]);
                        if (sErr) console.warn("Storage remove warning:", sErr.message);
                    }
                }

                // 2️⃣ Delete from DB
                const { error: dErr } = await supabase.from("documents").delete().eq("id", doc.id);
                if (dErr) throw dErr;

                await reload();
            } catch (e) {
                console.error("deleteDocumentAndRules error:", e);
                Alert.alert("Error", e.message || "Failed to delete document.");
            }
        };

        if (Platform.OS === "web") {
            if (window.confirm(`Delete "${doc?.name ?? "document"}" and unlink it from all assets?`)) {
                await go();
            }
        } else {
            Alert.alert(
                "Delete Document",
                `Delete "${doc?.name ?? "document"}" and unlink it from all assets?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: go },
                ]
            );
        }
    };

    return (
        <View style={commonStyles.contentContainer}>
            {/* Title */}
            <Text style={commonStyles.textPrimary}>{title}</Text>

            {/* Search Row */}
            <View style={warehouseStyles.searchRow}>
                <View style={warehouseStyles.searchBar}>
                    <Ionicons name="search" size={16} color="white" />
                    <TextInput
                        style={warehouseStyles.searchInput}
                        placeholder="Search by name, template, property, or value"
                        placeholderTextColor="white"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {/* Add Button */}
            <DashedRowButton
                label="Add Document"
                onPress={() => setModalVisible(true)}
            />

            {/* List */}
            {loading ? (
                <ActivityIndicator style={{ marginTop: 12 }} />
            ) : rows.length === 0 ? (
                <Text style={{ color: "#888", marginTop: 12 }}>No linked documents yet.</Text>
            ) : (
                <View style={{ marginTop: 12 }}>
                    {rows.map((r) => {
                        const doc = r.document || {};
                        const templateName = r.template?.name ?? "-";
                        const propertyName = r.property?.property_name ?? "-";
                        const value = r.value_raw ?? "-";
                        const createdAt = r.created_at
                            ? new Date(r.created_at).toLocaleString()
                            : "";

                        return (
                            <View
                                key={r.id}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    borderWidth: 1,
                                    borderColor: "#eee",
                                    borderRadius: 12,
                                    paddingVertical: 10,
                                    paddingHorizontal: 14,
                                    marginVertical: 6,
                                    backgroundColor: "#fafafa",
                                    shadowColor: "#000",
                                    shadowOpacity: 0.05,
                                    shadowRadius: 3,
                                    shadowOffset: { width: 0, height: 1 },
                                }}
                            >
                                {/* Left side text */}
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={{ fontWeight: "700" }} numberOfLines={1}>
                                        {doc.name || "Untitled Document"}
                                    </Text>
                                    <Text style={{ color: "#555", marginTop: 2 }} numberOfLines={1}>
                                        {templateName} • {propertyName} • {value}
                                    </Text>
                                    <Text style={{ color: "#999", fontSize: 12, marginTop: 3 }}>
                                        {createdAt}
                                    </Text>
                                </View>

                                {/* Delete icon (floats right center) */}
                                <Pressable
                                    onPress={() => deleteDocumentAndRules(doc)}
                                    style={{
                                        padding: 8,
                                        borderRadius: 8,
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#ff5555" />
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Add / link modal */}
            <AddLinkedDocModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onCreated={() => {
                    setModalVisible(false);
                    reload();
                }}
            />
        </View>
    );
}
