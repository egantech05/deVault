import React from "react";
import { Pressable, Text, View } from "react-native";

export default React.memo(function AssetCard({ item, size, styles, onPress }) {
    return (
        <Pressable
            style={[styles.displayCard, { width: size, height: size }]}
            onPress={() => onPress?.(item)}
        >
            <Text style={[styles.templateText, { fontSize: size * 0.10 }]}>{item.templateName}</Text>
            <View style={styles.nameTextWrap}>
                <Text numberOfLines={2} style={[styles.nameText, { fontSize: size * 0.15 }]}>
                    {item.firstProp}
                </Text>
            </View>
        </Pressable>
    );
});
