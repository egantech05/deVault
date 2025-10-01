// screens/AssetsScreen/AssetDetailsModal/ComponentsTab.js
import React, { useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, Platform, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useComponents } from "../../../hooks/useComponents";
import AddComponentModal from "../AddComponentModal";

export default function ComponentsTab({ asset, styles, colors }) {
    const { items, loading, remove, create, searchCatalog } = useComponents(asset.id);
    const [isModal, setIsModal] = useState(false);

    const handleDelete = async (id) => {
        try {
            await remove(id);           // await to catch errors
        } catch (e) {
            console.warn("Delete failed:", e?.message || e);
        }
    };

    const confirmDelete = (id) => {
        if (Platform.OS === "web") {
            if (window.confirm("Remove component? This will detach it from the asset.")) {
                handleDelete(id);
            }
        } else {
            Alert.alert(
                "Remove component?",
                "This will detach it from the asset.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => handleDelete(id) },
                ]
            );
        }
    };

    return (
        <View style={{ paddingTop: 4 }}>
            {loading ? (
                <ActivityIndicator />
            ) : items.length === 0 ? (
                <Text style={{ color: "#888", paddingVertical: 8 }}>No components yet.</Text>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(it) => it.id}
                    ItemSeparatorComponent={() => <View style={local.sep} />}
                    renderItem={({ item }) => (
                        <View style={local.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={local.rowTitle}>
                                    <Text style={local.modelText}>{item.model}</Text>
                                    {item.manufacturer ? <Text style={local.manuText}> – {item.manufacturer}</Text> : null}
                                </Text>
                                {!!item.description && <Text style={local.rowSub}>{item.description}</Text>}
                            </View>

                            <Pressable
                                onPress={() => confirmDelete(item.id)}
                                hitSlop={12}
                                style={local.rightAction}
                            >
                                <Ionicons name="trash-outline" size={20} color="#ff4444" />
                            </Pressable>
                        </View>
                    )}
                />
            )}

            {/* Dashed Add bar */}
            <Pressable style={[local.dashedAdd, { borderColor: "#ddd" }]} onPress={() => setIsModal(true)}>
                <Ionicons name="add" size={16} color="#bbb" />
                <Text style={local.dashedAddText}>Add Component</Text>
            </Pressable>

            <AddComponentModal
                visible={isModal}
                onClose={() => setIsModal(false)}
                onCreate={create}
                searchCatalog={searchCatalog}
                styles={styles}
                colors={colors}
            />
        </View>
    );
}

const local = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 4, minHeight: 44 },
    rowTitle: { flexDirection: "row", flexWrap: "wrap", marginBottom: 2 },
    modelText: { fontWeight: "600" },
    manuText: { fontWeight: "400" },
    rowSub: { color: "#666" },
    rightAction: { paddingLeft: 12, paddingVertical: 6, justifyContent: "center", alignItems: "center" },
    sep: { height: 1, backgroundColor: "#eee" },
    dashedAdd: { marginTop: 10, paddingVertical: 14, paddingHorizontal: 12, borderWidth: 2, borderStyle: "dashed", borderRadius: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", opacity: 0.9 },
    dashedAddText: { marginLeft: 6, color: "#bbb", fontWeight: "600" },
});
