// screens/WarehouseModal/InfoTab.js
import React, { useMemo } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { colors } from "../../components/Styles";

export default function InfoTab({ item, onDelete }) {
    const qtyOnHand = useMemo(() => item?.qty_on_hand ?? 0, [item?.qty_on_hand]);
    const minStock = useMemo(() => item?.min_stock ?? 0, [item?.min_stock]);
    const isLow = qtyOnHand < minStock;

    return (
        <View style={s.container}>
            {/* Header row: qty chip on the right */}
            <View style={s.headerRow}>
                <View style={s.qtyChip}>
                    <Text style={[s.qtyChipText, isLow && s.qtyChipTextLow]}>
                        {qtyOnHand}
                    </Text>
                </View>
            </View>

            {/* Model */}
            <View style={s.inputGroup}>
                <Text style={s.label}>Model</Text>
                <TextInput
                    style={[s.input, s.readonlyInput]}
                    value={String(item?.model ?? "-")}
                    editable={false}
                />
            </View>

            {/* Manufacturer */}
            <View style={s.inputGroup}>
                <Text style={s.label}>Manufacturer</Text>
                <TextInput
                    style={[s.input, s.readonlyInput]}
                    value={String(item?.manufacturer ?? "-")}
                    editable={false}
                />
            </View>

            {/* Description */}
            <View style={s.inputGroup}>
                <Text style={s.label}>Description</Text>
                <TextInput
                    style={[s.input, s.readonlyInput, { minHeight: 84 }]}
                    value={String(item?.description ?? "-")}
                    multiline
                    editable={false}
                />
            </View>

            {/* Minimum stock + status */}
            <View style={s.inputGroup}>
                <Text style={s.label}>Minimum Stock</Text>
                <TextInput
                    style={[s.input, s.readonlyInput]}
                    value={String(minStock)}
                    editable={false}
                />
                <Text style={[s.helperText, isLow && s.helperTextLow]}>
                    {isLow
                        ? `Low stock: ${qtyOnHand} < ${minStock}`
                        : "Stock is at or above the minimum."}
                </Text>
            </View>

            {/* Delete button (full width, dashed red) */}
            <View style={s.inputGroup}>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => onDelete?.(item)}
                    style={({ pressed }) => [
                        s.deleteBtn,
                        pressed && { opacity: 0.85 },
                    ]}
                >
                    <Text style={s.deleteText}>Delete</Text>
                </Pressable>
            </View>
        </View>
    );
}

const RED = "#B00020";

const s = StyleSheet.create({
    container: { paddingBottom: 4 },

    // Header
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginBottom: 12,
    },
    titleText: { fontWeight: "800", fontSize: 18, color: colors.primary },
    qtyChip: {
        borderWidth: 1,
        borderColor: "#e9ecef",
        backgroundColor: "white",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    qtyChipText: { fontWeight: "800", color: "#111", fontSize: 24 },
    qtyChipTextLow: { color: RED },

    // Form look & feel
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 16, color: colors.primary, marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#f9f9f9",
    },
    readonlyInput: { opacity: 0.9 },
    helperText: { marginTop: 6, color: "#888" },
    helperTextLow: { color: RED },

    // Delete button (matches input width)
    deleteBtn: {
        alignSelf: "stretch",        // full width like the input
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: RED,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    deleteText: {
        color: RED,
        fontWeight: "700",
        fontSize: 16,
    },
});
