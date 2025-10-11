import React from "react";
import { View, Text, Pressable } from "react-native";

export default function WarehouseItemCard({ item, card, onPress }) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
                width: card.width, height: card.height, borderRadius: 16, padding: 14,
                backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a",
                opacity: pressed ? 0.9 : 1
            })}
        >
            <View style={{ position: "absolute", right: 12, top: 10 }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: "#444" }}>
                    <Text style={{ fontWeight: "800" }}>{item.qty_on_hand ?? 0}</Text>
                </View>
            </View>

            <Text style={{ fontWeight: "800", fontSize: 16 }} numberOfLines={1}>{item.model}</Text>
            <Text numberOfLines={1} style={{ marginTop: 2 }}>{item.manufacturer || "-"}</Text>
            <Text numberOfLines={3} style={{ opacity: 0.8, fontSize: 12, marginTop: 6 }}>{item.description || "-"}</Text>
        </Pressable>
    );
}
