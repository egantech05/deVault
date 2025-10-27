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
import SearchBar from "../components/SearchBar";
import { useLinkedDocsList } from "../hooks/useLinkedDocuments";
import AddLinkedDocModal from "./LinkedDocumentsScreen/AddLinkedDocModal";
import { supabase } from "../lib/supabase";
import { useDatabase } from "../contexts/DatabaseContext";
import ModalSmall from "../components/ModalSmall";

const linkedDocRowBaseStyle = {
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
};

const linkedDocRowShadowStyle = Platform.select({
    web: {
        boxShadow: "0px 1px 4px rgba(0,0,0,0.05)",
    },
    default: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
    },
});

// Helper to split "linkedDocs/12345-file.pdf" into { bucket, path }
function parseStoragePath(storage_path = "") {
    const [bucket, ...rest] = String(storage_path).split("/");
    return { bucket, path: rest.join("/") };
}

export default function LinkedDocumentsScreen() {
    const [modalVisible, setModalVisible] = useState(false);
    const { search, setSearch, rows, loading, reload } = useLinkedDocsList();
    const { activeDatabaseId, openCreateModal, canDelete } = useDatabase();
    const [pendingDeleteDoc, setPendingDeleteDoc] = useState(null);
    const [deletingDoc, setDeletingDoc] = useState(false);
    const modalStyles = ModalSmall.styles;

    const openCreateModalIfNeeded = () => {
        if (!activeDatabaseId) {
          openCreateModal();
          return false;
        }
        return true;
      };

    const title = useMemo(() => "Linked Documents", []);

    // Delete document (and cascade all linked rules)
    const requestDeleteDocument = (doc) => {
        if (!canDelete) {
            Alert.alert("Permission", "Only admins can delete documents.");
            return;
        }
        if (!openCreateModalIfNeeded()) return;
        setPendingDeleteDoc(doc);
    };

    const performDeleteDocument = async () => {
        if (!pendingDeleteDoc) return;
        const doc = pendingDeleteDoc;
        if (!openCreateModalIfNeeded()) {
            setPendingDeleteDoc(null);
            return;
        }

        setDeletingDoc(true);
        try {
            if (doc?.storage_path) {
                const { bucket, path } = parseStoragePath(doc.storage_path);
                if (bucket && path) {
                    const { error: sErr } = await supabase.storage.from(bucket).remove([path]);
                    if (sErr) {
                        const msg = sErr.message || "Storage delete failed";
                        const isNotFound = /not\s*found|No such file/i.test(msg);
                        if (!isNotFound) {
                            throw new Error(`Could not delete file from storage: ${msg}`);
                        }
                    }
                }
            }

            const { error: dErr } = await supabase.from("documents").delete().eq("id", doc.id);
            if (dErr) throw dErr;

            await reload();
            setPendingDeleteDoc(null);
        } catch (e) {
            console.error("deleteDocumentAndRules error:", e);
            Alert.alert("Delete Failed", e.message || "Failed to delete document.");
        } finally {
            setDeletingDoc(false);
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
                                style={[linkedDocRowBaseStyle, linkedDocRowShadowStyle]}
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
                                {canDelete ? (
                                    <Pressable
                                        onPress={() => requestDeleteDocument(doc)}
                                        style={{
                                            padding: 8,
                                            borderRadius: 8,
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ff5555" />
                                    </Pressable>
                                ) : (
                                    <View style={{ width: 36 }} />
                                )}
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

            <ModalSmall
                visible={!!pendingDeleteDoc}
                onRequestClose={() => !deletingDoc && setPendingDeleteDoc(null)}
                animationType="fade"
            >
                <ModalSmall.Title>Delete Document</ModalSmall.Title>
                <ModalSmall.Subtitle>
                    {pendingDeleteDoc
                        ? `Delete "${pendingDeleteDoc.name || "document"}" and unlink it from all assets?`
                        : "Delete this document and unlink it from all assets?"}
                </ModalSmall.Subtitle>
                <ModalSmall.Footer>
                    <Pressable
                        onPress={() => setPendingDeleteDoc(null)}
                        disabled={deletingDoc}
                        style={modalStyles.cancelButton}
                    >
                        <Text style={modalStyles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={performDeleteDocument}
                        disabled={deletingDoc}
                        style={[
                            modalStyles.primaryButton,
                            { backgroundColor: "#dc2626" },
                            deletingDoc && modalStyles.primaryButtonDisabled,
                        ]}
                    >
                        <Text style={modalStyles.primaryButtonText}>
                            {deletingDoc ? "Deleting…" : "Delete"}
                        </Text>
                    </Pressable>
                </ModalSmall.Footer>
            </ModalSmall>
        </View>
    );
}
