import React from "react";
import { Platform, TextInput } from "react-native";

export default function PropertyField({ type = "text", value, onChange, style }) {
    if (type === "date" && Platform.OS === "web") {
        return (
            <input
                type="date"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                style={{ width: "100%", height: 40, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, background: "#f9f9f9" }}
            />
        );
    }
    return (
        <TextInput
            style={style}
            value={String(value ?? "")}
            onChangeText={onChange}
            placeholder={type === "number" ? "Enter number" : "Enter value"}
            placeholderTextColor="#999"
            keyboardType={type === "number" ? "numeric" : "default"}
        />
    );
}
