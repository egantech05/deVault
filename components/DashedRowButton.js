import React from "react";
import { Pressable, Text, View, Platform } from "react-native";
import { colors } from "./Styles";

export default function DashedRowButton({ label = "Add", onPress, style }) {
    return (
        <Pressable
            onPress={onPress}
            // web can sometimes ignore onPress; add onClick explicitly
            {...(Platform.OS === "web" ? { onClick: onPress } : {})}
            style={[
                {
                    borderWidth: 2,
                    borderStyle: "dashed",
                    borderColor: colors.textPrimary || "#ccc",
                    borderRadius: 12,
                    padding: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    marginVertical: 8,
                    width: "100%",
                    backgroundColor: "transparent",
                    pointerEvents: "auto",
                    cursor: "pointer",
                },
                style,
            ]}
            accessibilityRole="button"
        >
            <View>
                <Text style={{ fontWeight: "600", color: colors.textPrimary || "#ccc" }}>
                    {label}
                </Text>
            </View>
        </Pressable>
    );
}
