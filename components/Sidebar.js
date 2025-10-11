// components/Sidebar.js
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, commonStyles } from "./Styles";
import { Ionicons } from '@expo/vector-icons';

const SIDEBAR_WIDTH = 233;

export default function Sidebar({ isLarge, onClose }) {
  const navigation = useNavigation();
  if (isLarge) {
    return (
      <View style={styles.sidebarFixed}>
        <Pressable onPress={() => navigation.navigate("Assets")} style={styles.navigationButton}>
          <Ionicons name="albums-outline" size={24} color={"white"} style={styles.iconStyle} />
          <Text style={styles.navigationText}>Assets</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("AssetTemplates")} style={styles.navigationButton}>
          <Ionicons name="document-outline" size={24} color={"white"} />
          <Text style={styles.navigationText}>Asset Templates</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("LogTemplates")} style={styles.navigationButton}>
          <Ionicons name="document-text-outline" size={24} color={"white"} />
          <Text style={styles.navigationText}>Log Templates</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Warehouse")} style={styles.navigationButton}>
          <Ionicons name="settings-outline" size={24} color={"white"} />
          <Text style={styles.navigationText}>Warehouse</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("LinkedDocs")} style={styles.navigationButton}>
          <Ionicons name="link-outline" size={24} color={"white"} />
          <Text style={styles.navigationText}>Linked Documents</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("AssetTemplates")} style={styles.navigationButton}>
          <Ionicons name="notifications-outline" size={24} color={"white"} />
          <Text style={styles.navigationText}>Schedule</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.sidebarOverlay}>
      <Pressable onPress={() => navigation.navigate("AssetTemplates")} style={styles.navigationButton}>
        <Ionicons name="albums-outline" size={24} color={"white"} />
        <Text style={styles.navigationText}>Assets</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate("AssetTemplates")} style={styles.navigationButton}>
        <Ionicons name="document-outline" size={24} color={"white"} />
        <Text style={styles.navigationText}>Asset Templates</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("AssetTemplates")} style={styles.navigationButton}>
        <Ionicons name="document-text-outline" size={24} color={"white"} />
        <Text style={styles.navigationText}>Log Templates</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("WarehouseTemplates")} style={styles.navigationButton}>
        <Ionicons name="settings-outline" size={24} color={"white"} />
        <Text style={styles.navigationText}>Warehouse</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("LinkedDocs")} style={styles.navigationButton}>
        <Ionicons name="link-outline" size={24} color={"white"} />
        <Text style={styles.navigationText}>Linked Documents</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("AssetTemplates")} style={styles.navigationButton}>
        <Ionicons name="notifications-outline" size={24} color={"white"} />
        <Text style={styles.navigationText}>Schedule</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({

  sidebarFixed: {
    width: SIDEBAR_WIDTH,
    height: "100%",
    backgroundColor: colors.secondary,

  },

  sidebarOverlay: {
    position: "absolute",
    left: 0, top: 48, bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.secondary,
    zIndex: 1001,
    elevation: 6,

  },
  sidebarClose: { position: "absolute", right: 12, top: 12, padding: 6 },

  navigationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  navigationText: {
    color: "white",
    fontSize: 12,
    flex: 1,
    padding: 16,
  },

  iconStyle: {
    color: "white",
    size: 24,
  },
});
