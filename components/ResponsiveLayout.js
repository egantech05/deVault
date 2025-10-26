// components/ResponsiveLayout.js
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Sidebar from "./Sidebar";
import { Header } from "./Header";
import { colors, commonStyles } from "./Styles";
import { Footer } from "./Footer";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '../contexts/DatabaseContext';

const BREAKPOINT = 900;
const SIDEBAR_WIDTH = 233;

export default function ResponsiveLayout({ children, title = "Ssetra" }) {
  const { width } = useWindowDimensions();
  const isLarge = width >= BREAKPOINT;
  const { activeDatabaseId, loading: dbLoading, openCreateModal } = useDatabase();

  const [open, setOpen] = useState(isLarge);
  useEffect(() => setOpen(isLarge), [isLarge]);

  const hasDatabase = !!activeDatabaseId;

  return (
    <SafeAreaView style={commonStyles.container}>
      <Header
        title={title}
        showMenuBtn={!isLarge}
        onMenuPress={() => setOpen(true)}
      />

      <View style={styles.mainContent}>
        {isLarge && hasDatabase && (
          <View style={styles.sidebarContainer}>
            <Sidebar isLarge onClose={() => { }} />
          </View>
        )}

        <View style={styles.contentArea}>
          {hasDatabase ? (
            // If a database is already active, keep showing content even while refreshing
            children
          ) : dbLoading ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator size="large" color={colors.brand} />
              <Text style={styles.centerText}>Loading databases…</Text>
            </View>
          ) : (
            <View style={styles.centerWrap}>
              <Text style={styles.centerTitle}>Create a database to get started</Text>
              <Text style={styles.centerText}>
                Databases keep your templates, assets, logs, and warehouse items grouped together.
              </Text>
              <Pressable onPress={openCreateModal} style={styles.createBtn}>
                <Text style={styles.createBtnText}>Create Database</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <Footer />

      {!isLarge && open && hasDatabase && (
        <View style={styles.overlayRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <Sidebar isLarge={false} onClose={() => setOpen(false)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    flexDirection: "row",
  },
  sidebarContainer: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.secondary,
  },
  contentArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlayRoot: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  centerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
  centerText: {
    color: "#9ca3af",
    textAlign: "center",
  },
  createBtn: {
    marginTop: 12,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  createBtnText: {
    color: "white",
    fontWeight: "700",
  },
});
