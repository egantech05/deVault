import React from "react";
import { View, Text, Pressable } from "react-native";
import { commonStyles, colors } from "./styles";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const Header = () => {
    return (
        <View style={localStyles.header}>
            <Pressable style={localStyles.headerLeft} onPress={""} hitSlop={12} >
                <Ionicons name="menu" size={32} color={"white"} />
            </Pressable>
            <Pressable style={localStyles.headerCenter} onPress={""} hitSlop={12}>
                <Text style={commonStyles.textTitle}>deVault</Text>
            </Pressable>
            <Pressable style={localStyles.headerRight} onPress={""} hitSlop={12}>
                 <Ionicons name="person-circle-outline" size={32} color={"white"} />
            </Pressable>
            
        </View>
       
    );
};

export const localStyles = StyleSheet.create({
    header: {
        backgroundColor: "",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        borderColor: "red",
        borderWidth: 1,

    },

    headerLeft: {
        flex: 0.1,
        paddingHorizontal: 32,

    },

    headerCenter: {
        flex: 1,
        alignItems: "center",
    },

    headerRight: {
        flex: 0.1,
        paddingHorizontal: 32,
        
    },
});