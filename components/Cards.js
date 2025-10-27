// components/Cards.js
import React, { memo } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/* ----------------------
 * AddCard (keep as-is)
 * ---------------------- */
export function AddCard({
  onPress,
  size,                    // square side
  iconName = "add",
  iconColor = "#4F46E5",
  bgColor = "#2f2f2f",     // your dark add tile bg (override per screen if needed)
  radius = 13,
  padding = 12,
  style,
}) {
  const iconSize = Math.max(18, Math.round(0.5 * size));
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        addStyles.card,
        { width: size, height: size, borderRadius: radius, padding, backgroundColor: bgColor },
        pressed && addStyles.pressed,
        style,
      ]}
    >
      <Ionicons name={iconName} size={iconSize} color={iconColor} />
    </Pressable>
  );
}

const addStyles = StyleSheet.create({
  card: { justifyContent: "center", alignItems: "center" },
  pressed: { opacity: 0.75 },
});

/* ----------------------
 * DisplayCard (SHELL)
 * ---------------------- */
export const DisplayCard = memo(function DisplayCard({
  onPress,
  children,               // <-- you render everything
  size,                   // square side for grid; omit if you’ll control width/height via style
  style,
  variant = "tile",       // "tile" (centered) | "row" (left-aligned row)
  padding = 12,
  radius = 13,
  withBorder = true,
  backgroundColor = "#FFFFFF",
  borderColor = "#E5E7EB",
  elevation = false,      // subtle shadow, optional
}) {
  const base = [
    shell.cardBase,
    variant === "tile" ? shell.tile : shell.row,
    { padding, borderRadius: radius, backgroundColor },
    withBorder && { borderWidth: 1, borderColor },
    elevation && shell.elevated,
    size ? { width: size, height: size } : null,
    style,
  ];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && shell.pressed]}>
      {children}
    </Pressable>
  );
});

const shell = StyleSheet.create({
  cardBase: { alignItems: "center", justifyContent: "center" },
  tile: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 12 },
  elevated: { elevation: 2, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  pressed: { opacity: 0.9 },
});

export default { AddCard, DisplayCard };
