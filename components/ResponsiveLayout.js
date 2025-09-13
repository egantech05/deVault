
import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Sidebar from "./Sidebar";
import { Header } from "./Header";
import { colors, commonStyles } from "./styles";
import { Footer } from "./Footer";
import { SafeAreaView } from 'react-native-safe-area-context';

const BREAKPOINT = 900;
const SIDEBAR_WIDTH = 233;

export default function ResponsiveLayout({ children, title = "deVault" }) {
  const { width } = useWindowDimensions();
  const isLarge = width >= BREAKPOINT;



  const [open, setOpen] = useState(isLarge);
  useEffect(() => setOpen(isLarge), [isLarge]);

  return (
    <SafeAreaView style={commonStyles.container}>
      <Header
        title={title}
        showMenuBtn={!isLarge}
        onMenuPress={() => setOpen(true)}
      />

      <View style={styles.mainContent}>
        {isLarge && (
          <View style={styles.sidebarContainer}>
            <Sidebar isLarge onClose={() => {}} />
          </View>
        )}

        <View style={styles.contentArea}>{children}</View>
      </View>

      <Footer />

      {!isLarge && open && (
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

  contentArea:{
    flex:1,
    backgroundColor: colors.background,
  },
});