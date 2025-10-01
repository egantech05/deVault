// screens/WarehouseScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View, Text, StyleSheet, ScrollView, useWindowDimensions,
    TextInput, Pressable, Alert, ActivityIndicator
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
    const [moves, setMoves] = useState([]);           // inventory_movements

    // Layout
    const cardSize = getCardSize(width);
    const addIconSize = 0.5 * cardSize;

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

    useEffect(() => { loadComponents(); }, [loadComponents]);
    useEffect(() => { if (showHistorical) loadHistory(); }, [showHistorical, loadHistory]);

    // Search
    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return components;
        return components.filter(c =>
            (c.model || "").toLowerCase().includes(q) ||
            (c.manufacturer || "").toLowerCase().includes(q) ||
            (c.description || "").toLowerCase().includes(q)
        );
    }, [components, searchQuery]);

    // quick map for model lookup in historical list
    const modelById = useMemo(
        () => Object.fromEntries(components.map(c => [c.id, c.model])),
        [components]
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
                    onPress={() => setShowHistorical(v => !v)}
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
                <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                    {moves.length === 0 ? (
                        <Text style={{ opacity: 0.6, marginTop: 12 }}>No history yet.</Text>
                    ) : moves.map(m => (
                        <View key={m.id} style={styles.historyRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: "700", color: "white" }}>
                                    {new Date(m.created_at).toLocaleString()}
                                </Text>
                                <Text style={{ marginTop: 2, color: "white" }}>
                                    {modelById[m.component_id] || m.component_id}
                                </Text>
                                <Text style={{ opacity: 0.7, fontSize: 12, marginTop: 2, color: "white" }}>
                                    {m.notes || "-"}
                                </Text>
                            </View>
                            <Text style={{ fontWeight: "800", color: "white" }}>
                                {m.qty_delta > 0 ? `+${m.qty_delta}` : `${m.qty_delta}`}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                    <View style={styles.displayCardContainer}>
                        {/* Add Component card */}
                        <Pressable
                            style={[styles.addCard, { width: cardSize, height: cardSize }]}
                            onPress={() => setAddVisible(true)}
                            accessibilityRole="button"
                        >
                            <Ionicons name="add" size={addIconSize} color={colors.brand} />

                        </Pressable>

                        {/* Components */}
                        {filtered.map(c => (
                            <Pressable
                                key={c.id}
                                style={[styles.displayCard, { width: cardSize, height: cardSize }]}
                                onPress={() => setSelected(c)}
                                accessibilityRole="button"
                            >
                                {/* Qty badge (top-right) */}
                                <View style={styles.qtyBadge}>
                                    <Text style={styles.qtyBadgeText}>{c.qty_on_hand ?? 0}</Text>
                                </View>
                                <View style={styles.cardBottom}>
                                    <Text numberOfLines={1} style={[styles.modelText, { fontSize: cardSize * 0.13 }]}>
                                        {c.model}
                                    </Text>
                                    <Text numberOfLines={1} style={[styles.mfgText, { fontSize: cardSize * 0.11 }]}>
                                        {c.manufacturer || "-"}
                                    </Text>
                                    <Text numberOfLines={3} style={[styles.descText, { fontSize: cardSize * 0.09 }]}>
                                        {c.description || "-"}
                                    </Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
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

