import React from "react";
import { Platform, TextInput } from "react-native";

export default function PropertyField({
    type = "text",
    value,
    onChange,
    style,
    editable = true,
    readOnly = !editable,
    disabled = !editable,
}) {
    // Simple web style for native <input>; keep your RN style for TextInput.
    const webInputStyle = {
        width: "100%",
        height: 40,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 10,
        background: "#f9f9f9",
    };

    // Web: use native inputs so disabled/readOnly are enforced by the browser
    if (Platform.OS === "web") {
        if (type === "date") {
            return (
                <input
                    type="date"
                    value={value || ""}
                    onChange={(e) => editable && onChange?.(e.target.value)}
                    disabled={disabled}
                    readOnly={readOnly}
                    style={webInputStyle}
                />
            );
        }
        if (type === "number") {
            return (
                <input
                    type="number"
                    value={value ?? ""}
                    onChange={(e) => editable && onChange?.(e.target.value)}
                    disabled={disabled}
                    readOnly={readOnly}
                    style={webInputStyle}
                />
            );
        }
    }

    // RN (and RN Web fallback): TextInput honors `editable`
    return (
        <TextInput
            style={style}
            value={String(value ?? "")}
            onChangeText={(t) => editable && onChange?.(t)}
            placeholder={type === "number" ? "Enter number" : "Enter value"}
            placeholderTextColor="#999"
            keyboardType={type === "number" ? "numeric" : "default"}
            editable={editable}
        />
    );
}
