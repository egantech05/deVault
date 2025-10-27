import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { colors } from "./Styles";

export default function ModalSmall({
  visible,
  onRequestClose,
  children,
  animationType = "fade",
  containerStyle,
  backdropStyle,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onRequestClose}
    >
      <View style={[styles.backdrop, backdropStyle]}>
        <View style={[styles.container, containerStyle]}>{children}</View>
      </View>
    </Modal>
  );
}

ModalSmall.Title = function ModalSmallTitle({ children, style, ...props }) {
  if (React.isValidElement(children)) {
    return <View style={[styles.titleContainer, style]}>{children}</View>;
  }

  return (
    <Text style={[styles.title, style]} {...props}>
      {children}
    </Text>
  );
};

ModalSmall.Body = function ModalSmallBody({ children, style }) {
  return <View style={[styles.body, style]}>{children}</View>;
};

ModalSmall.Footer = function ModalSmallFooter({ children, style }) {
  return <View style={[styles.footer, style]}>{children}</View>;
};

ModalSmall.Subtitle = function ModalSmallSubtitle({ children, style, ...props }) {
  return (
    <Text style={[styles.subtitle, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  container: {
    width: 420,
    maxWidth: "100%",
    backgroundColor: colors.secondary,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  titleContainer: {
    alignSelf: "stretch",
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 14,
    lineHeight: 18,
  },
  body: {
    gap: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.secondprimary,
    borderWidth: 1,
    borderColor: "white",
  },
  error: {
    color: "#f87171",
    fontSize: 13,
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cancelText: {
    color: "#f3f4f6",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "700",
  },
});

ModalSmall.styles = styles;
