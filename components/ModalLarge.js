// components/ModalLarge.js
import React from "react";
import { Modal, View, ScrollView, StyleSheet, Text } from "react-native";
import { colors } from "./Styles";

export default function ModalLarge({ visible, onRequestClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>{children}</View>
      </View>
    </Modal>
  );
}

ModalLarge.Header = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

ModalLarge.Title = ({ children, style }) => (
  <Text style={[styles.title, style]} numberOfLines={1}>
    {children}
  </Text>
);

ModalLarge.Body = ({
  children,
  style,
  scroll = false,
  contentContainerStyle,
  scrollProps = {},
}) =>
  scroll ? (
    <ScrollView
      style={[styles.body, style]}
      contentContainerStyle={[styles.bodyInner, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, styles.bodyInner, style]}>{children}</View>
  );

ModalLarge.Footer = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    height: "90%",
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    flexShrink: 1,
  },
  body: {
    flexGrow: 1,
    backgroundColor: "white",
  },
  bodyInner: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
});
