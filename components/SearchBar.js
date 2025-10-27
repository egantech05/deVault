import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ICON_SIZE = 18;

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  iconColor = "white",
  placeholderTextColor,
  style,
  inputStyle,
  ...textInputProps
}) {
  const effectivePlaceholderColor =
    placeholderTextColor === undefined ? iconColor : placeholderTextColor;

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search" size={ICON_SIZE} color={iconColor} />
      <TextInput
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={effectivePlaceholderColor}
        value={value}
        onChangeText={onChangeText}
        {...textInputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderColor: "white",
    borderBottomWidth: 3,
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    
  },
  input: {
    color: "white",
    marginLeft: 16,
    flex: 1,
    fontSize:24,
  },
});
