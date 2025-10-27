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
import SearchBar from "../components/SearchBar";
import { AddCard, DisplayCard } from "../components/Cards";

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

  const numColumns = useMemo(() => Math.max(1, Math.floor(width / (cardSize + 16))), [width, cardSize]);
  const listKey = useMemo(() => `assets-cols-${numColumns}`, [numColumns]);

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
        <AddCard
          size={cardSize}
          onPress={() => setIsModalVisible(true)}
          iconColor={colors.brand}
          bgColor={colors.secondary}       
          style={{ margin: 8 }}
        />
      );
    }

    // Asset tiles
    return (
      <DisplayCard
        size={cardSize}
        variant="tile"                      // centered tile
        withBorder
        backgroundColor="#FFFFFF"
        borderColor="#E5E7EB"
        style={{ margin: 8, alignItems: "stretch" }}
        onPress={() => openAssetDetails(item)}
      >
        {/* top small text */}
        <AutoShrinkText
          style={[
            { fontSize: cardSize * 0.10, color: "#6B7280", textAlign: "right" },
            styles.templateText,
          ]}
          initialSize={cardSize * 0.10}
          maxLines={2}
        >
          {item.templateName}
        </AutoShrinkText>
    
        {/* bottom big text */}
        <View style={[{ maxWidth: "100%" }, styles.nameTextWrap]}>
          <AutoShrinkText
            style={[
              { fontSize: cardSize * 0.15, color: "#111827", textAlign: "left" },
              styles.nameText,
            ]}
            initialSize={cardSize * 0.15}
            maxLines={2}
          >
            {item.firstProp}
          </AutoShrinkText>
        </View>
      </DisplayCard>
    );
  };

  return (
    <View style={commonStyles.contentContainer}>
      <Text style={commonStyles.textPrimary}>Assets</Text>

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        iconColor="white"
        placeholder="Search..."
      />

      <FlatList
        key={listKey}
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
