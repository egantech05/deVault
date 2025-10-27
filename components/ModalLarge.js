// components/ModalLarge.js
import React from "react";
import { Modal, View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./Styles";

export default function ModalLarge({
  visible,
  onRequestClose,
  title,
  children,
  headerStyle,
  titleStyle,
  hideCloseButton = false,
  headerRight,
  closeIconColor = "white",
  closeIconSize = 24,
  closeAccessibilityLabel = "Close modal",
  closeHitSlop = 8,
}) {
  const hasTitleContent =
    React.isValidElement(title) ||
    (typeof title === "string" && title.trim().length > 0) ||
    typeof title === "number";

  const headerRightContent =
    typeof headerRight === "function" ? headerRight({ onRequestClose }) : headerRight;

  const shouldRenderHeader = hasTitleContent || !hideCloseButton || !!headerRightContent;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {shouldRenderHeader ? (
            <View style={[styles.header, headerStyle]}>
              {hasTitleContent ? (
                React.isValidElement(title) ? (
                  <View style={styles.titleContainer}>{title}</View>
                ) : (
                  <Text style={[styles.title, titleStyle]} numberOfLines={1}>
                    {title}
                  </Text>
                )
              ) : (
                <View style={styles.titlePlaceholder} />
              )}

              {!hideCloseButton || !!headerRightContent ? (
                <View style={styles.headerActions}>
                  {headerRightContent}
                  {!hideCloseButton ? (
                    <Pressable
                      onPress={onRequestClose}
                      hitSlop={closeHitSlop}
                      accessibilityLabel={closeAccessibilityLabel}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={closeIconSize} color={closeIconColor} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {children}
        </View>
      </View>
    </Modal>
  );
}

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
    backgroundColor: "rgba(25, 25, 26, 0.85)",
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
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    flexShrink: 1,
  },
  titleContainer: {
    flex: 1,
  },
  titlePlaceholder: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  body: {
    flexGrow: 1,
    flexShrink: 1,
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
    flexShrink: 0,
  },
});
