// screens/WarehouseScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    FlatList,
    useWindowDimensions,
    TextInput,
    Pressable,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, commonStyles } from "../components/Styles";
import { getCardSize } from "../utils/cardLayout";
import { supabase } from "../lib/supabase";
import WarehouseModal from "./WarehouseModal";
import styles from "./WarehouseScreen/styles";
import AddComponentModal from "./WarehouseScreen/AddComponentModal";

export default function WarehouseScreen() {
    const { width } = useWindowDimensions();

    const [selected, setSelected] = useState(null);
    const [addVisible, setAddVisible] = useState(false);

    // UI state
    const [searchQuery, setSearchQuery] = useState("");
    const [showHistorical, setShowHistorical] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data
    const [components, setComponents] = useState([]); // components_with_qty
    const [moves, setMoves] = useState([]); // inventory_movements

    // Layout
    const cardSize = getCardSize(width);
    const addIconSize = 0.5 * cardSize;
    const numColumns = Math.max(1, Math.floor(width / (cardSize + 16)));
    const rowStyle = { justifyContent: "center" };

    // Loaders
    const loadComponents = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("components_with_qty")
            .select("*")
            .order("model", { ascending: true });

        if (error) {
            console.error(error);
            Alert.alert("Error", error.message);
        } else {
            setComponents(data || []);
        }
        setLoading(false);
    }, []);

    const loadHistory = useCallback(async () => {
        const { data, error } = await supabase
            .from("inventory_movements")
            .select("id, component_id, qty_delta, notes, created_at")
            .order("created_at", { ascending: false })
            .limit(400);

        if (error) {
            console.error(error);
            Alert.alert("Error", error.message);
        } else {
            setMoves(data || []);
        }
    }, []);

    useEffect(() => {
        loadComponents();
    }, [loadComponents]);

    useEffect(() => {
        if (showHistorical) loadHistory();
    }, [showHistorical, loadHistory]);

    // Search filter
    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return components;
        return components.filter(
            (c) =>
                (c.model || "").toLowerCase().includes(q) ||
                (c.manufacturer || "").toLowerCase().includes(q) ||
                (c.description || "").toLowerCase().includes(q)
        );
    }, [components, searchQuery]);

    // Map for model lookup in history list
    const modelById = useMemo(
        () => Object.fromEntries(components.map((c) => [c.id, c.model])),
        [components]
    );

    // ----- DATA FOR MAIN GRID (inject "Add" tile as first item) -----
    const gridData = useMemo(
        () => [{ _type: "add", id: "__add__" }, ...filtered],
        [filtered]
    );

    // ----- RENDERERS -----
    const renderGridItem = ({ item }) => {
        if (item._type === "add") {
            return (
                <Pressable
                    style={[styles.addCard, { width: cardSize, height: cardSize }]}
                    onPress={() => setAddVisible(true)}
                    accessibilityRole="button"
                >
                    <Ionicons name="add" size={addIconSize} color={colors.brand} />
                </Pressable>
            );
        }
        const c = item;
        return (
            <Pressable
                style={[styles.displayCard, { width: cardSize, height: cardSize }]}
                onPress={() => setSelected(c)}
                accessibilityRole="button"
            >
                {/* Qty badge (top-right) */}
                <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{c.qty_on_hand ?? 0}</Text>
                </View>
                <View style={styles.cardBottom}>
                    <Text
                        numberOfLines={1}
                        style={[styles.modelText, { fontSize: cardSize * 0.13 }]}
                    >
                        {c.model}
                    </Text>
                    <Text
                        numberOfLines={1}
                        style={[styles.mfgText, { fontSize: cardSize * 0.11 }]}
                    >
                        {c.manufacturer || "-"}
                    </Text>
                    <Text
                        numberOfLines={3}
                        style={[styles.descText, { fontSize: cardSize * 0.09 }]}
                    >
                        {c.description || "-"}
                    </Text>
                </View>
            </Pressable>
        );
    };

    const renderMove = ({ item: m }) => (
        <View style={styles.historyRow}>
            <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: "white" }}>
                    {new Date(m.created_at).toLocaleString()}
                </Text>
                <Text style={{ marginTop: 2, color: "white" }}>
                    {modelById[m.component_id] || m.component_id}
                </Text>
                <Text
                    style={{ opacity: 0.7, fontSize: 12, marginTop: 2, color: "white" }}
                >
                    {m.notes || "-"}
                </Text>
            </View>
            <Text style={{ fontWeight: "800", color: "white" }}>
                {m.qty_delta > 0 ? `+${m.qty_delta}` : `${m.qty_delta}`}
            </Text>
        </View>
    );

    return (
        <View style={commonStyles.contentContainer}>
            <Text style={commonStyles.textPrimary}>Warehouse</Text>

            {/* Search row + Historical button */}
            <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color="white" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Warehouse"
                        placeholderTextColor="white"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <Pressable
                    onPress={() => setShowHistorical((v) => !v)}
                    style={({ pressed }) => [
                        styles.histBtn,
                        showHistorical && styles.histBtnActive,
                        pressed && { opacity: 0.85 },
                    ]}
                >
                    <Text style={styles.histBtnText}>
                        {showHistorical ? "Hide Historical" : "Historical"}
                    </Text>
                </Pressable>
            </View>

            {/* Content */}
            {loading ? (
                <ActivityIndicator style={{ marginTop: 12 }} />
            ) : showHistorical ? (
                <FlatList
                    key="history"
                    data={moves}
                    keyExtractor={(m) => String(m.id)}
                    renderItem={renderMove}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Text style={{ opacity: 0.6, marginTop: 12 }}>No history yet.</Text>
                    }
                    contentContainerStyle={{ paddingBottom: 8 }}
                    initialNumToRender={20}
                    windowSize={5}
                    removeClippedSubviews
                />
            ) : (
                <FlatList
                    key={`grid-${numColumns}`} // ⬅️ force remount when numColumns changes
                    data={gridData}
                    keyExtractor={(item) =>
                        item._type === "add" ? "__add__" : String(item.id)
                    }
                    renderItem={renderGridItem}
                    numColumns={numColumns}
                    columnWrapperStyle={numColumns > 1 ? rowStyle : undefined}
                    contentContainerStyle={
                        numColumns === 1 ? styles.displayCardContainer : undefined
                    }
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListFooterComponent={
                        filtered.length === 0 ? (
                            <Text
                                style={{ color: "#888", marginTop: 12, textAlign: "center" }}
                            >
                                No components found.
                            </Text>
                        ) : null
                    }
                    initialNumToRender={12}
                    windowSize={5}
                    removeClippedSubviews
                />
            )}

            <WarehouseModal
                visible={!!selected}
                item={selected}
                onClose={() => setSelected(null)}
                onAnySave={() => {
                    setSelected(null);
                    loadComponents();
                    if (showHistorical) loadHistory();
                }}
            />

            <AddComponentModal
                visible={addVisible}
                onClose={() => setAddVisible(false)}
                onCreated={() => {
                    setAddVisible(false);
                    loadComponents();
                }}
            />
        </View>
    );
}
