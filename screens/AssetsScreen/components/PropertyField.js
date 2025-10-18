import React from "react";
import { Platform, TextInput, StyleSheet } from "react-native";

export default function PropertyField({
    type = "text",
    value,
    onChange,
    style,
    editable = true,
    readOnly = !editable,
    disabled = !editable,
}) {
    const placeholder = type === "number" ? "Enter number" : "Enter value";
    const flattenedStyle = StyleSheet.flatten(style) || {};
    const isEditable = editable && !readOnly && !disabled;

    if (Platform.OS === "web") {
        if (type === "date") {
            const webDateStyle = {
                width: "100%",
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: "#f9f9f9",
                boxSizing: "border-box",
                boxShadow: "none",
                ...flattenedStyle,
            };
            return (
                <input
                    type="date"
                    value={value || ""}
                    onChange={(e) => isEditable && onChange?.(e.target.value)}
                    disabled={!isEditable}
                    readOnly={!isEditable}
                    style={webDateStyle}
                />
            );
        }

        return (
            <TextInput
                style={style}
                value={String(value ?? "")}
                onChangeText={(t) => isEditable && onChange?.(t)}
                placeholder={placeholder}
                placeholderTextColor="#999"
                keyboardType={type === "number" ? "numeric" : "default"}
                editable={isEditable}
                inputMode={type === "number" ? "decimal" : undefined}
            />
        );
    }

    return (
        <TextInput
            style={style}
            value={String(value ?? "")}
            onChangeText={(t) => isEditable && onChange?.(t)}
            placeholder={placeholder}
            placeholderTextColor="#999"
            keyboardType={type === "number" ? "numeric" : "default"}
            editable={isEditable}
        />
    );
}
