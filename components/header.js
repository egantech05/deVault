// components/header.js
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles, colors } from "./Styles";

export const Header = ({ showMenuBtn, onMenuPress, title = "deVault" }) => {
  return (
    <View style={styles.header}>
      {showMenuBtn ? (
        <Pressable onPress={onMenuPress} hitSlop={12} style={{ paddingHorizontal: 16 }}>
          <Ionicons name="menu" size={32} color="white" />
        </Pressable>
      ) : (
        <View style={{ width: 32 }} />
      )}

      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={commonStyles.textTitle}>{title}</Text>
      </View>

      <Pressable hitSlop={12} style={{ paddingHorizontal: 16 }} onPress={() => { /* profile action */ }}>
        <Ionicons name="person-circle-outline" size={32} color="white" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
