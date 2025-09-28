import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
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

  // --- Layout helpers ---
  const getCardSize = () => {
    const availableWidth = width;
    let cardsPerRow = 1;
    if (availableWidth >= 100) cardsPerRow = 2;
    if (availableWidth >= 200) cardsPerRow = 3;
    if (availableWidth >= 600) cardsPerRow = 4;
    if (availableWidth >= 800) cardsPerRow = 5;
    if (availableWidth >= 1000) cardsPerRow = 8;
    const cardSize = width / cardsPerRow + 16;
    return Math.max(cardSize, 60);
  };

  const cardSize = getCardSize();
  const addIconSize = 0.5 * cardSize;

  const filteredAssets = assets.filter((a) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (a.templateName || "").toLowerCase().includes(q) ||
      (a.displayName || "").toLowerCase().includes(q)
    );
  });

  // --- Handlers ---
  const openAssetDetails = (card) => {
    setSelectedAsset({
      id: card.id,
      templateId: card.templateId,
      templateName: card.templateName,
    });
  };


  const closeDetails = () => setSelectedAsset(null);

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

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.displayCardContainer}>
          <Pressable
            style={[styles.addCard, { width: cardSize, height: cardSize }]}
            onPress={() => setIsModalVisible(true)} // <-- fixed: wrap in function
          >
            <Ionicons name="add" size={addIconSize} color={colors.brand} />
          </Pressable>

          {filteredAssets.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.displayCard, { width: cardSize, height: cardSize }]}
              onPress={() => openAssetDetails(item)}
            >
              <Text style={[styles.templateText, { fontSize: cardSize * 0.1 }]}>
                {item.templateName}
              </Text>
              <View style={styles.nameTextWrap}>
                <Text
                  numberOfLines={2}
                  style={[styles.nameText, { fontSize: cardSize * 0.15 }]}
                >
                  {item.firstProp}
                </Text>
              </View>
            </Pressable>
          ))}

          {!loadingAssets && filteredAssets.length === 0 && (
            <Text style={{ color: "#888", marginTop: 12 }}>No assets found.</Text>
          )}
        </View>
      </ScrollView>

      {/* Add Asset Modal */}
      <AddAssetModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreate={createAsset}
      />

      {/* Asset Details Modal (owns all details/logs/docs logic) */}
      <AssetDetailsModal
        visible={!!selectedAsset}
        asset={selectedAsset}
        onClose={closeDetails}
        onAnySave={reloadAssets}
      />
    </View>
  );
}
