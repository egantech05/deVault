import React from "react";
import { View, Text, Pressable } from "react-native";
import { commonStyles, colors } from "./styles";
import { StyleSheet } from "react-native";


export const Footer = () => {
    return (
        <View style={localStyles.footer}>
            <Text style={commonStyles.textFooter}>powered by: egantech</Text>
            
        </View>
       
    );
};

export const localStyles = StyleSheet.create({
    footer: {
        backgroundColor: "",
        justifyContent:"center",
        alignItems: "center",
        paddingVertical: 16,
        borderColor: "red",
        borderWidth: 1,

    },


});