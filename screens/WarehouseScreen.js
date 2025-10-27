// screens/WarehouseScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  useWindowDimensions,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { colors, commonStyles } from "../components/Styles";
import SearchBar from "../components/SearchBar";
import { getCardSize } from "../utils/cardLayout";
import { supabase } from "../lib/supabase";
import WarehouseModal from "./WarehouseScreen/WarehouseModal";
import styles from "./WarehouseScreen/styles"; // keep qty badge, texts, search/hist styles here
import AddComponentModal from "./WarehouseScreen/AddComponentModal";
import { useDatabase } from "../contexts/DatabaseContext";
import { AddCard, DisplayCard } from "../components/Cards";

export default function WarehouseScreen() {
  const { width } = useWindowDimensions();
  const { activeDatabaseId, openCreateModal } = useDatabase();

  const [selected, setSelected] = useState(null);
  const [addVisible, setAddVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [showHistorical, setShowHistorical] = useState(false);
  const [loading, setLoading] = useState(true);

  const [components, setComponents] = useState([]);
  const [moves, setMoves] = useState([]);

  // Layout
  const cardSize = getCardSize(width);
  const numColumns = useMemo(
    () => Math.max(1, Math.floor(width / (cardSize + 16))),
    [width, cardSize]
  );
  const gridKey = useMemo(() => `warehouse-cols-${numColumns}`, [numColumns]);
  const rowStyle = { justifyContent: "center", gap: 16, paddingVertical: 12 };

  // Data loads
  const loadComponents = useCallback(async () => {
    if (!activeDatabaseId) {
      setComponents([]);
      setSelected(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("components_with_qty")
      .select("*")
      .eq("database_id", activeDatabaseId)
      .order("model", { ascending: true });

    if (error) {
      console.error(error);
      Alert.alert("Error", error.message);
      setComponents([]);
      setLoading(false);
      return;
    }

    const nextComponents = data || [];
    setComponents(nextComponents);
    setSelected((prev) => {
      if (!prev) return prev;
      const next = nextComponents.find((c) => c.id === prev.id);
      return next || null;
    });
    setLoading(false);
  }, [activeDatabaseId]);

  const loadHistory = useCallback(async () => {
    if (!activeDatabaseId) {
      setMoves([]);
      return;
    }

    const { data, error } = await supabase
      .from("inventory_movements")
      .select("id, component_id, qty_delta, notes, created_at")
      .eq("database_id", activeDatabaseId)
      .order("created_at", { ascending: false })
      .limit(400);

    if (error) {
      console.error(error);
      Alert.alert("Error", error.message);
      setMoves([]);
    } else {
      setMoves(data || []);
    }
  }, [activeDatabaseId]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  useEffect(() => {
    if (showHistorical) loadHistory();
    else setMoves([]);
  }, [showHistorical, loadHistory]);

  // Filtering
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

  const modelById = useMemo(
    () => Object.fromEntries(components.map((c) => [c.id, c.model])),
    [components]
  );

  const gridData = useMemo(
    () => [{ _type: "add", id: "__add__" }, ...filtered],
    [filtered]
  );

  const ensureDatabaseSelected = () => {
    if (!activeDatabaseId) {
      openCreateModal();
      return false;
    }
    return true;
  };

  // Grid items
  const renderGridItem = ({ item }) => {
    if (item._type === "add") {
      return (
        <AddCard
          size={cardSize}
          iconColor={colors.brand}
          bgColor={colors.secondary}
          onPress={() => {
            if (!ensureDatabaseSelected()) return;
            setAddVisible(true);
          }}
          style={{}} // spacing comes from row gap
        />
      );
    }

    const c = item;
    return (
      <DisplayCard
        size={cardSize}
        variant="tile"
        withBorder
        backgroundColor="#FFFFFF"
        borderColor="#E5E7EB"
        style={{ alignItems: "stretch" }} // let children fill full width
        onPress={() => setSelected(c)}
      >
        <View style={{ flex: 1 }}>
          {/* top-right qty badge */}
          <View style={{ alignSelf: "stretch", alignItems: "flex-end" }}>
            <View style={styles.qtyBadge}>
              <Text style={[styles.qtyBadgeText, { fontSize: cardSize * 0.13 }]}>
                {c.qty_on_hand ?? 0}
              </Text>
            </View>
          </View>

          {/* bottom text block */}
          <View style={[styles.cardBottom, { marginTop: "auto" }]}>
            <Text
              numberOfLines={1}
              style={[styles.modelText, { fontSize: cardSize * 0.13 }]}
            >
              {c.model}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.mfgText, { fontSize: cardSize * 0.08 }]}
            >
              {c.manufacturer || "-"}
            </Text>
          </View>
        </View>
      </DisplayCard>
    );
  };

  // History row
  const renderMove = ({ item: m }) => (
    <View style={styles.historyRow}>
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
  );

  return (
    <View style={commonStyles.contentContainer}>
      <Text style={commonStyles.textPrimary}>Warehouse</Text>

      <View style={styles.searchRow}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search..."
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1 }}
        />
        <Pressable
          onPress={() => {
            if (!ensureDatabaseSelected()) return;
            setShowHistorical((v) => !v);
          }}
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

      {showHistorical ? (
        !loading && (
          <View style={styles.historySection}>
            <FlatList
              data={moves}
              keyExtractor={(item) => item.id}
              renderItem={renderMove}
              style={{ maxHeight: 320 }}
            />
          </View>
        )
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          key={gridKey}
          data={gridData}
          keyExtractor={(item) => item.id}
          renderItem={renderGridItem}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? rowStyle : null}
          contentContainerStyle={numColumns === 1 ? rowStyle : undefined}
          ListEmptyComponent={
            <Text style={{ color: "#888", marginTop: 12 }}>No components yet.</Text>
          }
        />
      )}

      <WarehouseModal
        visible={!!selected}
        item={selected}
        onClose={() => setSelected(null)}
        onAnySave={loadComponents}
      />

      <AddComponentModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onCreated={loadComponents}
      />
    </View>
  );
}
