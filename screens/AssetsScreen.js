import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  useWindowDimensions,
  TextInput,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAssets } from "../hooks/useAssets";
import AddAssetModal from "./AssetsScreen/AddAssetModal";
import AssetDetailsModal from "./AssetsScreen/AssetDetailsModal";
import styles from "./AssetsScreen/styles";
import { colors, commonStyles } from "../components/Styles";
import AutoShrinkText from "../components/AutoShrinkText";
import { getCardSize } from "../utils/cardLayout";

export default function AssetsScreen() {
  const { width } = useWindowDimensions();

  // Search + modals
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null); // { id, templateId, templateName }

  // Assets hook
  const {
    items: assets,
    loading: loadingAssets,
    load: reloadAssets,
    createAsset,
  } = useAssets();

  const cardSize = getCardSize(width);
  const addIconSize = 0.5 * cardSize;

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        (a.templateName || "").toLowerCase().includes(q) ||
        (a.displayName || "").toLowerCase().includes(q)
    );
  }, [assets, searchQuery]);

  // Build data with a leading "add" tile
  const listData = useMemo(
    () => [{ _type: "add", id: "__add__" }, ...filteredAssets],
    [filteredAssets]
  );

  // Try to estimate columns so the cards look similar to your old wrap layout
  const numColumns = Math.max(1, Math.floor(width / (cardSize + 16)));

  const openAssetDetails = (card) => {
    setSelectedAsset({
      id: card.id,
      templateId: card.templateId,
      templateName: card.templateName,
    });
  };

  const closeDetails = () => setSelectedAsset(null);

  const renderItem = ({ item }) => {
    // Add tile
    if (item._type === "add") {
      return (
        <Pressable
          style={[styles.addCard, { width: cardSize, height: cardSize }]}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons name="add" size={addIconSize} color={colors.brand} />
        </Pressable>
      );
    }

    // Asset tiles
    return (
      <Pressable
        key={item.id}
        style={[styles.displayCard, { width: cardSize, height: cardSize }]}
        onPress={() => openAssetDetails(item)}
      >
        <AutoShrinkText
          style={[styles.templateText, { fontSize: cardSize * 0.1 }]}
          initialSize={cardSize * 0.1}
          maxLines={2}
        >
          {item.templateName}
        </AutoShrinkText>

        <View style={styles.nameTextWrap}>
          <AutoShrinkText
            style={[styles.nameText, { fontSize: cardSize * 0.15 }]}
            initialSize={cardSize * 0.15}
            maxLines={2}
          >
            {item.firstProp}
          </AutoShrinkText>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={commonStyles.contentContainer}>
      <Text style={commonStyles.textPrimary}>Assets</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={"white"} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={"white"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.displayCardContainer : null}
        // If your styles.displayCardContainer uses row spacing/padding, it works well here.
        contentContainerStyle={
          numColumns === 1 ? styles.displayCardContainer : undefined
        }
        ListEmptyComponent={
          !loadingAssets && (
            <Text style={{ color: "#888", marginTop: 12 }}>No assets found.</Text>
          )
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={5}
        removeClippedSubviews
      />

      {/* Add Asset Modal */}
      <AddAssetModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreate={createAsset}
      />

      {/* Asset Details Modal */}
      <AssetDetailsModal
        visible={!!selectedAsset}
        asset={selectedAsset}
        onClose={closeDetails}
        onAnySave={reloadAssets}
      />
    </View>
  );
}
